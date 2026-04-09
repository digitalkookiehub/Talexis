from sqlalchemy import Column, Integer, String, Text, Enum, JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.enums import LearningCategory


class LearningModule(Base, TimestampMixin):
    __tablename__ = "learning_modules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    category = Column(Enum(LearningCategory), nullable=False)
    difficulty = Column(String(50), nullable=True)
    content_text = Column(Text, nullable=True)
    content_url = Column(String(500), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    tags = Column(JSON, default=list)

    progress = relationship("StudentLearningProgress", back_populates="module", cascade="all, delete-orphan")
