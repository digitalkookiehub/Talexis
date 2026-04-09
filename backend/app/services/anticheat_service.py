"""Anti-cheat service: similarity detection, pattern detection, and flagging."""
import logging
import random
from datetime import datetime, timezone
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.models.anticheat import AntiCheatLog, AnswerSimilarity
from app.models.interview import Interview
from app.models.interview_answer import InterviewAnswer
from app.models.interview_question import InterviewQuestion
from app.models.enums import AntiCheatFlagType, Severity, InterviewStatus

logger = logging.getLogger(__name__)

# Thresholds
SIMILARITY_THRESHOLD = 0.75  # 75% similarity = flagged
PATTERN_MIN_ANSWERS = 3  # Need at least 3 answers to detect patterns
SHORT_ANSWER_THRESHOLD = 20  # Answers shorter than 20 chars are suspicious
SAME_LENGTH_TOLERANCE = 10  # If all answers within 10 chars of same length


def check_answer_similarity(db: Session, interview_id: int) -> list[AntiCheatLog]:
    """Compare answers in this interview against student's previous answers."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        return []

    # Get current interview answers
    current_answers = (
        db.query(InterviewAnswer)
        .filter(InterviewAnswer.interview_id == interview_id)
        .all()
    )
    if not current_answers:
        return []

    # Get all previous answers from this student
    previous_interviews = (
        db.query(Interview)
        .filter(
            Interview.student_id == interview.student_id,
            Interview.id != interview_id,
            Interview.status.in_([InterviewStatus.completed, InterviewStatus.evaluated]),
        )
        .all()
    )

    prev_interview_ids = [i.id for i in previous_interviews]
    if not prev_interview_ids:
        return []

    previous_answers = (
        db.query(InterviewAnswer)
        .filter(InterviewAnswer.interview_id.in_(prev_interview_ids))
        .all()
    )

    flags: list[AntiCheatLog] = []

    for current in current_answers:
        for prev in previous_answers:
            sim_score = _text_similarity(current.answer_text, prev.answer_text)

            # Record similarity
            similarity = AnswerSimilarity(
                answer_id_1=current.id,
                answer_id_2=prev.id,
                similarity_score=round(sim_score, 3),
                flagged=sim_score >= SIMILARITY_THRESHOLD,
            )
            db.add(similarity)

            if sim_score >= SIMILARITY_THRESHOLD:
                severity = (
                    Severity.high if sim_score >= 0.9
                    else Severity.medium if sim_score >= 0.8
                    else Severity.low
                )
                flag = AntiCheatLog(
                    student_id=interview.student_id,
                    interview_id=interview_id,
                    flag_type=AntiCheatFlagType.similarity,
                    severity=severity,
                    details={
                        "current_answer_id": current.id,
                        "previous_answer_id": prev.id,
                        "similarity_score": round(sim_score, 3),
                        "previous_interview_id": prev.interview_id,
                    },
                    flagged_at=datetime.now(timezone.utc),
                )
                db.add(flag)
                flags.append(flag)
                logger.warning(
                    "Similarity flag: student=%s, score=%.2f, answers=%d vs %d",
                    interview.student_id, sim_score, current.id, prev.id,
                )

    db.commit()
    return flags


def check_repeated_patterns(db: Session, interview_id: int) -> list[AntiCheatLog]:
    """Detect repeated patterns: similar answer lengths, very short answers, identical structure."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        return []

    answers = (
        db.query(InterviewAnswer)
        .filter(InterviewAnswer.interview_id == interview_id)
        .all()
    )
    if len(answers) < PATTERN_MIN_ANSWERS:
        return []

    flags: list[AntiCheatLog] = []
    answer_texts = [a.answer_text for a in answers]
    answer_lengths = [len(t) for t in answer_texts]

    # Check 1: Very short answers (lazy/copy-paste)
    short_count = sum(1 for length in answer_lengths if length < SHORT_ANSWER_THRESHOLD)
    if short_count >= len(answers) * 0.5:
        flag = AntiCheatLog(
            student_id=interview.student_id,
            interview_id=interview_id,
            flag_type=AntiCheatFlagType.pattern,
            severity=Severity.medium,
            details={
                "pattern": "short_answers",
                "short_count": short_count,
                "total_answers": len(answers),
                "avg_length": round(sum(answer_lengths) / len(answer_lengths)),
            },
            flagged_at=datetime.now(timezone.utc),
        )
        db.add(flag)
        flags.append(flag)

    # Check 2: Suspiciously uniform answer lengths
    if answer_lengths:
        avg_len = sum(answer_lengths) / len(answer_lengths)
        all_similar = all(abs(length - avg_len) < SAME_LENGTH_TOLERANCE for length in answer_lengths)
        if all_similar and len(answers) >= 3:
            flag = AntiCheatLog(
                student_id=interview.student_id,
                interview_id=interview_id,
                flag_type=AntiCheatFlagType.pattern,
                severity=Severity.low,
                details={
                    "pattern": "uniform_length",
                    "avg_length": round(avg_len),
                    "lengths": answer_lengths,
                },
                flagged_at=datetime.now(timezone.utc),
            )
            db.add(flag)
            flags.append(flag)

    # Check 3: High internal similarity (same answer repeated)
    for i in range(len(answer_texts)):
        for j in range(i + 1, len(answer_texts)):
            sim = _text_similarity(answer_texts[i], answer_texts[j])
            if sim >= 0.85:
                flag = AntiCheatLog(
                    student_id=interview.student_id,
                    interview_id=interview_id,
                    flag_type=AntiCheatFlagType.pattern,
                    severity=Severity.high,
                    details={
                        "pattern": "internal_repetition",
                        "answer_indices": [i, j],
                        "similarity": round(sim, 3),
                    },
                    flagged_at=datetime.now(timezone.utc),
                )
                db.add(flag)
                flags.append(flag)

    if flags:
        db.commit()
        logger.warning("Pattern flags: student=%s, count=%d", interview.student_id, len(flags))

    return flags


