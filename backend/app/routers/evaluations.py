import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_student
from app.models.user import User
from app.schemas.evaluation import EvaluationResponse, ScorecardResponse
from app.services.evaluation_service import evaluate_interview, get_evaluations, get_scorecard
from app.services.interview_service import get_interview
from app.services.student_service import get_or_create_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.post("/evaluate/{interview_id}", response_model=list[EvaluationResponse])
async def evaluate(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list:
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    evaluations = await evaluate_interview(db, interview)
    return [EvaluationResponse.model_validate(e) for e in evaluations]


@router.get("/{interview_id}", response_model=list[EvaluationResponse])
async def get_results(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list:
    profile = get_or_create_profile(db, user)
    get_interview(db, interview_id, profile.id)  # Verify ownership
    evals = get_evaluations(db, interview_id)
    return [EvaluationResponse.model_validate(e) for e in evals]


@router.get("/{interview_id}/scorecard", response_model=ScorecardResponse)
async def scorecard(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    return get_scorecard(db, interview)
