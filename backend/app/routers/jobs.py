import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_company, require_student
from app.models.user import User
from app.models.student import StudentProfile
from app.models.company import Company
from app.models.job_role import JobRole
from app.schemas.company import JobRoleCreate, JobRoleUpdate, JobRoleResponse
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])


def _get_company(db: Session, user: User) -> Company:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile — create one first")
    return company


@router.post("", response_model=JobRoleResponse, status_code=201)
async def create_job(
    req: JobRoleCreate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> JobRoleResponse:
    company = _get_company(db, user)
    job = JobRole(
        company_id=company.id,
        title=req.title,
        description=req.description,
        required_skills=req.required_skills,
        min_readiness_score=req.min_readiness_score,
        interview_types_required=req.interview_types_required,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobRoleResponse.model_validate(job)


@router.get("", response_model=list[JobRoleResponse])
async def list_jobs(
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> list:
    company = _get_company(db, user)
    jobs = db.query(JobRole).filter(JobRole.company_id == company.id).all()
    return [JobRoleResponse.model_validate(j) for j in jobs]


@router.get("/{job_id}", response_model=JobRoleResponse)
async def get_job(
    job_id: int,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> JobRoleResponse:
    company = _get_company(db, user)
    job = db.query(JobRole).filter(JobRole.id == job_id, JobRole.company_id == company.id).first()
    if not job:
        raise NotFoundError("Job role")
    return JobRoleResponse.model_validate(job)


@router.put("/{job_id}", response_model=JobRoleResponse)
async def update_job(
    job_id: int,
    req: JobRoleUpdate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> JobRoleResponse:
    company = _get_company(db, user)
    job = db.query(JobRole).filter(JobRole.id == job_id, JobRole.company_id == company.id).first()
    if not job:
        raise NotFoundError("Job role")
    for key, value in req.model_dump(exclude_none=True).items():
        setattr(job, key, value)
    db.commit()
    db.refresh(job)
    return JobRoleResponse.model_validate(job)


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: int,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> None:
    company = _get_company(db, user)
    job = db.query(JobRole).filter(JobRole.id == job_id, JobRole.company_id == company.id).first()
    if not job:
        raise NotFoundError("Job role")
    db.delete(job)
    db.commit()


# ===== Job Board (Student-facing) =====

@router.get("/board/active")
async def job_board(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list:
    """Student browses all active job postings from all companies."""
    from app.models.enums import JobStatus
    from app.models.job_application import JobApplication
    from app.services.student_service import get_or_create_profile

    profile = get_or_create_profile(db, user)
    jobs = db.query(JobRole).filter(JobRole.status == JobStatus.active).all()

    result = []
    for j in jobs:
        company = db.query(Company).filter(Company.id == j.company_id).first()
        # Check if already applied
        existing = db.query(JobApplication).filter(
            JobApplication.student_id == profile.id, JobApplication.job_role_id == j.id
        ).first()
        result.append({
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "required_skills": j.required_skills or [],
            "min_readiness_score": j.min_readiness_score,
            "company_name": company.company_name if company else "Unknown",
            "company_industry": company.industry if company else None,
            "already_applied": existing is not None,
            "application_status": existing.status.value if existing else None,
        })
    return result


@router.post("/board/{job_id}/apply", status_code=201)
async def apply_to_job(
    job_id: int,
    message: str = "",
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    """Student expresses interest / applies to a job."""
    from app.models.job_application import JobApplication
    from app.services.student_service import get_or_create_profile
    from app.exceptions import ConflictError

    profile = get_or_create_profile(db, user)
    job = db.query(JobRole).filter(JobRole.id == job_id).first()
    if not job:
        raise NotFoundError("Job role")

    existing = db.query(JobApplication).filter(
        JobApplication.student_id == profile.id, JobApplication.job_role_id == job_id
    ).first()
    if existing:
        raise ConflictError("Already applied to this job")

    application = JobApplication(
        student_id=profile.id, job_role_id=job_id, message=message or None,
    )
    db.add(application)
    db.commit()
    return {"message": "Application submitted!", "job_title": job.title}


@router.get("/board/my-applications")
async def my_applications(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list:
    """Student sees their applications."""
    from app.models.job_application import JobApplication
    from app.services.student_service import get_or_create_profile

    profile = get_or_create_profile(db, user)
    apps = db.query(JobApplication).filter(JobApplication.student_id == profile.id).order_by(JobApplication.applied_at.desc()).all()
    result = []
    for a in apps:
        job = db.query(JobRole).filter(JobRole.id == a.job_role_id).first()
        company = db.query(Company).filter(Company.id == job.company_id).first() if job else None
        result.append({
            "id": a.id,
            "job_title": job.title if job else "Unknown",
            "company_name": company.company_name if company else "Unknown",
            "status": a.status.value,
            "message": a.message,
            "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        })
    return result


@router.get("/{job_id}/applications")
async def job_applications(
    job_id: int,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> list:
    """Company sees applications for a specific job."""
    from app.models.job_application import JobApplication

    company = _get_company(db, user)
    job = db.query(JobRole).filter(JobRole.id == job_id, JobRole.company_id == company.id).first()
    if not job:
        raise NotFoundError("Job role")

    apps = db.query(JobApplication).filter(JobApplication.job_role_id == job_id).order_by(JobApplication.applied_at.desc()).all()
    result = []
    for a in apps:
        student = db.query(StudentProfile).filter(StudentProfile.id == a.student_id).first()
        student_user = db.query(User).filter(User.id == student.user_id).first() if student else None
        from app.models.talent_profile import TalentProfile
        talent = db.query(TalentProfile).filter(TalentProfile.student_id == a.student_id).first()
        result.append({
            "id": a.id,
            "candidate_name": student_user.full_name if student_user else None,
            "candidate_code": talent.candidate_code if talent else None,
            "college": student.college_name if student else None,
            "experience_level": student.experience_level if student else None,
            "status": a.status.value,
            "message": a.message,
            "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        })
    return result