def run_full_anticheat(db: Session, interview_id: int) -> dict:
    """Run all anti-cheat checks on an interview."""
    similarity_flags = check_answer_similarity(db, interview_id)
    pattern_flags = check_repeated_patterns(db, interview_id)

    all_flags = similarity_flags + pattern_flags
    return {
        "interview_id": interview_id,
        "total_flags": len(all_flags),
        "similarity_flags": len(similarity_flags),
        "pattern_flags": len(pattern_flags),
        "flags": [
            {
                "type": f.flag_type.value,
                "severity": f.severity.value,
                "details": f.details,
            }
            for f in all_flags
        ],
    }


def get_student_flags(db: Session, student_id: int) -> list[AntiCheatLog]:
    """Get all anti-cheat flags for a student."""
    return (
        db.query(AntiCheatLog)
        .filter(AntiCheatLog.student_id == student_id)
        .order_by(AntiCheatLog.flagged_at.desc())
        .all()
    )


def get_anticheat_report(db: Session) -> dict:
    """Admin report of all anti-cheat activity."""
    total = db.query(AntiCheatLog).count()
    by_type = {}
    for flag_type in AntiCheatFlagType:
        count = db.query(AntiCheatLog).filter(AntiCheatLog.flag_type == flag_type).count()
        by_type[flag_type.value] = count

    by_severity = {}
    for sev in Severity:
        count = db.query(AntiCheatLog).filter(AntiCheatLog.severity == sev).count()
        by_severity[sev.value] = count

    return {
        "total_flags": total,
        "by_type": by_type,
        "by_severity": by_severity,
    }


def randomize_question_order(questions: list[InterviewQuestion]) -> list[InterviewQuestion]:
    """Shuffle question order for display to prevent predictable sequences."""
    shuffled = list(questions)
    random.shuffle(shuffled)
    return shuffled


def _text_similarity(text1: str, text2: str) -> float:
    """Calculate text similarity using SequenceMatcher (0.0 to 1.0)."""
    if not text1 or not text2:
        return 0.0
    # Normalize: lowercase, strip whitespace
    t1 = " ".join(text1.lower().split())
    t2 = " ".join(text2.lower().split())
    return SequenceMatcher(None, t1, t2).ratio()
