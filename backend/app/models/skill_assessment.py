from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SkillAssessment(Base):
    __tablename__ = "skill_assessments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)
    assessed_at = Column(DateTime(timezone=True), server_default=func.now())
    assessment_type = Column(String(50), nullable=True)

    student = relationship("StudentProfile", back_populates="skill_assessments")
