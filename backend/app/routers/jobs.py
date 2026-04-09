import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_company
from app.models.user import User
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
