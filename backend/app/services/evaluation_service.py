import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.interview import Interview
from app.models.interview_answer import InterviewAnswer
from app.models.interview_question import InterviewQuestion
from app.models.evaluation import AnswerEvaluation
from app.models.evaluation_run import EvaluationRun
from app.models.enums import InterviewStatus
from app.exceptions import NotFoundError, ValidationError
from app.services.llm.cloud_llm import cloud_llm
from app.services.llm.local_llm import local_llm
from app.services.llm.prompts import ANSWER_EVALUATION_PROMPT, ANSWER_EVALUATION_SYSTEM

logger = logging.getLogger(__name__)


_DEFAULT_RESULT = {
    "communication_score": 5.0,
    "technical_score": 5.0,
    "confidence_score": 5.0,
    "structure_score": 5.0,
    "overall_score": 5.0,
    "feedback": "Evaluation completed with default scoring.",
    "strengths": [],
    "weaknesses": [],
    "improved_answer": "",
    "risk_flags": [],
}


async def _evaluate_answer(prompt: str) -> dict:
    """Evaluate using local LLM first, fall back to OpenAI if configured."""
    # Try local LLM (Ollama) first
    try:
        ollama_prompt = f"{ANSWER_EVALUATION_SYSTEM}\n\n{prompt}\n\nRespond ONLY with valid JSON, no other text."
        raw = await local_llm.generate(ollama_prompt, timeout=300.0)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(raw[start:end])
            logger.info("Evaluation completed via local LLM")
            return result
        raise ValueError("No JSON found in local LLM response")
    except Exception as local_err:
        logger.warning("Local LLM evaluation failed: %s — trying OpenAI fallback", repr(local_err))

        # Fall back to OpenAI if configured
        if settings.OPENAI_API_KEY:
            try:
                result = await cloud_llm.evaluate(prompt, system=ANSWER_EVALUATION_SYSTEM)
                logger.info("Evaluation completed via OpenAI fallback")
                return result
            except Exception as cloud_err:
                logger.error("OpenAI fallback also failed: %s", repr(cloud_err))

        # Both failed: return defaults so the interview still completes
        return {**_DEFAULT_RESULT, "feedback": "Evaluation unavailable — both local and cloud LLMs failed."}


async def evaluate_interview(db: Session, interview: Interview) -> list[AnswerEvaluation]:
    if interview.status not in (InterviewStatus.completed, InterviewStatus.evaluated):
        raise ValidationError("Interview must be completed before evaluation")

    answers = (
        db.query(InterviewAnswer)
        .filter(InterviewAnswer.interview_id == interview.id)
        .all()
    )
    if not answers:
        raise ValidationError("No answers to evaluate")

    evaluations = []
    total_score = 0.0

    for answer in answers:
        question = db.query(InterviewQuestion).filter(
            InterviewQuestion.id == answer.question_id
        ).first()
        if not question:
            continue

        prompt = ANSWER_EVALUATION_PROMPT.format(
            question_text=question.question_text,
            answer_text=answer.answer_text,
            expected_topics=", ".join(question.expected_topics) if question.expected_topics else "general",
            interview_type=interview.interview_type.value,
        )

        try:
            result = await _evaluate_answer(prompt)
        except Exception as e:
            logger.error("Evaluation failed for answer %s: %s", answer.id, str(e))
            result = {
                "communication_score": 5.0,
                "technical_score": 5.0,
                "confidence_score": 5.0,
                "structure_score": 5.0,
                "overall_score": 5.0,
                "feedback": "Evaluation temporarily unavailable.",
                "strengths": [],
                "weaknesses": [],
                "improved_answer": "",
                "risk_flags": [],
            }

        # Remove existing evaluation for this answer if re-evaluating
        existing = db.query(AnswerEvaluation).filter(
            AnswerEvaluation.answer_id == answer.id
        ).first()
        if existing:
            db.delete(existing)

        evaluation = AnswerEvaluation(
            answer_id=answer.id,
            interview_id=interview.id,
            communication_score=float(result.get("communication_score", 5)),
            technical_score=float(result.get("technical_score", 5)),
            confidence_score=float(result.get("confidence_score", 5)),
            structure_score=float(result.get("structure_score", 5)),
            overall_score=float(result.get("overall_score", 5)),
            feedback_text=result.get("feedback", ""),
            risk_flags=result.get("risk_flags", []),
            strengths=result.get("strengths", []),
            weaknesses=result.get("weaknesses", []),
            improved_answer_suggestion=result.get("improved_answer", ""),
            evaluated_at=datetime.now(timezone.utc),
        )
        db.add(evaluation)
        evaluations.append(evaluation)
        total_score += evaluation.overall_score

    # Update interview
    interview.status = InterviewStatus.evaluated
    if evaluations:
        interview.total_score = total_score / len(evaluations)

    # Record evaluation run
    run_count = db.query(EvaluationRun).filter(
        EvaluationRun.interview_id == interview.id
    ).count()
    run = EvaluationRun(
        interview_id=interview.id,
        run_number=run_count + 1,
        evaluated_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.commit()

    for ev in evaluations:
        db.refresh(ev)

    # Run anti-cheat checks automatically after evaluation
    try:
        from app.services.anticheat_service import run_full_anticheat
        ac_result = run_full_anticheat(db, interview.id)
        if ac_result["total_flags"] > 0:
            logger.warning(
                "Anti-cheat flags for interview %s: %d flags", interview.id, ac_result["total_flags"]
            )
    except Exception as e:
        logger.error("Anti-cheat check failed: %s", str(e))

    logger.info("Interview %s evaluated: avg_score=%.1f", interview.id, interview.total_score or 0)
    return evaluations


def get_evaluations(db: Session, interview_id: int) -> list[AnswerEvaluation]:
    return (
        db.query(AnswerEvaluation)
        .filter(AnswerEvaluation.interview_id == interview_id)
        .all()
    )


def get_scorecard(db: Session, interview: Interview) -> dict:
    evaluations = get_evaluations(db, interview.id)
    if not evaluations:
        return {
            "interview_id": interview.id,
            "interview_type": interview.interview_type.value,
            "difficulty": interview.difficulty_level.value,
            "total_score": interview.total_score,
            "evaluations": [],
            "avg_communication": 0,
            "avg_technical": 0,
            "avg_confidence": 0,
            "avg_structure": 0,
        }

    n = len(evaluations)
    return {
        "interview_id": interview.id,
        "interview_type": interview.interview_type.value,
        "difficulty": interview.difficulty_level.value,
        "total_score": interview.total_score,
        "evaluations": evaluations,
        "avg_communication": sum(e.communication_score for e in evaluations) / n,
        "avg_technical": sum(e.technical_score for e in evaluations) / n,
        "avg_confidence": sum(e.confidence_score for e in evaluations) / n,
        "avg_structure": sum(e.structure_score for e in evaluations) / n,
    }
