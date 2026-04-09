from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(200), nullable=False)
    industry = Column(String(100), nullable=True)
    size = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)

    user = relationship("User", back_populates="company")
    job_roles = relationship("JobRole", back_populates="company", cascade="all, delete-orphan")
    shortlists = relationship("CompanyShortlist", back_populates="company", cascade="all, delete-orphan")
