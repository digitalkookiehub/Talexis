import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth.dependencies import get_current_active_user, require_admin
from app.models.user import User
from app.models.interview import Interview
from app.models.evaluation import AnswerEvaluation
from app.models.enums import UserRole, InterviewStatus
from app.services.student_service import get_or_create_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/student")
async def student_analytics(
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    interviews = (
        db.query(Interview)
        .filter(Interview.student_id == profile.id)
        .all()
    )
    evaluated = [i for i in interviews if i.status == InterviewStatus.evaluated]
    scores = [i.total_score for i in evaluated if i.total_score is not None]

    return {
        "total_interviews": len(interviews),
        "evaluated_interviews": len(evaluated),
        "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "highest_score": max(scores) if scores else 0,
        "interviews_by_type": _count_by_type(interviews),
    }


@router.get("/platform")
async def platform_analytics(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    total_users = db.query(User).count()
    total_interviews = db.query(Interview).count()
    evaluated = db.query(Interview).filter(
        Interview.status == InterviewStatus.evaluated
    ).count()
    avg_score = db.query(func.avg(Interview.total_score)).filter(
        Interview.total_score.isnot(None)
    ).scalar()

    return {
        "total_users": total_users,
        "total_interviews": total_interviews,
        "evaluated_interviews": evaluated,
        "platform_avg_score": round(float(avg_score), 2) if avg_score else 0,
        "users_by_role": {
            role.value: db.query(User).filter(User.role == role).count()
            for role in UserRole
        },
    }


def _count_by_type(interviews: list[Interview]) -> dict:
    counts: dict[str, int] = {}
    for i in interviews:
        key = i.interview_type.value
        counts[key] = counts.get(key, 0) + 1
    return counts
