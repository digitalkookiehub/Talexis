import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_student
from app.models.user import User
from app.schemas.evaluation import EvaluationResponse, ScorecardResponse
from app.models.interview import Interview
from app.models.evaluation import AnswerEvaluation
from app.models.enums import InterviewStatus
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


@router.get("/aggregate/scorecard")
async def aggregate_scorecard(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    """Get aggregate scorecard across ALL evaluated interviews."""
    profile = get_or_create_profile(db, user)
    interviews = (
        db.query(Interview)
        .filter(
            Interview.student_id == profile.id,
            Interview.status == InterviewStatus.evaluated,
        )
        .order_by(Interview.created_at.desc())
        .all()
    )

    if not interviews:
        return {"interviews": [], "totals": None}

    scorecards = []
    all_evals: list[AnswerEvaluation] = []

    for interview in interviews:
        evals = get_evaluations(db, interview.id)
        all_evals.extend(evals)
        n = len(evals)
        scorecards.append({
            "interview_id": interview.id,
            "type": interview.interview_type.value,
            "difficulty": interview.difficulty_level.value,
            "total_score": interview.total_score,
            "questions_count": n,
            "date": str(interview.completed_at or interview.created_at),
            "communication": sum(e.communication_score for e in evals) / n if n else 0,
            "technical": sum(e.technical_score for e in evals) / n if n else 0,
            "confidence": sum(e.confidence_score for e in evals) / n if n else 0,
            "structure": sum(e.structure_score for e in evals) / n if n else 0,
        })

    total_n = len(all_evals)
    totals = {
        "total_interviews": len(interviews),
        "total_questions": total_n,
        "avg_score": sum(e.overall_score for e in all_evals) / total_n if total_n else 0,
        "avg_communication": sum(e.communication_score for e in all_evals) / total_n if total_n else 0,
        "avg_technical": sum(e.technical_score for e in all_evals) / total_n if total_n else 0,
        "avg_confidence": sum(e.confidence_score for e in all_evals) / total_n if total_n else 0,
        "avg_structure": sum(e.structure_score for e in all_evals) / total_n if total_n else 0,
        "best_type": max(scorecards, key=lambda s: s["total_score"] or 0)["type"] if scorecards else None,
        "worst_type": min(scorecards, key=lambda s: s["total_score"] or 10)["type"] if scorecards else None,
    }

    return {"interviews": scorecards, "totals": totals}
