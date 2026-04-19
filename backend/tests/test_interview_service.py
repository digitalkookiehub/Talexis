"""Unit tests for interview service — attempt limits, progressive unlock, word count, duration."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.student import StudentProfile
from app.models.interview import Interview
from app.models.interview_question import InterviewQuestion
from app.models.interview_answer import InterviewAnswer
from app.models.enums import InterviewType, DifficultyLevel, InterviewStatus
from app.services.interview_service import (
    check_attempt_limit, check_difficulty_unlock, increment_attempt,
    submit_answer, ATTEMPT_LIMITS,
)
from app.exceptions import ValidationError
import pytest


def _create_student(db: Session, user_id: int) -> StudentProfile:
    p = StudentProfile(user_id=user_id, college_name="Test Uni")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _create_evaluated_interview(
    db: Session, student_id: int, itype: InterviewType, diff: DifficultyLevel, score: float
) -> Interview:
    iv = Interview(
        student_id=student_id, interview_type=itype, difficulty_level=diff,
        status=InterviewStatus.evaluated, total_score=score,
        started_at=datetime.now(timezone.utc),
    )
    db.add(iv)
    db.commit()
    db.refresh(iv)
    return iv


# --- Attempt Limits ---

def test_basic_unlimited(db: Session, student_user):
    """Basic should never raise an attempt limit error."""
    profile = _create_student(db, student_user.id)
    for _ in range(20):
        check_attempt_limit(db, profile.id, InterviewType.hr, DifficultyLevel.basic)
        increment_attempt(db, profile.id, InterviewType.hr, DifficultyLevel.basic)


def test_intermediate_limit_10(db: Session, student_user):
    """Intermediate should fail after 10 attempts."""
    profile = _create_student(db, student_user.id)
    for _ in range(10):
        check_attempt_limit(db, profile.id, InterviewType.hr, DifficultyLevel.intermediate)
        increment_attempt(db, profile.id, InterviewType.hr, DifficultyLevel.intermediate)

    with pytest.raises(ValidationError, match="Maximum attempts"):
        check_attempt_limit(db, profile.id, InterviewType.hr, DifficultyLevel.intermediate)


def test_advanced_limit_5(db: Session, student_user):
    """Advanced should fail after 5 attempts."""
    profile = _create_student(db, student_user.id)
    for _ in range(5):
        check_attempt_limit(db, profile.id, InterviewType.technical, DifficultyLevel.advanced)
        increment_attempt(db, profile.id, InterviewType.technical, DifficultyLevel.advanced)

    with pytest.raises(ValidationError, match="Maximum attempts"):
        check_attempt_limit(db, profile.id, InterviewType.technical, DifficultyLevel.advanced)


def test_limits_per_type(db: Session, student_user):
    """Limits are per type — using up HR advanced shouldn't affect Technical advanced."""
    profile = _create_student(db, student_user.id)
    for _ in range(5):
        increment_attempt(db, profile.id, InterviewType.hr, DifficultyLevel.advanced)

    # HR advanced should be maxed
    with pytest.raises(ValidationError):
        check_attempt_limit(db, profile.id, InterviewType.hr, DifficultyLevel.advanced)

    # Technical advanced should still work
    check_attempt_limit(db, profile.id, InterviewType.technical, DifficultyLevel.advanced)


# --- Progressive Unlock ---

def test_basic_always_unlocked(db: Session, student_user):
    profile = _create_student(db, student_user.id)
    # Should not raise
    check_difficulty_unlock(db, profile.id, InterviewType.hr, DifficultyLevel.basic)


def test_intermediate_locked_without_basic(db: Session, student_user):
    profile = _create_student(db, student_user.id)
    with pytest.raises(ValidationError, match="locked"):
        check_difficulty_unlock(db, profile.id, InterviewType.hr, DifficultyLevel.intermediate)


def test_intermediate_unlocked_with_basic_score(db: Session, student_user):
    profile = _create_student(db, student_user.id)
    _create_evaluated_interview(db, profile.id, InterviewType.hr, DifficultyLevel.basic, 5.5)
    # Should not raise
    check_difficulty_unlock(db, profile.id, InterviewType.hr, DifficultyLevel.intermediate)


def test_intermediate_locked_with_low_basic_score(db: Session, student_user):
    profile = _create_student(db, student_user.id)
    _create_evaluated_interview(db, profile.id, InterviewType.hr, DifficultyLevel.basic, 4.0)
    with pytest.raises(ValidationError, match="locked"):
        check_difficulty_unlock(db, profile.id, InterviewType.hr, DifficultyLevel.intermediate)


def test_advanced_locked_without_intermediate(db: Session, student_user):
    profile = _create_student(db, student_user.id)
    _create_evaluated_interview(db, profile.id, InterviewType.hr, DifficultyLevel.basic, 8.0)
    with pytest.raises(ValidationError, match="locked"):
        check_difficulty_unlock(db, profile.id, InterviewType.hr, DifficultyLevel.advanced)


def test_advanced_unlocked_with_intermediate_score(db: Session, student_user):
    profile = _create_student(db, student_user.id)
    _create_evaluated_interview(db, profile.id, InterviewType.hr, DifficultyLevel.intermediate, 6.5)
    check_difficulty_unlock(db, profile.id, InterviewType.hr, DifficultyLevel.advanced)


# --- Submit Answer ---

def test_submit_answer_word_count(db: Session, student_user):
    """Word count should be calculated on submit."""
    profile = _create_student(db, student_user.id)
    iv = Interview(
        student_id=profile.id, interview_type=InterviewType.hr,
        difficulty_level=DifficultyLevel.basic, status=InterviewStatus.in_progress,
        started_at=datetime.now(timezone.utc),
    )
    db.add(iv)
    db.flush()
    q = InterviewQuestion(
        interview_id=iv.id, question_text="Tell me about yourself",
        question_type="hr", difficulty="basic", order_index=0,
    )
    db.add(q)
    db.commit()

    answer = submit_answer(db, iv, q.id, "I am a software developer with five years of experience in Python", 45.5)
    assert answer.word_count == 12
    assert answer.response_time_seconds == 45.5


def test_submit_answer_updates_count(db: Session, student_user):
    """questions_answered should increment on each submit."""
    profile = _create_student(db, student_user.id)
    iv = Interview(
        student_id=profile.id, interview_type=InterviewType.hr,
        difficulty_level=DifficultyLevel.basic, status=InterviewStatus.in_progress,
        started_at=datetime.now(timezone.utc), questions_answered=0,
    )
    db.add(iv)
    db.flush()

    for i in range(3):
        q = InterviewQuestion(
            interview_id=iv.id, question_text=f"Q{i}", question_type="hr", difficulty="basic", order_index=i,
        )
        db.add(q)
        db.flush()
        submit_answer(db, iv, q.id, f"Answer number {i}")

    db.refresh(iv)
    assert iv.questions_answered == 3


# --- ATTEMPT_LIMITS config ---

def test_attempt_limits_config():
    assert ATTEMPT_LIMITS["basic"] == 0  # unlimited
    assert ATTEMPT_LIMITS["intermediate"] == 10
    assert ATTEMPT_LIMITS["advanced"] == 5
