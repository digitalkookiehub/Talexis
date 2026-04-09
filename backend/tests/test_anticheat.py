from app.services.anticheat_service import _text_similarity, check_repeated_patterns
from app.models.interview import Interview
from app.models.interview_question import InterviewQuestion
from app.models.interview_answer import InterviewAnswer
from app.models.student import StudentProfile
from app.models.enums import InterviewType, DifficultyLevel, InterviewStatus
from sqlalchemy.orm import Session
from datetime import datetime, timezone


def test_text_similarity_identical():
    assert _text_similarity("hello world", "hello world") == 1.0


def test_text_similarity_different():
    score = _text_similarity("hello world", "goodbye universe")
    assert score < 0.5


def test_text_similarity_similar():
    score = _text_similarity(
        "Python is a great programming language for data science",
        "Python is a great programming language for data science and ML",
    )
    assert score > 0.8


def test_text_similarity_empty():
    assert _text_similarity("", "hello") == 0.0
    assert _text_similarity("", "") == 0.0


def test_short_answer_pattern_detection(db: Session, student_user):
    """Test that very short answers get flagged."""
    # Create student profile
    profile = StudentProfile(user_id=student_user.id)
    db.add(profile)
    db.flush()

    # Create interview
    interview = Interview(
        student_id=profile.id,
        interview_type=InterviewType.hr,
        difficulty_level=DifficultyLevel.basic,
        status=InterviewStatus.completed,
    )
    db.add(interview)
    db.flush()

    # Add 4 very short answers
    for i in range(4):
        q = InterviewQuestion(
            interview_id=interview.id, question_text=f"Question {i}",
            question_type="hr", difficulty="basic", order_index=i,
        )
        db.add(q)
        db.flush()
        a = InterviewAnswer(
            question_id=q.id, interview_id=interview.id,
            answer_text="yes",  # Very short
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(a)
    db.commit()

    flags = check_repeated_patterns(db, interview.id)
    assert len(flags) > 0
    flag_types = [f.details.get("pattern") for f in flags]
    assert "short_answers" in flag_types


def test_attempt_limit(client, student_token):
    """Test that attempt limiting works."""
    from tests.conftest import auth_headers

    # Start multiple interviews of same type
    for i in range(5):
        response = client.post(
            "/api/v1/interviews/start",
            headers=auth_headers(student_token),
            json={"interview_type": "hr", "difficulty_level": "basic"},
        )
        assert response.status_code == 201

    # 6th attempt should fail
    response = client.post(
        "/api/v1/interviews/start",
        headers=auth_headers(student_token),
        json={"interview_type": "hr", "difficulty_level": "basic"},
    )
    assert response.status_code == 422  # ValidationError
