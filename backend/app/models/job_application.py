from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class ApplicationStatus(str, enum.Enum):
    applied = "applied"
    reviewed = "reviewed"
    shortlisted = "shortlisted"
    rejected = "rejected"


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    job_role_id = Column(Integer, ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.applied)
    message = Column(Text, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("StudentProfile")
    job_role = relationship("JobRole")
