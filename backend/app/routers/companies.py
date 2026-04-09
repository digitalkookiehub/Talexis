import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_company
from app.models.user import User
from app.models.company import Company
from app.schemas.company import CompanyProfileCreate, CompanyProfileUpdate, CompanyProfileResponse
from app.exceptions import NotFoundError, ConflictError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("/profile", response_model=CompanyProfileResponse, status_code=201)
async def create_company_profile(
    req: CompanyProfileCreate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> CompanyProfileResponse:
    existing = db.query(Company).filter(Company.user_id == user.id).first()
    if existing:
        raise ConflictError("Company profile already exists")
    company = Company(
        user_id=user.id,
        company_name=req.company_name,
        industry=req.industry,
        size=req.size,
        website=req.website,
        description=req.description,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanyProfileResponse.model_validate(company)


@router.get("/profile", response_model=CompanyProfileResponse)
async def get_company_profile(
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> CompanyProfileResponse:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    return CompanyProfileResponse.model_validate(company)


@router.put("/profile", response_model=CompanyProfileResponse)
async def update_company_profile(
    req: CompanyProfileUpdate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> CompanyProfileResponse:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    for key, value in req.model_dump(exclude_none=True).items():
        setattr(company, key, value)
    db.commit()
    db.refresh(company)
    return CompanyProfileResponse.model_validate(company)
