from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey, String, Text
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
    target_questions = Column(Integer, nullable=False, default=5)

    # Enrichment fields
    duration_seconds = Column(Integer, nullable=True)
    target_role = Column(String(200), nullable=True)
    target_industry = Column(String(200), nullable=True)
    overall_summary = Column(Text, nullable=True)
    overall_feedback = Column(Text, nullable=True)
    questions_answered = Column(Integer, nullable=True, default=0)

    student = relationship("StudentProfile", back_populates="interviews")
    questions = relationship("InterviewQuestion", back_populates="interview", cascade="all, delete-orphan")
    answers = relationship("InterviewAnswer", back_populates="interview", cascade="all, delete-orphan")
    evaluations = relationship("AnswerEvaluation", back_populates="interview", cascade="all, delete-orphan")
    evaluation_runs = relationship("EvaluationRun", back_populates="interview", cascade="all, delete-orphan")
