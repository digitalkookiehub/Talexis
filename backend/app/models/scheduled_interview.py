from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base
from app.models.base import TimestampMixin


class ScheduleStatus(str, enum.Enum):
    scheduled = "scheduled"
    rescheduled = "rescheduled"
    completed = "completed"
    cancelled = "cancelled"


class CandidateType(str, enum.Enum):
    platform = "platform"
    external = "external"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    declined = "declined"
    not_required = "not_required"  # For external candidates


class InterviewOutcome(str, enum.Enum):
    hire = "hire"
    next_round = "next_round"
    reject = "reject"


class ScheduledInterview(Base, TimestampMixin):
    __tablename__ = "scheduled_interviews"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    job_role_id = Column(Integer, ForeignKey("job_roles.id", ondelete="SET NULL"), nullable=True)

    # Candidate info
    candidate_type = Column(SAEnum(CandidateType), nullable=False, default=CandidateType.platform)
    talent_profile_id = Column(Integer, ForeignKey("talent_profiles.id", ondelete="SET NULL"), nullable=True)
    candidate_name = Column(String(200), nullable=False)
    candidate_email = Column(String(255), nullable=True)
    candidate_phone = Column(String(50), nullable=True)

    # Schedule details
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    interview_type = Column(String(50), nullable=True)
    interviewer_name = Column(String(200), nullable=True)
    meeting_link = Column(String(500), nullable=True)

    # Status
    status = Column(SAEnum(ScheduleStatus), nullable=False, default=ScheduleStatus.scheduled)
    notes = Column(Text, nullable=True)
    reschedule_reason = Column(Text, nullable=True)

    # College approval (for platform candidates)
    college_approval = Column(SAEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.pending)
    college_decline_reason = Column(Text, nullable=True)

    # Post-interview feedback (filled by company after completion)
    feedback_rating = Column(Integer, nullable=True)  # 1-5
    feedback_notes = Column(Text, nullable=True)
    feedback_outcome = Column(SAEnum(InterviewOutcome), nullable=True)

    # Relationships
    company = relationship("Company")
    job_role = relationship("JobRole")
    talent_profile = relationship("TalentProfile")
