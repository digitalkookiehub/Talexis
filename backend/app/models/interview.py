from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.enums import InterviewType, DifficultyLevel, InterviewStatus


class Interview(Base, TimestampMixin):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interview_type = Column(Enum(InterviewType), nullable=False)
    difficulty_level = Column(Enum(DifficultyLevel), nullable=False)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.pending, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_score = Column(Float, nullable=True)

    student = relationship("StudentProfile", back_populates="interviews")
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")
    answers = relationship("InterviewAnswer", back_populates="interview", cascade="all, delete-orphan")
    evaluations = relationship("AnswerEvaluation", back_populates="interview", cascade="all, delete-orphan")
    evaluation_runs = relationship("EvaluationRun", back_populates="interview", cascade="all, delete-orphan")
