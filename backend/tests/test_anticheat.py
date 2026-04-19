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
    profile = StudentProfile(user_id=student_user.id)
    db.add(profile)
    db.flush()

    interview = Interview(
        student_id=profile.id,
        interview_type=InterviewType.hr,
        difficulty_level=DifficultyLevel.basic,
        status=InterviewStatus.completed,
    )
    db.add(interview)
    db.flush()

    for i in range(4):
        q = InterviewQuestion(
            interview_id=interview.id, question_text=f"Question {i}",
            question_type="hr", difficulty="basic", order_index=i,
        )
        db.add(q)
        db.flush()
        a = InterviewAnswer(
            question_id=q.id, interview_id=interview.id,
            answer_text="yes",
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(a)
    db.commit()

    flags = check_repeated_patterns(db, interview.id)
    assert len(flags) > 0
    flag_types = [f.details.get("pattern") for f in flags]
    assert "short_answers" in flag_types


def test_basic_unlimited_attempts(client, student_token):
    """Basic difficulty should allow unlimited attempts."""
    from tests.conftest import auth_headers

    # Start 7 basic HR interviews — should all succeed
    for i in range(7):
        response = client.post(
            "/api/v1/interviews/start",
            headers=auth_headers(student_token),
            json={"interview_type": "hr", "difficulty_level": "basic"},
        )
        assert response.status_code == 201, f"Attempt {i+1} failed: {response.text}"


def test_advanced_attempt_limit(client, student_token, db):
    """Advanced difficulty should limit to 5 attempts per type."""
    from tests.conftest import auth_headers

    # Need to unlock advanced first — create evaluated interviews with good scores
    profile = StudentProfile(user_id=1)
    db.add(profile)
    db.flush()

    # Create a basic evaluated interview with score >= 5
    for diff, score in [("basic", 6.0), ("intermediate", 7.0)]:
        iv = Interview(
            student_id=profile.id, interview_type=InterviewType.technical,
            difficulty_level=DifficultyLevel(diff), status=InterviewStatus.evaluated,
            total_score=score, started_at=datetime.now(timezone.utc),
        )
        db.add(iv)
    db.commit()

    # Now try advanced — should work up to 5 times
    for i in range(5):
        response = client.post(
            "/api/v1/interviews/start",
            headers=auth_headers(student_token),
            json={"interview_type": "technical", "difficulty_level": "advanced"},
        )
        assert response.status_code == 201, f"Advanced attempt {i+1} failed: {response.text}"

    # 6th should fail
    response = client.post(
        "/api/v1/interviews/start",
        headers=auth_headers(student_token),
        json={"interview_type": "technical", "difficulty_level": "advanced"},
    )
    assert response.status_code == 422
