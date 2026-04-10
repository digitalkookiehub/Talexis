import logging

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_active_user, require_student
from app.models.user import User
from app.schemas.student import (
    StudentProfileCreate, StudentProfileUpdate,
    StudentProfileResponse, SkillAssessmentResponse,
)
from app.services.student_service import (
    create_profile, get_or_create_profile, update_profile,
    save_resume, parse_resume, get_skill_assessments, screen_resume,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/students", tags=["students"])


@router.post("/profile", response_model=StudentProfileResponse, status_code=201)
async def create_student_profile(
    req: StudentProfileCreate,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> StudentProfileResponse:
    profile = create_profile(
        db, user, req.branch, req.department, req.college_name,
        req.graduation_year, req.skills, req.interests, req.bio,
    )
    return StudentProfileResponse.model_validate(profile)


@router.get("/profile", response_model=StudentProfileResponse)
async def get_student_profile(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> StudentProfileResponse:
    profile = get_or_create_profile(db, user)
    return StudentProfileResponse.model_validate(profile)


@router.put("/profile", response_model=StudentProfileResponse)
async def update_student_profile(
    req: StudentProfileUpdate,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> StudentProfileResponse:
    profile = get_or_create_profile(db, user)
    updated = update_profile(db, profile, **req.model_dump(exclude_none=True))
    return StudentProfileResponse.model_validate(updated)


@router.post("/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    content = await file.read()
    filepath = await save_resume(db, profile, content, file.filename or "resume.pdf")
    return {"message": "Resume uploaded", "path": filepath}


@router.post("/resume/parse")
async def parse_student_resume(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    parsed = await parse_resume(db, profile)
    return {"message": "Resume parsed", "data": parsed}


@router.post("/resume/screen")
async def screen_student_resume(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    """AI-powered resume screening with score and improvement suggestions."""
    profile = get_or_create_profile(db, user)
    result = await screen_resume(db, profile)
    return result


@router.get("/resume/parsed")
async def get_parsed_resume(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    return {"parsed_resume": profile.parsed_resume}


@router.get("/skills", response_model=list[SkillAssessmentResponse])
async def get_skills(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list:
    profile = get_or_create_profile(db, user)
    return get_skill_assessments(db, profile.id)


@router.get("/dashboard")
async def student_dashboard(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    from app.models.interview import Interview
    interview_count = db.query(Interview).filter(Interview.student_id == profile.id).count()
    return {
        "profile_complete": bool(profile.branch and profile.college_name),
        "resume_uploaded": bool(profile.resume_url),
        "total_interviews": interview_count,
        "baseline_score": profile.baseline_score,
    }
