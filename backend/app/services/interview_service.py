import logging
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
    db: Session, student: StudentProfile, interview_type: InterviewType, difficulty: DifficultyLevel
) -> Interview:
    check_attempt_limit(db, student.id, interview_type)
    increment_attempt(db, student.id, interview_type)

    interview = Interview(
        student_id=student.id,
        interview_type=interview_type,
        difficulty_level=difficulty,
        status=InterviewStatus.in_progress,
        started_at=datetime.now(timezone.utc),
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    logger.info("Interview %s started for student %s", interview.id, student.id)
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
    profile_summary = "Student profile"  # Simplified for MVP
    if interview.student and interview.student.parsed_resume:
        summary = interview.student.parsed_resume.get("summary", "")
        if summary:
            profile_summary = str(summary)

    prompt = QUESTION_GENERATION_PROMPT.format(
        interview_type=interview.interview_type.value,
        difficulty_level=interview.difficulty_level.value,
        profile_summary=profile_summary[:500],
        previous_questions="\n".join(previous_texts) if previous_texts else "None",
    )

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


def complete_interview(db: Session, interview: Interview) -> Interview:
    if interview.status != InterviewStatus.in_progress:
        raise ValidationError("Interview is not in progress")
    interview.status = InterviewStatus.completed
    interview.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(interview)
    logger.info("Interview %s completed", interview.id)
    return interview


def get_interview_history(db: Session, student_id: int, skip: int = 0, limit: int = 20) -> tuple[list[Interview], int]:
    query = db.query(Interview).filter(Interview.student_id == student_id)
    total = query.count()
    interviews = query.order_by(Interview.created_at.desc()).offset(skip).limit(limit).all()
    return interviews, total
