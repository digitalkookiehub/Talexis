import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_admin, require_student, get_current_active_user
from app.models.user import User
from app.services.anticheat_service import run_full_anticheat, get_student_flags, get_anticheat_report
from app.services.student_service import get_or_create_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/anticheat", tags=["anticheat"])


@router.post("/check/{interview_id}")
async def check_interview(
    interview_id: int,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Run anti-cheat analysis on a completed interview."""
    result = run_full_anticheat(db, interview_id)
    return result


@router.get("/flags/me")
async def my_flags(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    """Get anti-cheat flags for the current student."""
    profile = get_or_create_profile(db, user)
    flags = get_student_flags(db, profile.id)
    return {
        "total": len(flags),
        "flags": [
            {
                "id": f.id,
                "type": f.flag_type.value,
                "severity": f.severity.value,
                "details": f.details,
                "flagged_at": str(f.flagged_at),
            }
            for f in flags
        ],
    }


@router.get("/flags/{student_id}")
async def student_flags(
    student_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Admin: get anti-cheat flags for a specific student."""
    flags = get_student_flags(db, student_id)
    return {
        "student_id": student_id,
        "total": len(flags),
        "flags": [
            {
                "id": f.id,
                "type": f.flag_type.value,
                "severity": f.severity.value,
                "interview_id": f.interview_id,
                "details": f.details,
                "flagged_at": str(f.flagged_at),
            }
            for f in flags
        ],
    }


@router.get("/report")
async def report(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Admin: platform-wide anti-cheat report."""
    return get_anticheat_report(db)


@router.get("/report/flagged")
async def flagged_interviews(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list:
    """Admin: list all flagged interviews with student and flag details."""
    from app.models.anticheat import AntiCheatLog
    from app.models.interview import Interview
    from app.models.student import StudentProfile
    from app.models.user import User as UserModel

    flags = (
        db.query(AntiCheatLog)
        .order_by(AntiCheatLog.flagged_at.desc())
        .limit(100)
        .all()
    )

    results = []
    seen_interviews: dict[int, dict] = {}

    for flag in flags:
        interview_id = flag.interview_id
        if interview_id not in seen_interviews:
            interview = db.query(Interview).filter(Interview.id == interview_id).first()
            student_name = None
            student_email = None
            if interview:
                student = db.query(StudentProfile).filter(StudentProfile.id == interview.student_id).first()
                if student:
                    user_record = db.query(UserModel).filter(UserModel.id == student.user_id).first()
                    if user_record:
                        student_name = user_record.full_name
                        student_email = user_record.email

            seen_interviews[interview_id] = {
                "interview_id": interview_id,
                "interview_type": interview.interview_type.value if interview else "unknown",
                "student_name": student_name,
                "student_email": student_email,
                "total_score": interview.total_score if interview else None,
                "date": str(interview.completed_at or interview.created_at) if interview else None,
                "flags": [],
            }

        seen_interviews[interview_id]["flags"].append({
            "id": flag.id,
            "type": flag.flag_type.value,
            "severity": flag.severity.value,
            "details": flag.details,
            "flagged_at": str(flag.flagged_at),
        })

    return list(seen_interviews.values())
