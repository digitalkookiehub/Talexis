from sqlalchemy import Column, Integer, Float, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import AntiCheatFlagType, Severity


class AntiCheatLog(Base):
    __tablename__ = "anti_cheat_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    interview_id = Column(Integer, ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    flag_type = Column(Enum(AntiCheatFlagType), nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    details = Column(JSON, default=dict)
    flagged_at = Column(DateTime(timezone=True), server_default=func.now())


class AnswerSimilarity(Base):
    __tablename__ = "answer_similarities"

    id = Column(Integer, primary_key=True, index=True)
    answer_id_1 = Column(Integer, ForeignKey("interview_answers.id", ondelete="CASCADE"), nullable=False)
    answer_id_2 = Column(Integer, ForeignKey("interview_answers.id", ondelete="CASCADE"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    flagged = Column(Boolean, default=False)
