from sqlalchemy import Column, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import LearningStatus


class StudentLearningProgress(Base):
    __tablename__ = "student_learning_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Integer, ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(LearningStatus), default=LearningStatus.not_started, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("StudentProfile", back_populates="learning_progress")
    module = relationship("LearningModule", back_populates="progress")
