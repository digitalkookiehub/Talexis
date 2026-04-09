import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_company, require_student
from app.models.user import User
from app.models.company import Company
from app.schemas.talent import (
    TalentProfileResponse, TalentListResponse, ShortlistCreate,
    ShortlistResponse, ShortlistStatusUpdate, ConsentRequest,
)
from app.services.talent_service import (
    list_visible_talents, get_talent_by_code, shortlist_candidate,
    remove_from_shortlist, get_company_shortlist,
    update_shortlist_status, update_consent, get_or_create_talent_profile,
)
from app.services.student_service import get_or_create_profile
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/talents", tags=["talents"])


@router.get("", response_model=TalentListResponse)
async def browse_talents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    talents, total = list_visible_talents(db, skip, limit)
    return {
        "talents": [TalentProfileResponse.model_validate(t) for t in talents],
        "total": total,
    }


@router.get("/{candidate_code}", response_model=TalentProfileResponse)
async def get_talent(
    candidate_code: str,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> TalentProfileResponse:
    talent = get_talent_by_code(db, candidate_code)
    return TalentProfileResponse.model_validate(talent)


@router.post("/{candidate_code}/shortlist", response_model=ShortlistResponse, status_code=201)
async def add_to_shortlist(
    candidate_code: str,
    req: ShortlistCreate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> ShortlistResponse:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    talent = get_talent_by_code(db, candidate_code)
    shortlist = shortlist_candidate(db, company.id, talent.id, req.notes)
    return ShortlistResponse.model_validate(shortlist)


@router.delete("/{candidate_code}/shortlist", status_code=204)
async def remove_shortlist(
    candidate_code: str,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> None:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    talent = get_talent_by_code(db, candidate_code)
    remove_from_shortlist(db, company.id, talent.id)


@router.get("/shortlist", response_model=list[ShortlistResponse])
async def my_shortlist(
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> list:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    items = get_company_shortlist(db, company.id)
    return [ShortlistResponse.model_validate(s) for s in items]


@router.put("/shortlist/{shortlist_id}/status", response_model=ShortlistResponse)
async def update_status(
    shortlist_id: int,
    req: ShortlistStatusUpdate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> ShortlistResponse:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    updated = update_shortlist_status(db, shortlist_id, company.id, req.status)
    return ShortlistResponse.model_validate(updated)


# Student consent endpoints
@router.post("/consent", tags=["students"])
async def grant_consent(
    req: ConsentRequest,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    talent = update_consent(db, profile, req.consent)
    return {"message": "Consent updated", "visible": talent.is_visible}
