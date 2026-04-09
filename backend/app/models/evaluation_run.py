from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    run_number = Column(Integer, nullable=False)
    variance_score = Column(Float, nullable=True)
    is_consistent = Column(Boolean, default=True)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="evaluation_runs")
