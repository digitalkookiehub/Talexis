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
from app.services.llm.prompts import (
    ANSWER_EVALUATION_PROMPT, ANSWER_EVALUATION_SYSTEM,
    INTERVIEW_SUMMARY_PROMPT, INTERVIEW_SUMMARY_SYSTEM,
)

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


async def _generate_summary(prompt: str) -> dict:
    """Generate interview summary using local LLM first, fall back to OpenAI."""
    try:
        ollama_prompt = f"{INTERVIEW_SUMMARY_SYSTEM}\n\n{prompt}\n\nRespond ONLY with valid JSON, no other text."
        raw = await local_llm.generate(ollama_prompt, timeout=300.0)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(raw[start:end])
            logger.info("Summary generated via local LLM")
            return result
        raise ValueError("No JSON found in local LLM response")
    except Exception as local_err:
        logger.warning("Local LLM summary failed: %s — trying OpenAI fallback", repr(local_err))

        if settings.OPENAI_API_KEY:
            try:
                result = await cloud_llm.evaluate(prompt, system=INTERVIEW_SUMMARY_SYSTEM)
                logger.info("Summary generated via OpenAI fallback")
                return result
            except Exception as cloud_err:
                logger.error("OpenAI summary fallback also failed: %s", repr(cloud_err))

        return {
            "summary": "Interview completed. Summary generation unavailable.",
            "feedback": "Please review individual answer feedback for detailed insights.",
        }


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
    qa_pairs_text = []

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
            # Track token usage per question
            try:
                from app.services.tracking_service import log_token_usage
                from app.services.llm.cloud_llm import get_last_usage
                usage = get_last_usage()
                if usage.get("total_tokens", 0) > 0:
                    log_token_usage(
                        db, user_id=interview.student_id, action="evaluation",
                        provider="openai", model=settings.OPENAI_MODEL,
                        prompt_tokens=usage["prompt_tokens"], completion_tokens=usage["completion_tokens"],
                        interview_id=interview.id, question_id=question.id,
                    )
            except Exception:
                pass
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

        # Collect Q&A for summary generation
        qa_pairs_text.append(
            f"Q{len(qa_pairs_text) + 1}: {question.question_text}\n"
            f"A{len(qa_pairs_text) + 1}: {answer.answer_text[:500]}\n"
            f"Score: {evaluation.overall_score}/10"
        )

    # Update interview scores
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

    # Generate overall summary
    try:
        n = len(evaluations)
        summary_prompt = INTERVIEW_SUMMARY_PROMPT.format(
            interview_type=interview.interview_type.value,
            difficulty_level=interview.difficulty_level.value,
            target_role=interview.target_role or "Not specified",
            target_industry=interview.target_industry or "Not specified",
            total_score=f"{interview.total_score:.1f}" if interview.total_score else "N/A",
            duration_seconds=interview.duration_seconds or 0,
            questions_answered=interview.questions_answered or len(answers),
            avg_communication=f"{sum(e.communication_score for e in evaluations) / n:.1f}" if n else "0",
            avg_technical=f"{sum(e.technical_score for e in evaluations) / n:.1f}" if n else "0",
            avg_confidence=f"{sum(e.confidence_score for e in evaluations) / n:.1f}" if n else "0",
            avg_structure=f"{sum(e.structure_score for e in evaluations) / n:.1f}" if n else "0",
            qa_pairs="\n\n".join(qa_pairs_text),
        )
        summary_result = await _generate_summary(summary_prompt)
        interview.overall_summary = summary_result.get("summary", "")
        interview.overall_feedback = summary_result.get("feedback", "")
        # Track summary token usage
        try:
            from app.services.tracking_service import log_token_usage
            from app.services.llm.cloud_llm import get_last_usage
            usage = get_last_usage()
            if usage.get("total_tokens", 0) > 0:
                log_token_usage(
                    db, user_id=interview.student_id, action="summary",
                    provider="openai", model=settings.OPENAI_MODEL,
                    prompt_tokens=usage["prompt_tokens"], completion_tokens=usage["completion_tokens"],
                    interview_id=interview.id,
                )
        except Exception:
            pass
        db.commit()
        logger.info("Overall summary generated for interview %s", interview.id)
    except Exception as e:
        logger.error("Summary generation failed for interview %s: %s", interview.id, repr(e))

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

    # Auto-recalculate readiness and sync talent profile
    try:
        from app.services.readiness_service import calculate_readiness
        calculate_readiness(db, interview.student_id)
        logger.info("Readiness auto-recalculated for student %s", interview.student_id)
    except Exception as e:
        logger.error("Auto-readiness calculation failed: %s", str(e))

    try:
        from app.services.talent_service import sync_talent_scores
        sync_talent_scores(db, interview.student_id)
        logger.info("Talent scores synced for student %s", interview.student_id)
    except Exception as e:
        logger.error("Talent score sync failed: %s", str(e))

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
            "target_role": interview.target_role,
            "target_industry": interview.target_industry,
            "duration_seconds": interview.duration_seconds,
            "questions_answered": interview.questions_answered,
            "overall_summary": interview.overall_summary,
            "overall_feedback": interview.overall_feedback,
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
        "target_role": interview.target_role,
        "target_industry": interview.target_industry,
        "duration_seconds": interview.duration_seconds,
        "questions_answered": interview.questions_answered,
        "overall_summary": interview.overall_summary,
        "overall_feedback": interview.overall_feedback,
        "evaluations": evaluations,
        "avg_communication": sum(e.communication_score for e in evaluations) / n,
        "avg_technical": sum(e.technical_score for e in evaluations) / n,
        "avg_confidence": sum(e.confidence_score for e in evaluations) / n,
        "avg_structure": sum(e.structure_score for e in evaluations) / n,
    }
