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
    "technical": ["data structures", "algorithms", "system design", "databases", "API design", "testing", "debugging", "concurrency", "security", "performance optimization",
                  "domain expertise", "problem solving methodology", "quality assurance", "process improvement", "industry standards"],
    "behavioral": ["failure experience", "achievement", "difficult decision", "working under pressure", "initiative", "feedback handling", "collaboration", "ethical dilemma", "creativity", "problem solving"],
    "sales": ["persuasion", "negotiation", "customer objections", "pipeline management", "closing techniques", "relationship building", "product knowledge", "cold calling", "market analysis", "target achievement"],
}

# Industry-specific topic pools — used when target_industry is set
INDUSTRY_TOPIC_POOLS: dict[str, list[str]] = {
    "healthcare": ["patient care", "medical terminology", "clinical procedures", "health regulations", "patient safety", "medical records", "emergency response", "infection control", "care planning", "medical ethics"],
    "education": ["curriculum design", "classroom management", "student assessment", "learning methodologies", "special education", "parent engagement", "educational technology", "lesson planning", "child development", "pedagogy"],
    "finance": ["financial analysis", "risk management", "regulatory compliance", "portfolio management", "financial modeling", "auditing", "tax planning", "investment strategies", "banking operations", "financial reporting"],
    "hospitality": ["guest experience", "food safety", "event management", "front desk operations", "housekeeping standards", "revenue management", "complaint handling", "menu planning", "hotel management", "tourism"],
    "manufacturing": ["quality control", "lean manufacturing", "supply chain", "production planning", "safety protocols", "inventory management", "process optimization", "equipment maintenance", "six sigma", "logistics"],
    "retail": ["visual merchandising", "inventory management", "customer service", "point of sale", "store operations", "loss prevention", "product knowledge", "sales targets", "customer loyalty", "supply chain"],
    "legal": ["contract law", "legal research", "compliance", "litigation", "corporate governance", "intellectual property", "dispute resolution", "legal writing", "regulatory affairs", "due diligence"],
    "marketing": ["brand strategy", "digital marketing", "content creation", "market research", "campaign management", "social media", "SEO/SEM", "analytics", "customer segmentation", "advertising"],
    "construction": ["project management", "site safety", "building codes", "cost estimation", "contract management", "material procurement", "structural design", "quality inspection", "scheduling", "sustainability"],
    "agriculture": ["crop management", "soil science", "irrigation", "pest control", "farm machinery", "harvest planning", "agribusiness", "food processing", "organic farming", "sustainability"],
}

logger = logging.getLogger(__name__)


# Attempt limits by difficulty
ATTEMPT_LIMITS: dict[str, int] = {
    "basic": 0,          # 0 = unlimited
    "intermediate": 10,
    "advanced": 5,
}

# Progressive unlock thresholds
UNLOCK_THRESHOLDS: dict[str, dict] = {
    "intermediate": {"requires": "basic", "min_score": 5.0},
    "advanced": {"requires": "intermediate", "min_score": 6.0},
}


def check_attempt_limit(
    db: Session, student_id: int, interview_type: InterviewType, difficulty: DifficultyLevel | None = None
) -> None:
    diff = difficulty.value if difficulty else "basic"
    max_attempts = ATTEMPT_LIMITS.get(diff, 5)

    # Unlimited for basic
    if max_attempts == 0:
        return

    attempt = (
        db.query(InterviewAttempt)
        .filter(
            InterviewAttempt.student_id == student_id,
            InterviewAttempt.interview_type == interview_type,
            InterviewAttempt.difficulty_level == diff,
        )
        .first()
    )
    if attempt and attempt.attempt_number >= max_attempts:
        raise ValidationError(
            f"Maximum attempts ({max_attempts}) reached for {interview_type.value} {diff} interviews"
        )


def check_difficulty_unlock(
    db: Session, student_id: int, interview_type: InterviewType, difficulty: DifficultyLevel
) -> None:
    """Check if the student has unlocked this difficulty level for this type."""
    diff = difficulty.value
    unlock = UNLOCK_THRESHOLDS.get(diff)
    if not unlock:
        return  # basic is always unlocked

    required_diff = unlock["requires"]
    min_score = unlock["min_score"]

    # Find best score at the required difficulty for this type
    best = (
        db.query(Interview)
        .filter(
            Interview.student_id == student_id,
            Interview.interview_type == interview_type,
            Interview.difficulty_level == DifficultyLevel(required_diff),
            Interview.status == InterviewStatus.evaluated,
            Interview.total_score.isnot(None),
        )
        .order_by(Interview.total_score.desc())
        .first()
    )

    if not best or (best.total_score or 0) < min_score:
        raise ValidationError(
            f"{diff.capitalize()} is locked. Score at least {min_score}/10 on {required_diff} {interview_type.value} first."
        )


