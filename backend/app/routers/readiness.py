import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_student
from app.models.user import User
from app.schemas.readiness import ReadinessResponse, ReadinessHistoryItem
from app.services.readiness_service import calculate_readiness, get_readiness, get_readiness_history
from app.services.student_service import get_or_create_profile
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/readiness", tags=["readiness"])


@router.get("/me", response_model=ReadinessResponse)
async def get_my_readiness(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> ReadinessResponse:
    profile = get_or_create_profile(db, user)
    readiness = get_readiness(db, profile.id)
    if not readiness:
        raise NotFoundError("Readiness score not calculated yet")
    return ReadinessResponse.model_validate(readiness)


@router.post("/calculate", response_model=ReadinessResponse)
async def recalculate(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> ReadinessResponse:
    profile = get_or_create_profile(db, user)
    readiness = calculate_readiness(db, profile.id)
    return ReadinessResponse.model_validate(readiness)


@router.get("/history", response_model=list[ReadinessHistoryItem])
async def readiness_trend(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list:
    profile = get_or_create_profile(db, user)
    history = get_readiness_history(db, profile.id)
    return [ReadinessHistoryItem.model_validate(h) for h in history]
