from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.enums import InterviewType, DifficultyLevel


class InterviewAttempt(Base, TimestampMixin):
    __tablename__ = "interview_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    interview_type = Column(Enum(InterviewType), nullable=False)
    difficulty_level = Column(String(50), nullable=True)  # basic, intermediate, advanced
    attempt_number = Column(Integer, nullable=False, default=1)
    max_attempts = Column(Integer, nullable=False, default=5)

    student = relationship("StudentProfile", back_populates="interview_attempts")
