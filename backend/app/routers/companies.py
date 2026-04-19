import logging

from fastapi import APIRouter, Depends, UploadFile, File
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


@router.post("/profile/logo")
async def upload_logo(
    file: UploadFile = File(...),
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    import os, uuid
    from app.config import settings

    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    ext = os.path.splitext(file.filename or "logo.png")[1].lower()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    if company.logo_url and os.path.exists(company.logo_url):
        try: os.remove(company.logo_url)
        except OSError: pass

    saved = f"logo_{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, saved)
    with open(filepath, "wb") as f:
        f.write(content)

    company.logo_url = filepath
    db.commit()
    return {"message": "Logo uploaded", "path": filepath}

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