def increment_attempt(
    db: Session, student_id: int, interview_type: InterviewType, difficulty: DifficultyLevel | None = None
) -> None:
    diff = difficulty.value if difficulty else "basic"
    max_attempts = ATTEMPT_LIMITS.get(diff, 5)

    attempt = (
        db.query(InterviewAttempt)
        .filter(
            InterviewAttempt.student_id == student_id,
            InterviewAttempt.interview_type == interview_type,
            InterviewAttempt.difficulty_level == diff,
        )
        .first()
    )
    if attempt:
        attempt.attempt_number += 1
    else:
        attempt = InterviewAttempt(
            student_id=student_id,
            interview_type=interview_type,
            difficulty_level=diff,
            attempt_number=1,
            max_attempts=max_attempts if max_attempts > 0 else 999,
        )
        db.add(attempt)
    db.commit()


def start_interview(
    db: Session,
    student: StudentProfile,
    interview_type: InterviewType,
    difficulty: DifficultyLevel,
    target_questions: int = 5,
    target_role: str | None = None,
    target_industry: str | None = None,
) -> Interview:
    check_difficulty_unlock(db, student.id, interview_type, difficulty)
    check_attempt_limit(db, student.id, interview_type, difficulty)
    increment_attempt(db, student.id, interview_type, difficulty)

    # Clamp to allowed values
    if target_questions not in (3, 5, 7, 10, 15):
        target_questions = 5

    interview = Interview(
        student_id=student.id,
        interview_type=interview_type,
        difficulty_level=difficulty,
        status=InterviewStatus.in_progress,
        started_at=datetime.now(timezone.utc),
        target_questions=target_questions,
        target_role=target_role.strip() if target_role else None,
        target_industry=target_industry.strip() if target_industry else None,
        questions_answered=0,
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

    # Randomize: pick a random topic — use industry-specific if target_industry is set
    base_topics = TOPIC_POOLS.get(interview.interview_type.value, [])
    industry_topics = []
    if interview.target_industry:
        industry_key = interview.target_industry.lower().strip()
        for key, pool in INDUSTRY_TOPIC_POOLS.items():
            if key in industry_key or industry_key in key:
                industry_topics = pool
                break
    topics = industry_topics + base_topics if industry_topics else base_topics
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

    # Add role/industry context if provided
    if interview.target_role:
        prompt += f"\n\nThe candidate is targeting the role: {interview.target_role}"
    if interview.target_industry:
        prompt += f"\n\nThe target industry is: {interview.target_industry}"

    try:
        question_text = await local_llm.generate(prompt, system=QUESTION_GENERATION_SYSTEM)
        question_text = question_text.strip().strip('"')
        # Track token usage for question generation (Ollama doesn't report tokens, but log the call)
        try:
            from app.services.tracking_service import log_token_usage
            log_token_usage(db, user_id=interview.student_id, action="question_gen", provider="ollama", model="local", prompt_tokens=len(prompt.split()), completion_tokens=len(question_text.split()))
        except Exception:
            pass
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
    db: Session,
    interview: Interview,
    question_id: int,
    answer_text: str,
    response_time_seconds: float | None = None,
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

    word_count = len(answer_text.split())

    answer = InterviewAnswer(
        question_id=question_id,
        interview_id=interview.id,
        answer_text=answer_text,
        submitted_at=datetime.now(timezone.utc),
        word_count=word_count,
        response_time_seconds=response_time_seconds,
    )
    db.add(answer)

    # Update questions_answered count
    interview.questions_answered = (interview.questions_answered or 0) + 1
    db.commit()
    db.refresh(answer)
    return answer


async def complete_interview(db: Session, interview: Interview) -> Interview:
    """Mark interview complete and automatically run evaluation."""
    if interview.status != InterviewStatus.in_progress:
        raise ValidationError("Interview is not in progress")
    interview.status = InterviewStatus.completed
    interview.completed_at = datetime.now(timezone.utc)

    # Calculate duration
    if interview.started_at:
        try:
            started = interview.started_at.replace(tzinfo=None) if interview.started_at.tzinfo else interview.started_at
            completed = interview.completed_at.replace(tzinfo=None) if interview.completed_at.tzinfo else interview.completed_at
            delta = completed - started
            interview.duration_seconds = int(delta.total_seconds())
        except Exception:
            interview.duration_seconds = 0

    db.commit()
    db.refresh(interview)
    logger.info("Interview %s completed (duration=%ss), triggering auto-evaluation", interview.id, interview.duration_seconds)

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
    """Find any in-progress interview for the student (must have at least 1 question)."""
    return (
        db.query(Interview)
        .filter(
            Interview.student_id == student_id,
            Interview.status == InterviewStatus.in_progress,
        )
        .order_by(Interview.created_at.desc())
        .first()
    )


def abandon_interview(db: Session, interview: Interview) -> None:
    """Delete an in-progress interview that the student wants to discard."""
    if interview.status != InterviewStatus.in_progress:
        raise ValidationError("Only in-progress interviews can be abandoned")
    db.delete(interview)
    db.commit()
    logger.info("Interview %s abandoned and deleted", interview.id)
