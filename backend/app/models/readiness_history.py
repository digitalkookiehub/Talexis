from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ReadinessHistory(Base):
    __tablename__ = "readiness_history"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    readiness_percent = Column(Float, nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("StudentProfile", back_populates="readiness_history")
