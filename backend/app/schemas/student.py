from pydantic import BaseModel


class StudentProfileCreate(BaseModel):
    branch: str | None = None
    department: str | None = None
    college_name: str | None = None
    graduation_year: int | None = None
    skills: list[str] = []
    interests: list[str] = []
    bio: str | None = None


class StudentProfileUpdate(BaseModel):
    branch: str | None = None
    department: str | None = None
    college_name: str | None = None
    graduation_year: int | None = None
    skills: list[str] | None = None
    interests: list[str] | None = None
    bio: str | None = None
    experience_level: str | None = None
    years_of_experience: int | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
    preferred_roles: list[str] | None = None
    preferred_locations: list[str] | None = None


class StudentProfileResponse(BaseModel):
    id: int
    user_id: int
    branch: str | None
    department: str | None
    college_name: str | None
    graduation_year: int | None
    skills: list[str]
    interests: list[str]
    bio: str | None
    profile_picture_url: str | None
    resume_url: str | None
    parsed_resume: dict | None
    baseline_score: float | None
    experience_level: str | None = None
    years_of_experience: int | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
    preferred_roles: list[str] = []
    preferred_locations: list[str] = []

    class Config:
        from_attributes = True


class SkillAssessmentResponse(BaseModel):
    id: int
    skill_name: str
    score: float
    assessment_type: str | None

    class Config:
        from_attributes = True


class ParsedResumeResponse(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    education: list[dict] = []
    skills: list[str] = []
    experience: list[dict] = []
    projects: list[dict] = []
    certifications: list[str] = []
    summary: str | None = None
