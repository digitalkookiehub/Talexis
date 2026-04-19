from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)  # shortlisted, scheduled, approved, declined, interviewed, feedback, hired, recommended
    actor_role = Column(String(50), nullable=False)   # company, college_admin
    actor_name = Column(String(200), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    student_profile_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    college_name = Column(String(200), nullable=True, index=True)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
