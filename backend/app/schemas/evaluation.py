from pydantic import BaseModel


class EvaluationResponse(BaseModel):
    id: int
    answer_id: int
    interview_id: int
    communication_score: float
    technical_score: float
    confidence_score: float
    structure_score: float
    overall_score: float
    feedback_text: str | None
    strengths: list[str]
    weaknesses: list[str]
    improved_answer_suggestion: str | None
    risk_flags: list[str]

    class Config:
        from_attributes = True


class ScorecardResponse(BaseModel):
    interview_id: int
    interview_type: str
    difficulty: str
    total_score: float | None
    target_role: str | None = None
    target_industry: str | None = None
    duration_seconds: int | None = None
    questions_answered: int | None = 0
    overall_summary: str | None = None
    overall_feedback: str | None = None
    evaluations: list[EvaluationResponse]
    avg_communication: float
    avg_technical: float
    avg_confidence: float
    avg_structure: float


class FeedbackResponse(BaseModel):
    question_text: str
    answer_text: str
    evaluation: EvaluationResponse
