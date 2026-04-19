"""Lightweight activity logging for company-college coordination."""
import logging
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)


def log_activity(
    db: Session,
    event_type: str,
    actor_role: str,
    description: str,
    actor_name: str | None = None,
    company_id: int | None = None,
    student_profile_id: int | None = None,
    college_name: str | None = None,
) -> None:
    """Log an activity event for the shared timeline."""
    try:
        entry = ActivityLog(
            event_type=event_type,
            actor_role=actor_role,
            actor_name=actor_name,
            company_id=company_id,
            student_profile_id=student_profile_id,
            college_name=college_name,
            description=description,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.warning("Failed to log activity: %s", repr(e))


def get_activities_for_company(db: Session, company_id: int, limit: int = 20) -> list[ActivityLog]:
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.company_id == company_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )


def get_activities_for_college(db: Session, college_name: str, limit: int = 20) -> list[ActivityLog]:
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.college_name == college_name)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
