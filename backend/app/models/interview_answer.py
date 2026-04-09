from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    answer_text = Column(Text, nullable=False)
    audio_url = Column(String(500), nullable=True)
    transcribed_text = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("InterviewQuestion", back_populates="answers")
    interview = relationship("Interview", back_populates="answers")
    evaluation = relationship("AnswerEvaluation", back_populates="answer", uselist=False, cascade="all, delete-orphan")
