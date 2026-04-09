from sqlalchemy import Column, Integer, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import ShortlistStatus


class CompanyShortlist(Base):
    __tablename__ = "company_shortlists"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    talent_profile_id = Column(Integer, ForeignKey("talent_profiles.id", ondelete="CASCADE"), nullable=False)
    shortlisted_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    status = Column(Enum(ShortlistStatus), default=ShortlistStatus.shortlisted, nullable=False)

    company = relationship("Company", back_populates="shortlists")
    talent_profile = relationship("TalentProfile", back_populates="shortlists")
