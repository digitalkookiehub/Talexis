from datetime import datetime

from pydantic import BaseModel

from app.models.enums import Recommendation


class ReadinessResponse(BaseModel):
    id: int
    student_id: int
    overall_readiness_percent: float
    communication_avg: float
    technical_avg: float
    confidence_avg: float
    structure_avg: float
    weak_areas: list[str]
    strong_areas: list[str]
    recommendation: Recommendation | None

    class Config:
        from_attributes = True


class ReadinessHistoryItem(BaseModel):
    readiness_percent: float
    calculated_at: datetime | None

    class Config:
        from_attributes = True
