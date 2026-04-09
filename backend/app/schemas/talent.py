from datetime import datetime

from pydantic import BaseModel

from app.models.enums import Recommendation, ShortlistStatus


class TalentProfileResponse(BaseModel):
    id: int
    candidate_code: str
    is_visible: bool
    skill_scores: dict
    role_fit_scores: dict
    recommendation: Recommendation | None
    risk_indicators: list[str]

    class Config:
        from_attributes = True


class TalentListResponse(BaseModel):
    talents: list[TalentProfileResponse]
    total: int


class ShortlistCreate(BaseModel):
    notes: str | None = None


class ShortlistResponse(BaseModel):
    id: int
    company_id: int
    talent_profile_id: int
    shortlisted_at: datetime | None
    notes: str | None
    status: ShortlistStatus

    class Config:
        from_attributes = True


class ShortlistStatusUpdate(BaseModel):
    status: ShortlistStatus


class ConsentRequest(BaseModel):
    consent: bool
