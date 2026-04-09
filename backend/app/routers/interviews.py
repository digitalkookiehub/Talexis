import logging

from fastapi import APIRouter, Depends
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
)
from app.services.student_service import get_or_create_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.post("/start", response_model=InterviewResponse, status_code=201)
async def start(
    req: InterviewCreate,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InterviewResponse:
    profile = get_or_create_profile(db, user)
    interview = start_interview(db, profile, req.interview_type, req.difficulty_level)
    return InterviewResponse.model_validate(interview)


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
    answer = submit_answer(db, interview, question_id, req.answer_text)
    return AnswerResponse.model_validate(answer)


@router.post("/{interview_id}/complete", response_model=InterviewResponse)
async def complete(
    interview_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> InterviewResponse:
    profile = get_or_create_profile(db, user)
    interview = get_interview(db, interview_id, profile.id)
    completed = complete_interview(db, interview)
    return InterviewResponse.model_validate(completed)


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
