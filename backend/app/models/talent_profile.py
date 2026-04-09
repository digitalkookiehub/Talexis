from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import Recommendation


class TalentProfile(Base):
    __tablename__ = "talent_profiles"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    candidate_code = Column(String(50), unique=True, nullable=False, index=True)
    is_visible = Column(Boolean, default=False)
    consent_given = Column(Boolean, default=False)
    consent_date = Column(DateTime(timezone=True), nullable=True)
    skill_scores = Column(JSON, default=dict)
    role_fit_scores = Column(JSON, default=dict)
    recommendation = Column(Enum(Recommendation), nullable=True)
    risk_indicators = Column(JSON, default=list)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("StudentProfile", back_populates="talent_profile")
    shortlists = relationship("CompanyShortlist", back_populates="talent_profile", cascade="all, delete-orphan")
    match_results = relationship("MatchResult", back_populates="talent_profile", cascade="all, delete-orphan")
