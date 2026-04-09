from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import Recommendation


class PlacementReadiness(Base):
    __tablename__ = "placement_readiness"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    overall_readiness_percent = Column(Float, nullable=False, default=0.0)
    communication_avg = Column(Float, nullable=False, default=0.0)
    technical_avg = Column(Float, nullable=False, default=0.0)
    confidence_avg = Column(Float, nullable=False, default=0.0)
    structure_avg = Column(Float, nullable=False, default=0.0)
    weak_areas = Column(JSON, default=list)
    strong_areas = Column(JSON, default=list)
    recommendation = Column(Enum(Recommendation), nullable=True)
    last_calculated_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("StudentProfile", back_populates="placement_readiness")
