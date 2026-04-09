from sqlalchemy import Column, Integer, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class AnswerEvaluation(Base):
    __tablename__ = "answer_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("interview_answers.id", ondelete="CASCADE"), nullable=False)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    communication_score = Column(Float, nullable=False)
    technical_score = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    structure_score = Column(Float, nullable=False)
    overall_score = Column(Float, nullable=False)
    feedback_text = Column(Text, nullable=True)
    risk_flags = Column(JSON, default=list)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    improved_answer_suggestion = Column(Text, nullable=True)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now())

    answer = relationship("InterviewAnswer", back_populates="evaluation")
    interview = relationship("Interview", back_populates="evaluations")
