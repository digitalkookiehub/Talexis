import logging
import random
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.interview import Interview
from app.models.interview_question import InterviewQuestion
from app.models.interview_answer import InterviewAnswer
from app.models.interview_attempt import InterviewAttempt
from app.models.student import StudentProfile
from app.models.enums import InterviewType, DifficultyLevel, InterviewStatus
from app.exceptions import NotFoundError, ForbiddenError, ValidationError
from app.services.llm.local_llm import local_llm
from app.services.llm.prompts import QUESTION_GENERATION_PROMPT, QUESTION_GENERATION_SYSTEM

# Topic pools for randomization per interview type
TOPIC_POOLS: dict[str, list[str]] = {
    "hr": ["teamwork", "conflict resolution", "leadership", "time management", "motivation", "career goals", "strengths and weaknesses", "work culture", "adaptability", "communication"],
    "technical": ["data structures", "algorithms", "system design", "databases", "API design", "testing", "debugging", "concurrency", "security", "performance optimization"],
    "behavioral": ["failure experience", "achievement", "difficult decision", "working under pressure", "initiative", "feedback handling", "collaboration", "ethical dilemma", "creativity", "problem solving"],
    "sales": ["persuasion", "negotiation", "customer objections", "pipeline management", "closing techniques", "relationship building", "product knowledge", "cold calling", "market analysis", "target achievement"],
}

logger = logging.getLogger(__name__)


def check_attempt_limit(db: Session, student_id: int, interview_type: InterviewType) -> None:
    attempt = (
        db.query(InterviewAttempt)
        .filter(
            InterviewAttempt.student_id == student_id,
            InterviewAttempt.interview_type == interview_type,
        )
        .first()
    )
    if attempt and attempt.attempt_number >= attempt.max_attempts:
        raise ValidationError(
            f"Maximum attempts ({attempt.max_attempts}) reached for {interview_type.value} interviews"
        )


def increment_attempt(db: Session, student_id: int, interview_type: InterviewType) -> None:
    attempt = (
        db.query(InterviewAttempt)
        .filter(
            InterviewAttempt.student_id == student_id,
            InterviewAttempt.interview_type == interview_type,
        )
        .first()
    )
    if attempt:
        attempt.attempt_number += 1
    else:
        attempt = InterviewAttempt(
            student_id=student_id,
            interview_type=interview_type,
            attempt_number=1,
        )
        db.add(attempt)
    db.commit()


def start_interview(
    db: Session,
    student: StudentProfile,
    interview_type: InterviewType,
    difficulty: DifficultyLevel,
    target_questions: int = 5,
) -> Interview:
    check_attempt_limit(db, student.id, interview_type)
    increment_attempt(db, student.id, interview_type)

    # Clamp to allowed values
    if target_questions not in (3, 5, 10):
        target_questions = 5

    interview = Interview(
        student_id=student.id,
        interview_type=interview_type,
        difficulty_level=difficulty,
        status=InterviewStatus.in_progress,
        started_at=datetime.now(timezone.utc),
        target_questions=target_questions,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    logger.info("Interview %s started for student %s (%d questions)", interview.id, student.id, target_questions)
    return interview


def get_interview(db: Session, interview_id: int, student_id: int) -> Interview:
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.student_id == student_id)
        .first()
    )
    if not interview:
        raise NotFoundError("Interview")
    return interview


async def generate_question(db: Session, interview: Interview) -> InterviewQuestion:
    if interview.status != InterviewStatus.in_progress:
        raise ValidationError("Interview is not in progress")

    existing_questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview.id)
        .order_by(InterviewQuestion.order_index)
        .all()
    )

    previous_texts = [q.question_text for q in existing_questions]
    profile_summary = "Student profile"
    if interview.student and interview.student.parsed_resume:
        summary = interview.student.parsed_resume.get("summary", "")
        if summary:
            profile_summary = str(summary)

    # Randomize: pick a random topic focus to vary questions
    topics = TOPIC_POOLS.get(interview.interview_type.value, [])
    used_topics = [q.expected_topics for q in existing_questions if q.expected_topics]
    used_flat = [t for sublist in used_topics for t in sublist] if used_topics else []
    available = [t for t in topics if t not in used_flat]
    if not available:
        available = topics
    random_topic = random.choice(available) if available else ""

    prompt = QUESTION_GENERATION_PROMPT.format(
        interview_type=interview.interview_type.value,
        difficulty_level=interview.difficulty_level.value,
        profile_summary=profile_summary[:500],
        previous_questions="\n".join(previous_texts) if previous_texts else "None",
    )
    if random_topic:
        prompt += f"\n\nFocus this question on the topic: {random_topic}"

    try:
        question_text = await local_llm.generate(prompt, system=QUESTION_GENERATION_SYSTEM)
        question_text = question_text.strip().strip('"')
    except Exception as e:
        logger.error("Question generation failed: %s", str(e))
        question_text = f"Tell me about your experience with {interview.interview_type.value} skills."

    question = InterviewQuestion(
        interview_id=interview.id,
        question_text=question_text,
        question_type=interview.interview_type.value,
        difficulty=interview.difficulty_level.value,
        order_index=len(existing_questions),
        expected_topics=[random_topic] if random_topic else [],
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def submit_answer(
    db: Session, interview: Interview, question_id: int, answer_text: str
) -> InterviewAnswer:
    if interview.status != InterviewStatus.in_progress:
        raise ValidationError("Interview is not in progress")

    question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.id == question_id,
            InterviewQuestion.interview_id == interview.id,
        )
        .first()
    )
    if not question:
        raise NotFoundError("Question")

    answer = InterviewAnswer(
        question_id=question_id,
        interview_id=interview.id,
        answer_text=answer_text,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


async def complete_interview(db: Session, interview: Interview) -> Interview:
    """Mark interview complete and automatically run evaluation."""
    if interview.status != InterviewStatus.in_progress:
        raise ValidationError("Interview is not in progress")
    interview.status = InterviewStatus.completed
    interview.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interview)
    logger.info("Interview %s completed, triggering auto-evaluation", interview.id)

    # Auto-evaluate
    try:
        from app.services.evaluation_service import evaluate_interview
        await evaluate_interview(db, interview)
        db.refresh(interview)
    except Exception as e:
        logger.error("Auto-evaluation failed for interview %s: %s", interview.id, repr(e))
        # Don't block the completion — student can re-trigger from results page

    return interview


def get_interview_history(db: Session, student_id: int, skip: int = 0, limit: int = 20) -> tuple[list[Interview], int]:
    query = db.query(Interview).filter(Interview.student_id == student_id)
    total = query.count()
    interviews = query.order_by(Interview.created_at.desc()).offset(skip).limit(limit).all()
    return interviews, total


def get_active_interview(db: Session, student_id: int) -> Interview | None:
    """Find any in-progress interview for the student."""
    return (
        db.query(Interview)
        .filter(
            Interview.student_id == student_id,
            Interview.status == InterviewStatus.in_progress,
        )
        .order_by(Interview.created_at.desc())
        .first()
    )
