import json
import logging
import os
import uuid

from sqlalchemy.orm import Session

from app.config import settings
from app.models.student import StudentProfile
from app.models.skill_assessment import SkillAssessment
from app.models.user import User
from app.exceptions import NotFoundError, ConflictError
from app.services.llm.local_llm import local_llm
from app.services.llm.prompts import RESUME_PARSING_PROMPT, RESUME_PARSING_SYSTEM

logger = logging.getLogger(__name__)


def get_or_create_profile(db: Session, user: User) -> StudentProfile:
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def create_profile(
    db: Session, user: User, branch: str | None, department: str | None,
    college_name: str | None, graduation_year: int | None,
    skills: list[str], interests: list[str], bio: str | None,
) -> StudentProfile:
    existing = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if existing:
        raise ConflictError("Student profile already exists")

    profile = StudentProfile(
        user_id=user.id,
        branch=branch,
        department=department,
        college_name=college_name,
        graduation_year=graduation_year,
        skills=skills,
        interests=interests,
        bio=bio,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_profile(db: Session, profile: StudentProfile, **kwargs: object) -> StudentProfile:
    for key, value in kwargs.items():
        if value is not None and hasattr(profile, key):
            setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


async def save_resume(db: Session, profile: StudentProfile, file_content: bytes, filename: str) -> str:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(filename)[1]
    saved_name = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, saved_name)
    with open(filepath, "wb") as f:
        f.write(file_content)
    profile.resume_url = filepath
    db.commit()
    db.refresh(profile)
    logger.info("Resume saved for student %s: %s", profile.id, filepath)
    return filepath


async def parse_resume(db: Session, profile: StudentProfile) -> dict:
    if not profile.resume_url:
        raise NotFoundError("Resume not uploaded yet")

    # Read resume text (simple text extraction for MVP)
    with open(profile.resume_url, "rb") as f:
        resume_bytes = f.read()

    resume_text = resume_bytes.decode("utf-8", errors="ignore")
    prompt = RESUME_PARSING_PROMPT.format(resume_text=resume_text[:4000])

    try:
        response = await local_llm.generate(prompt, system=RESUME_PARSING_SYSTEM)
        parsed = json.loads(response)
    except (json.JSONDecodeError, Exception) as e:
        logger.error("Resume parsing failed: %s", str(e))
        parsed = {"error": "Failed to parse resume", "raw_text": resume_text[:1000]}

    profile.parsed_resume = parsed
    if isinstance(parsed.get("skills"), list):
        profile.skills = parsed["skills"]
    db.commit()
    db.refresh(profile)
    return parsed


def get_skill_assessments(db: Session, student_id: int) -> list[SkillAssessment]:
    return db.query(SkillAssessment).filter(SkillAssessment.student_id == student_id).all()
