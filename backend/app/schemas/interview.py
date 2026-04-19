from datetime import datetime

from pydantic import BaseModel

from app.models.enums import InterviewType, DifficultyLevel, InterviewStatus


class InterviewCreate(BaseModel):
    interview_type: InterviewType
    difficulty_level: DifficultyLevel
    target_questions: int = 5
    target_role: str | None = None
    target_industry: str | None = None


class InterviewResponse(BaseModel):
    id: int
    student_id: int
    interview_type: InterviewType
    difficulty_level: DifficultyLevel
    status: InterviewStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    total_score: float | None = None
    target_questions: int = 5
    duration_seconds: int | None = None
    target_role: str | None = None
    target_industry: str | None = None
    overall_summary: str | None = None
    overall_feedback: str | None = None
    questions_answered: int | None = 0
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
    expected_topics: list[str] = []

    class Config:
        from_attributes = True


class AnswerSubmit(BaseModel):
    answer_text: str
    response_time_seconds: float | None = None


class AnswerResponse(BaseModel):
    id: int
    question_id: int
    interview_id: int
    answer_text: str
    word_count: int | None = None
    response_time_seconds: float | None = None
    submitted_at: datetime | None = None

    class Config:
        from_attributes = True


class InterviewHistoryResponse(BaseModel):
    interviews: list[InterviewResponse]
    total: int
