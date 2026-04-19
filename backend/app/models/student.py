from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class StudentProfile(Base, TimestampMixin):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    branch = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    college_name = Column(String(200), nullable=True)
    graduation_year = Column(Integer, nullable=True)
    skills = Column(JSON, default=list)
    interests = Column(JSON, default=list)
    bio = Column(Text, nullable=True)
    profile_picture_url = Column(String(500), nullable=True)
    resume_url = Column(String(500), nullable=True)
    parsed_resume = Column(JSON, nullable=True)
    baseline_score = Column(Float, nullable=True)

    # Experience & portfolio (for experienced/external candidates)
    experience_level = Column(String(50), nullable=True)  # fresher, junior, mid, senior
    years_of_experience = Column(Integer, nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    preferred_roles = Column(JSON, default=list)
    preferred_locations = Column(JSON, default=list)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    interviews = relationship("Interview", back_populates="student", cascade="all, delete-orphan")
    skill_assessments = relationship("SkillAssessment", back_populates="student", cascade="all, delete-orphan")
    placement_readiness = relationship(
        "PlacementReadiness", back_populates="student", uselist=False, cascade="all, delete-orphan"
    )
    talent_profile = relationship(
        "TalentProfile", back_populates="student", uselist=False, cascade="all, delete-orphan"
    )
    learning_progress = relationship("StudentLearningProgress", back_populates="student", cascade="all, delete-orphan")
    interview_attempts = relationship("InterviewAttempt", back_populates="student", cascade="all, delete-orphan")
    readiness_history = relationship("ReadinessHistory", back_populates="student", cascade="all, delete-orphan")
