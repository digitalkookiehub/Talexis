from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class CollegeRecommendation(Base):
    __tablename__ = "college_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    college_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_profile_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    college_user = relationship("User")
    student = relationship("StudentProfile")
    company = relationship("Company")
