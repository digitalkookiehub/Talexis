from datetime import datetime

from pydantic import BaseModel

from app.models.enums import JobStatus


class CompanyProfileCreate(BaseModel):
    company_name: str
    industry: str | None = None
    size: str | None = None
    website: str | None = None
    description: str | None = None


class CompanyProfileUpdate(BaseModel):
    company_name: str | None = None
    industry: str | None = None
    size: str | None = None
    website: str | None = None
    description: str | None = None


class CompanyProfileResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    industry: str | None
    size: str | None
    website: str | None
    description: str | None

    class Config:
        from_attributes = True


class JobRoleCreate(BaseModel):
    title: str
    description: str | None = None
    required_skills: list[str] = []
    min_readiness_score: float | None = None
    interview_types_required: list[str] = []


class JobRoleUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    required_skills: list[str] | None = None
    min_readiness_score: float | None = None
    status: JobStatus | None = None


class JobRoleResponse(BaseModel):
    id: int
    company_id: int
    title: str
    description: str | None
    required_skills: list[str]
    min_readiness_score: float | None
    status: JobStatus
    created_at: datetime | None = None

    class Config:
        from_attributes = True
