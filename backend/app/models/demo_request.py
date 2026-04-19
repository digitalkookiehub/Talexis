from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
import enum

from app.database import Base


class DemoStatus(str, enum.Enum):
    pending = "pending"
    contacted = "contacted"
    converted = "converted"
    rejected = "rejected"


class DemoRequest(Base):
    __tablename__ = "demo_requests"

    id = Column(Integer, primary_key=True, index=True)
    contact_name = Column(String(200), nullable=False)
    company_name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(SAEnum(DemoStatus), nullable=False, default=DemoStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
