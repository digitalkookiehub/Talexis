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
