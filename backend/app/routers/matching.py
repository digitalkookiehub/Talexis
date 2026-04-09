import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_company
from app.models.user import User
from app.models.company import Company
from app.services.matching_service import run_matching, get_match_results
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/matching", tags=["matching"])


def _get_company(db: Session, user: User) -> Company:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    return company


@router.post("/run/{job_id}")
async def match(
    job_id: int,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    company = _get_company(db, user)
    results = run_matching(db, job_id, company.id)
    return {
        "job_id": job_id,
        "total_matches": len(results),
        "results": [
            {
                "talent_profile_id": r.talent_profile_id,
                "match_score": r.match_score,
                "skill_match_percent": r.skill_match_percent,
                "readiness_match": r.readiness_match,
                "rank": r.overall_rank,
            }
            for r in results
        ],
    }


@router.get("/{job_id}/results")
async def results(
    job_id: int,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    company = _get_company(db, user)
    matches = get_match_results(db, job_id, company.id)
    return {
        "job_id": job_id,
        "total_matches": len(matches),
        "results": [
            {
                "talent_profile_id": r.talent_profile_id,
                "match_score": r.match_score,
                "skill_match_percent": r.skill_match_percent,
                "readiness_match": r.readiness_match,
                "rank": r.overall_rank,
            }
            for r in matches
        ],
    }
