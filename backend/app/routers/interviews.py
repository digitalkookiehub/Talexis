import logging

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_student
from app.models.user import User
from app.schemas.interview import (
    InterviewCreate, InterviewResponse, QuestionResponse,
    AnswerSubmit, AnswerResponse, InterviewHistoryResponse,
)
from app.services.interview_service import (
    start_interview, get_interview, generate_question,
    submit_answer, complete_interview, get_interview_history,
    get_active_interview, abandon_interview,
)
from app.services.student_service import get_or_create_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interviews", tags=["interviews"])


# IMPORTANT: Static routes MUST be defined before dynamic /{interview_id} routes
# Otherwise FastAPI tries to parse "history" / "active" as an interview_id → 422


@router.post("/start", response_model=InterviewResponse, status_code=201)
async def start(
    req: InterviewCreate,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InterviewResponse:
    from app.services.subscription_service import check_limit, increment_usage
    check_limit(db, user.id, "interview")
    if req.difficulty_level.value == "intermediate":
        check_limit(db, user.id, "difficulty_intermediate")
    elif req.difficulty_level.value == "advanced":
        check_limit(db, user.id, "difficulty_advanced")

    profile = get_or_create_profile(db, user)
    interview = start_interview(
        db, profile, req.interview_type, req.difficulty_level, req.target_questions,
        target_role=req.target_role, target_industry=req.target_industry,
    )
    increment_usage(db, user.id, "interview")
    return InterviewResponse.model_validate(interview)


@router.get("/active", response_model=InterviewResponse | None)
async def active(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InterviewResponse | None:
    """Find any in-progress interview to resume."""
    profile = get_or_create_profile(db, user)
    interview = get_active_interview(db, profile.id)
    if interview is None:
        return None
    return InterviewResponse.model_validate(interview)


@router.get("/history", response_model=InterviewHistoryResponse)
async def history(
    skip: int = 0,
    limit: int = 20,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    interviews, total = get_interview_history(db, profile.id, skip, limit)
    return {
        "interviews": [InterviewResponse.model_validate(i) for i in interviews],
        "total": total,
    }


@router.get("/attempts")
async def attempts(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    """Get remaining attempts and unlock status per interview type and difficulty."""
    from app.models.interview_attempt import InterviewAttempt
    from app.models.interview import Interview
    from app.models.enums import InterviewStatus, InterviewType, DifficultyLevel
    from app.services.interview_service import ATTEMPT_LIMITS, UNLOCK_THRESHOLDS

    profile = get_or_create_profile(db, user)
    records = db.query(InterviewAttempt).filter(InterviewAttempt.student_id == profile.id).all()

    # Build attempt map: type -> difficulty -> {used, max, remaining}
    attempt_map: dict = {}
    for r in records:
        key = r.interview_type.value
        diff = r.difficulty_level or "basic"
        if key not in attempt_map:
            attempt_map[key] = {}
        max_a = ATTEMPT_LIMITS.get(diff, 5)
        attempt_map[key][diff] = {
            "used": r.attempt_number,
            "max": max_a if max_a > 0 else "unlimited",
            "remaining": "unlimited" if max_a == 0 else max(0, max_a - r.attempt_number),
        }

    # Check unlock status for each type + difficulty
    unlocks: dict = {}
    for itype in InterviewType:
        unlocks[itype.value] = {}
        for diff in ["basic", "intermediate", "advanced"]:
            unlock = UNLOCK_THRESHOLDS.get(diff)
            if not unlock:
                unlocks[itype.value][diff] = {"unlocked": True, "reason": None}
                continue
            required_diff = unlock["requires"]
            min_score = unlock["min_score"]
            best = (
                db.query(Interview)
                .filter(
                    Interview.student_id == profile.id,
                    Interview.interview_type == itype,
                    Interview.difficulty_level == DifficultyLevel(required_diff),
                    Interview.status == InterviewStatus.evaluated,
                    Interview.total_score.isnot(None),
                )
                .order_by(Interview.total_score.desc())
                .first()
            )
            best_score = best.total_score if best else 0
            unlocked = (best_score or 0) >= min_score
            unlocks[itype.value][diff] = {
                "unlocked": unlocked,
                "best_score": round(best_score or 0, 1),
                "required_score": min_score,
                "reason": None if unlocked else f"Score {min_score}/10 on {required_diff} first",
            }

    return {"attempts": attempt_map, "unlocks": unlocks}


@router.get("/company-schedules")
async def my_company_schedules(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list:
    """Candidate sees company interviews scheduled for them."""
    from app.models.scheduled_interview import ScheduledInterview as SI
    from app.models.talent_profile import TalentProfile
    from app.models.company import Company

    profile = get_or_create_profile(db, user)
    talent = db.query(TalentProfile).filter(TalentProfile.student_id == profile.id).first()
    if not talent:
        return []

    schedules = (
        db.query(SI)
        .filter(SI.talent_profile_id == talent.id)
        .order_by(SI.scheduled_at.desc())
        .limit(20)
        .all()
    )

    result = []
    for s in schedules:
        company = db.query(Company).filter(Company.id == s.company_id).first()
        result.append({
            "id": s.id,
            "company_name": company.company_name if company else "Unknown",
            "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
            "duration_minutes": s.duration_minutes,
            "interview_type": s.interview_type,
            "interviewer_name": s.interviewer_name,
            "meeting_link": s.meeting_link,
            "status": s.status.value,
            "college_approval": s.college_approval.value if s.college_approval else "not_required",
            "notes": s.notes,
        })
    return result


# Dynamic ID routes below


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_details(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InterviewResponse:
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    return InterviewResponse.model_validate(interview)


@router.post("/{interview_id}/questions/generate", response_model=QuestionResponse)
async def gen_question(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> QuestionResponse:
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    question = await generate_question(db, interview)
    return QuestionResponse.model_validate(question)


@router.get("/{interview_id}/questions", response_model=list[QuestionResponse])
async def list_questions(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> list:
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    return [QuestionResponse.model_validate(q) for q in interview.questions]


@router.post("/{interview_id}/answers", response_model=AnswerResponse, status_code=201)
async def submit(
    interview_id: int,
    question_id: int,
    req: AnswerSubmit,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> AnswerResponse:
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    answer = submit_answer(
        db, interview, question_id, req.answer_text,
        response_time_seconds=req.response_time_seconds,
    )
    return AnswerResponse.model_validate(answer)


@router.post("/{interview_id}/complete", response_model=InterviewResponse)
async def complete(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InterviewResponse:
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    completed = await complete_interview(db, interview)
    return InterviewResponse.model_validate(completed)


@router.delete("/{interview_id}", status_code=204)
async def abandon(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> None:
    """Discard an in-progress interview entirely."""
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    abandon_interview(db, interview)


@router.post("/{interview_id}/transcribe")
async def transcribe_audio(
    interview_id: int,
    file: UploadFile = File(...),
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    """Transcribe an audio recording to text using Whisper. Doesn't save it as an answer."""
    profile = get_or_create_profile(db, user)
    get_interview(db, interview_id, profile.id)  # Verify ownership

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        from app.services.whisper_service import whisper_service
        result = whisper_service.transcribe_bytes(content, file.filename or "audio.webm")
        return result
    except Exception as e:
        logger.error("Transcription failed: %s", repr(e))
        raise HTTPException(status_code=500, detail=f"Transcription failed: {type(e).__name__}: {str(e)}")
