from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class InterviewQuestion(Base, TimestampMixin):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=True)
    difficulty = Column(String(50), nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    expected_topics = Column(JSON, default=list)

    interview = relationship("Interview", back_populates="questions")
    answers = relationship("InterviewAnswer", back_populates="question", cascade="all, delete-orphan")
