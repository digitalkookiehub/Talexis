from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.enums import JobStatus


class JobRole(Base, TimestampMixin):
    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    required_skills = Column(JSON, default=list)
    min_readiness_score = Column(Float, nullable=True)
    interview_types_required = Column(JSON, default=list)
    status = Column(Enum(JobStatus), default=JobStatus.draft, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", back_populates="job_roles")
    match_results = relationship("MatchResult", back_populates="job_role", cascade="all, delete-orphan")
