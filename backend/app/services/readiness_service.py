import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.evaluation import AnswerEvaluation
from app.models.interview import Interview
from app.models.readiness import PlacementReadiness
from app.models.readiness_history import ReadinessHistory
from app.models.enums import InterviewStatus, Recommendation

logger = logging.getLogger(__name__)


def calculate_readiness(db: Session, student_id: int) -> PlacementReadiness:
    evaluated_interviews = (
        db.query(Interview)
        .filter(
            Interview.student_id == student_id,
            Interview.status == InterviewStatus.evaluated,
        )
        .all()
    )

    if not evaluated_interviews:
        readiness = _get_or_create_readiness(db, student_id)
        readiness.overall_readiness_percent = 0
        db.commit()
        db.refresh(readiness)
        return readiness

    interview_ids = [i.id for i in evaluated_interviews]
    evaluations = (
        db.query(AnswerEvaluation)
        .filter(AnswerEvaluation.interview_id.in_(interview_ids))
        .all()
    )

    if not evaluations:
        readiness = _get_or_create_readiness(db, student_id)
        db.commit()
        db.refresh(readiness)
        return readiness

    n = len(evaluations)
    comm_avg = sum(e.communication_score for e in evaluations) / n
    tech_avg = sum(e.technical_score for e in evaluations) / n
    conf_avg = sum(e.confidence_score for e in evaluations) / n
    struct_avg = sum(e.structure_score for e in evaluations) / n
    overall = (comm_avg + tech_avg + conf_avg + struct_avg) / 4
    readiness_pct = (overall / 10) * 100

    # Identify weak and strong areas
    scores = {
        "communication": comm_avg,
        "technical": tech_avg,
        "confidence": conf_avg,
        "structure": struct_avg,
    }
    weak = [k for k, v in scores.items() if v < 6.0]
    strong = [k for k, v in scores.items() if v >= 7.0]

    # Recommendation
    if readiness_pct >= 70:
        rec = Recommendation.yes
    elif readiness_pct >= 50:
        rec = Recommendation.maybe
    else:
        rec = Recommendation.no

    readiness = _get_or_create_readiness(db, student_id)
    readiness.overall_readiness_percent = round(readiness_pct, 1)
    readiness.communication_avg = round(comm_avg, 2)
    readiness.technical_avg = round(tech_avg, 2)
    readiness.confidence_avg = round(conf_avg, 2)
    readiness.structure_avg = round(struct_avg, 2)
    readiness.weak_areas = weak
    readiness.strong_areas = strong
    readiness.recommendation = rec
    readiness.last_calculated_at = datetime.now(timezone.utc)

    # Save history
    history = ReadinessHistory(
        student_id=student_id,
        readiness_percent=round(readiness_pct, 1),
        calculated_at=datetime.now(timezone.utc),
    )
    db.add(history)
    db.commit()
    db.refresh(readiness)
    logger.info("Readiness calculated for student %s: %.1f%%", student_id, readiness_pct)
    return readiness


def get_readiness(db: Session, student_id: int) -> PlacementReadiness | None:
    return (
        db.query(PlacementReadiness)
        .filter(PlacementReadiness.student_id == student_id)
        .first()
    )


def get_readiness_history(db: Session, student_id: int) -> list[ReadinessHistory]:
    return (
        db.query(ReadinessHistory)
        .filter(ReadinessHistory.student_id == student_id)
        .order_by(ReadinessHistory.calculated_at.desc())
        .all()
    )


def _get_or_create_readiness(db: Session, student_id: int) -> PlacementReadiness:
    readiness = (
        db.query(PlacementReadiness)
        .filter(PlacementReadiness.student_id == student_id)
        .first()
    )
    if not readiness:
        readiness = PlacementReadiness(student_id=student_id)
        db.add(readiness)
        db.flush()
    return readiness
