from datetime import datetime

from pydantic import BaseModel

from app.models.enums import InterviewType, DifficultyLevel, InterviewStatus


class InterviewCreate(BaseModel):
    interview_type: InterviewType
    difficulty_level: DifficultyLevel


class InterviewResponse(BaseModel):
    id: int
    student_id: int
    interview_type: InterviewType
    difficulty_level: DifficultyLevel
    status: InterviewStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    total_score: float | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class QuestionResponse(BaseModel):
    id: int
    interview_id: int
    question_text: str
    question_type: str | None
    difficulty: str | None
    order_index: int

    class Config:
        from_attributes = True


class AnswerSubmit(BaseModel):
    answer_text: str


class AnswerResponse(BaseModel):
    id: int
    question_id: int
    interview_id: int
    answer_text: str
    submitted_at: datetime | None = None

    class Config:
        from_attributes = True


class InterviewHistoryResponse(BaseModel):
    interviews: list[InterviewResponse]
    total: int
