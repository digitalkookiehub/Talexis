"""Company interview scheduling — for both platform candidates and external people."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_company
from app.models.user import User
from app.models.company import Company
from app.models.scheduled_interview import ScheduledInterview, ScheduleStatus, CandidateType
from app.models.talent_profile import TalentProfile
from app.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/schedules", tags=["schedules"])


class ScheduleCreate(BaseModel):
    candidate_type: str = "platform"  # "platform" or "external"
    talent_profile_id: int | None = None  # for platform candidates
    candidate_name: str
    candidate_email: str | None = None
    candidate_phone: str | None = None
    job_role_id: int | None = None
    scheduled_at: datetime
    duration_minutes: int = 30
    interview_type: str | None = None
    interviewer_name: str | None = None
    meeting_link: str | None = None
    notes: str | None = None


class ScheduleUpdate(BaseModel):
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    interview_type: str | None = None
    interviewer_name: str | None = None
    meeting_link: str | None = None
    notes: str | None = None
    reschedule_reason: str | None = None


def _get_company(db: Session, user: User) -> Company:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    return company


@router.post("", status_code=201)
async def create_schedule(
    req: ScheduleCreate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    from app.services.subscription_service import check_limit, increment_usage
    check_limit(db, user.id, "schedule")

    company = _get_company(db, user)

    ctype = CandidateType.platform if req.candidate_type == "platform" else CandidateType.external

    # Validate platform candidate and determine approval requirement
    from app.models.scheduled_interview import ApprovalStatus
    from app.models.student import StudentProfile
    approval = ApprovalStatus.pending  # default for college candidates

    if ctype == CandidateType.platform and req.talent_profile_id:
        talent = db.query(TalentProfile).filter(TalentProfile.id == req.talent_profile_id).first()
        if not talent:
            raise NotFoundError("Talent profile")
        # Check if candidate belongs to a college
        student = db.query(StudentProfile).filter(StudentProfile.id == talent.student_id).first()
        if student and not student.college_name:
            # Independent candidate — no college approval needed
            approval = ApprovalStatus.not_required

    schedule = ScheduledInterview(
        company_id=company.id,
        candidate_type=ctype,
        talent_profile_id=req.talent_profile_id if ctype == CandidateType.platform else None,
        candidate_name=req.candidate_name,
        candidate_email=req.candidate_email,
        candidate_phone=req.candidate_phone,
        job_role_id=req.job_role_id,
        scheduled_at=req.scheduled_at,
        duration_minutes=req.duration_minutes,
        interview_type=req.interview_type,
        interviewer_name=req.interviewer_name,
        meeting_link=req.meeting_link,
        notes=req.notes,
        status=ScheduleStatus.scheduled,
        college_approval=approval,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    logger.info("Interview scheduled: %s for %s on %s", schedule.id, req.candidate_name, req.scheduled_at)

    # Log activity
    try:
        from app.services.activity_service import log_activity
        from app.models.student import StudentProfile
        college = None
        if schedule.talent_profile_id:
            tp = db.query(TalentProfile).filter(TalentProfile.id == schedule.talent_profile_id).first()
            if tp:
                sp = db.query(StudentProfile).filter(StudentProfile.id == tp.student_id).first()
                if sp:
                    college = sp.college_name
        log_activity(db, "scheduled", "company", f"Interview scheduled with {req.candidate_name}",
                     actor_name=user.full_name, company_id=company.id,
                     student_profile_id=tp.student_id if schedule.talent_profile_id and tp else None,
                     college_name=college)
    except Exception:
        pass

    return _to_dict(schedule)


@router.get("")
async def list_schedules(
    status: str | None = None,
    candidate_type: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    company = _get_company(db, user)
    query = db.query(ScheduledInterview).filter(ScheduledInterview.company_id == company.id)

    if status:
        query = query.filter(ScheduledInterview.status == status)
    if candidate_type:
        query = query.filter(ScheduledInterview.candidate_type == candidate_type)

    total = query.count()
    schedules = query.order_by(ScheduledInterview.scheduled_at.desc()).offset(skip).limit(limit).all()

    return {
        "schedules": [_to_dict(s) for s in schedules],
        "total": total,
    }


@router.get("/{schedule_id}")
async def get_schedule(
    schedule_id: int,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    company = _get_company(db, user)
    schedule = db.query(ScheduledInterview).filter(
        ScheduledInterview.id == schedule_id, ScheduledInterview.company_id == company.id
    ).first()
    if not schedule:
        raise NotFoundError("Scheduled interview")
    return _to_dict(schedule)


@router.put("/{schedule_id}")
async def update_schedule(
    schedule_id: int,
    req: ScheduleUpdate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    company = _get_company(db, user)
    schedule = db.query(ScheduledInterview).filter(
        ScheduledInterview.id == schedule_id, ScheduledInterview.company_id == company.id
    ).first()
    if not schedule:
        raise NotFoundError("Scheduled interview")

    if req.scheduled_at and req.scheduled_at != schedule.scheduled_at:
        schedule.status = ScheduleStatus.rescheduled
        if req.reschedule_reason:
            schedule.reschedule_reason = req.reschedule_reason

    for key, value in req.model_dump(exclude_none=True).items():
        if hasattr(schedule, key):
            setattr(schedule, key, value)

    db.commit()
    db.refresh(schedule)
    logger.info("Schedule %s updated", schedule_id)
    return _to_dict(schedule)


@router.post("/{schedule_id}/cancel")
async def cancel_schedule(
    schedule_id: int,
    reason: str = "",
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    company = _get_company(db, user)
    schedule = db.query(ScheduledInterview).filter(
        ScheduledInterview.id == schedule_id, ScheduledInterview.company_id == company.id
    ).first()
    if not schedule:
        raise NotFoundError("Scheduled interview")
    schedule.status = ScheduleStatus.cancelled
    if reason:
        schedule.reschedule_reason = reason
    db.commit()
    db.refresh(schedule)
    return _to_dict(schedule)


@router.post("/{schedule_id}/complete")
async def complete_schedule(
    schedule_id: int,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    company = _get_company(db, user)
    schedule = db.query(ScheduledInterview).filter(
        ScheduledInterview.id == schedule_id, ScheduledInterview.company_id == company.id
    ).first()
    if not schedule:
        raise NotFoundError("Scheduled interview")
    schedule.status = ScheduleStatus.completed
    db.commit()
    db.refresh(schedule)
    return _to_dict(schedule)


@router.get("/activity")
async def company_activity(
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> list:
    """Get activity feed for this company."""
    company = _get_company(db, user)
    from app.services.activity_service import get_activities_for_company
    activities = get_activities_for_company(db, company.id)
    return [
        {
            "id": a.id,
            "event_type": a.event_type,
            "actor_role": a.actor_role,
            "actor_name": a.actor_name,
            "description": a.description,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in activities
    ]


class FeedbackSubmit(BaseModel):
    rating: int  # 1-5
    notes: str | None = None
    outcome: str  # hire, next_round, reject


@router.post("/{schedule_id}/feedback")
async def submit_feedback(
    schedule_id: int,
    req: FeedbackSubmit,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    """Submit post-interview feedback after marking as completed."""
    from app.models.scheduled_interview import InterviewOutcome
    company = _get_company(db, user)
    schedule = db.query(ScheduledInterview).filter(
        ScheduledInterview.id == schedule_id, ScheduledInterview.company_id == company.id
    ).first()
    if not schedule:
        raise NotFoundError("Scheduled interview")
    schedule.feedback_rating = max(1, min(5, req.rating))
    schedule.feedback_notes = req.notes
    schedule.feedback_outcome = InterviewOutcome(req.outcome)
    if schedule.status != ScheduleStatus.completed:
        schedule.status = ScheduleStatus.completed
    db.commit()
    db.refresh(schedule)
    return _to_dict(schedule)


def _to_dict(s: ScheduledInterview) -> dict:
    return {
        "id": s.id,
        "company_id": s.company_id,
        "candidate_type": s.candidate_type.value,
        "talent_profile_id": s.talent_profile_id,
        "candidate_name": s.candidate_name,
        "candidate_email": s.candidate_email,
        "candidate_phone": s.candidate_phone,
        "job_role_id": s.job_role_id,
        "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
        "duration_minutes": s.duration_minutes,
        "interview_type": s.interview_type,
        "interviewer_name": s.interviewer_name,
        "meeting_link": s.meeting_link,
        "status": s.status.value,
        "notes": s.notes,
        "reschedule_reason": s.reschedule_reason,
        "college_approval": s.college_approval.value if s.college_approval else "pending",
        "feedback_rating": s.feedback_rating,
        "feedback_notes": s.feedback_notes,
        "feedback_outcome": s.feedback_outcome.value if s.feedback_outcome else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }
