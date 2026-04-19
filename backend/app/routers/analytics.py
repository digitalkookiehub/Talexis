import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth.dependencies import get_current_active_user, require_admin, require_company
from app.models.user import User
from app.models.interview import Interview
from app.models.company import Company
from app.models.shortlist import CompanyShortlist
from app.models.talent_profile import TalentProfile
from app.models.enums import UserRole, InterviewStatus, ShortlistStatus
from app.services.student_service import get_or_create_profile
from app.exceptions import NotFoundError

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


@router.get("/company")
async def company_analytics(
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")

    shortlists = db.query(CompanyShortlist).filter(
        CompanyShortlist.company_id == company.id
    ).all()

    visible_talents = db.query(TalentProfile).filter(
        TalentProfile.is_visible == True,
        TalentProfile.consent_given == True,
    ).count()

    by_status: dict[str, int] = {s.value: 0 for s in ShortlistStatus}
    for s in shortlists:
        by_status[s.status.value] = by_status.get(s.status.value, 0) + 1

    return {
        "available_talent_pool": visible_talents,
        "total_shortlisted": len(shortlists),
        "hired": by_status.get("hired", 0),
        "rejected": by_status.get("rejected", 0),
        "contacted": by_status.get("contacted", 0),
        "shortlisted": by_status.get("shortlisted", 0),
        "by_status": by_status,
        "conversion_rate": round((by_status.get("hired", 0) / len(shortlists)) * 100, 1) if shortlists else 0,
    }


@router.get("/platform/trends")
async def platform_trends(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Interview and user trends for the last 30 days."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import cast, Date

    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Interviews by date
    interview_rows = (
        db.query(cast(Interview.created_at, Date).label("day"), func.count().label("count"))
        .filter(Interview.created_at >= thirty_days_ago)
        .group_by(cast(Interview.created_at, Date))
        .order_by(cast(Interview.created_at, Date))
        .all()
    )

    # Users by date
    user_rows = (
        db.query(cast(User.created_at, Date).label("day"), func.count().label("count"))
        .filter(User.created_at >= thirty_days_ago)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
        .all()
    )

    # Interviews by type
    type_rows = (
        db.query(Interview.interview_type, func.count().label("count"))
        .filter(Interview.created_at >= thirty_days_ago)
        .group_by(Interview.interview_type)
        .all()
    )

    # Score distribution
    score_rows = (
        db.query(Interview.total_score)
        .filter(Interview.total_score.isnot(None), Interview.created_at >= thirty_days_ago)
        .all()
    )
    score_buckets = {"0-3": 0, "4-5": 0, "6-7": 0, "8-9": 0, "10": 0}
    for (score,) in score_rows:
        if score <= 3: score_buckets["0-3"] += 1
        elif score <= 5: score_buckets["4-5"] += 1
        elif score <= 7: score_buckets["6-7"] += 1
        elif score <= 9: score_buckets["8-9"] += 1
        else: score_buckets["10"] += 1

    return {
        "interviews_by_date": [{"date": str(r.day), "count": r.count} for r in interview_rows],
        "users_by_date": [{"date": str(r.day), "count": r.count} for r in user_rows],
        "interviews_by_type": {r[0].value: r[1] for r in type_rows},
        "score_distribution": score_buckets,
    }


@router.get("/company/trends")
async def company_trends(
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    """Company hiring activity over the last 30 days."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import cast, Date
    from app.models.scheduled_interview import ScheduledInterview

    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")

    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Shortlists by date
    shortlist_rows = (
        db.query(cast(CompanyShortlist.shortlisted_at, Date).label("day"), func.count().label("count"))
        .filter(CompanyShortlist.company_id == company.id, CompanyShortlist.shortlisted_at >= thirty_days_ago)
        .group_by(cast(CompanyShortlist.shortlisted_at, Date))
        .order_by(cast(CompanyShortlist.shortlisted_at, Date))
        .all()
    )

    # Scheduled interviews by date
    schedule_rows = (
        db.query(cast(ScheduledInterview.scheduled_at, Date).label("day"), func.count().label("count"))
        .filter(ScheduledInterview.company_id == company.id, ScheduledInterview.created_at >= thirty_days_ago)
        .group_by(cast(ScheduledInterview.scheduled_at, Date))
        .order_by(cast(ScheduledInterview.scheduled_at, Date))
        .all()
    )

    # Schedule status breakdown
    schedule_statuses = (
        db.query(ScheduledInterview.status, func.count())
        .filter(ScheduledInterview.company_id == company.id)
        .group_by(ScheduledInterview.status)
        .all()
    )

    return {
        "shortlists_by_date": [{"date": str(r.day), "count": r.count} for r in shortlist_rows],
        "schedules_by_date": [{"date": str(r.day), "count": r.count} for r in schedule_rows],
        "schedule_statuses": {s[0].value: s[1] for s in schedule_statuses},
    }


def _count_by_type(interviews: list[Interview]) -> dict:
    counts: dict[str, int] = {}
    for i in interviews:
        key = i.interview_type.value
        counts[key] = counts.get(key, 0) + 1
    return counts
