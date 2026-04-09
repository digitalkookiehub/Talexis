from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True, index=True)
    job_role_id = Column(Integer, ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False)
    talent_profile_id = Column(Integer, ForeignKey("talent_profiles.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, nullable=False)
    skill_match_percent = Column(Float, nullable=False)
    readiness_match = Column(Float, nullable=False)
    overall_rank = Column(Integer, nullable=False)
    matched_at = Column(DateTime(timezone=True), server_default=func.now())

    job_role = relationship("JobRole", back_populates="match_results")
    talent_profile = relationship("TalentProfile", back_populates="match_results")
