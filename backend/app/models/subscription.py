from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# Plan limits are stored as JSON for flexibility
# Example: {"interviews_per_month": 3, "talent_browse_per_month": 0, "shortlists_per_month": 0, ...}
# 0 = feature disabled, -1 = unlimited

DEFAULT_PLANS = {
    "free": {
        "name": "Free",
        "price_inr": 0,
        "billing": "forever",
        "limits": {
            "interviews_per_month": 3,
            "difficulty_max": "basic",
            "talent_visible": False,
            "resume_screens": 1,
            "job_board_access": False,
        },
    },
    "pro_candidate": {
        "name": "Pro Candidate",
        "price_inr": 399,
        "billing": "monthly",
        "limits": {
            "interviews_per_month": -1,
            "difficulty_max": "advanced",
            "talent_visible": True,
            "resume_screens": -1,
            "job_board_access": True,
        },
    },
    "college": {
        "name": "College Plan",
        "price_inr": 149,
        "billing": "per_student_yearly",
        "limits": {
            "interviews_per_month": -1,
            "difficulty_max": "advanced",
            "talent_visible": True,
            "resume_screens": -1,
            "job_board_access": True,
        },
    },
    "company_starter": {
        "name": "Company Starter",
        "price_inr": 7999,
        "billing": "monthly",
        "limits": {
            "talent_browse_per_month": 50,
            "shortlists_per_month": 5,
            "schedules_per_month": 3,
            "job_postings": 2,
            "matching": False,
            "csv_export": False,
            "comparison": False,
        },
    },
    "company_growth": {
        "name": "Company Growth",
        "price_inr": 24999,
        "billing": "monthly",
        "limits": {
            "talent_browse_per_month": -1,
            "shortlists_per_month": -1,
            "schedules_per_month": 20,
            "job_postings": 10,
            "matching": True,
            "csv_export": True,
            "comparison": True,
        },
    },
    "company_enterprise": {
        "name": "Enterprise",
        "price_inr": 0,
        "billing": "custom",
        "limits": {
            "talent_browse_per_month": -1,
            "shortlists_per_month": -1,
            "schedules_per_month": -1,
            "job_postings": -1,
            "matching": True,
            "csv_export": True,
            "comparison": True,
        },
    },
}


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    plan_key = Column(String(50), nullable=False, default="free")
    valid_until = Column(DateTime(timezone=True), nullable=True)  # null = no expiry (free plan)

    # Monthly usage counters (reset on 1st of each month)
    usage_month = Column(String(7), nullable=True)  # "2026-04" format
    interviews_used = Column(Integer, nullable=False, default=0)
    talent_browses_used = Column(Integer, nullable=False, default=0)
    shortlists_used = Column(Integer, nullable=False, default=0)
    schedules_used = Column(Integer, nullable=False, default=0)
    resume_screens_used = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
