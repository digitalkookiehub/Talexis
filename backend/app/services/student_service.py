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
from app.config import settings
from app.services.llm.local_llm import local_llm
from app.services.llm.cloud_llm import cloud_llm
from app.services.llm.prompts import (
    RESUME_PARSING_PROMPT, RESUME_PARSING_SYSTEM,
    RESUME_SCREENING_PROMPT, RESUME_SCREENING_SYSTEM,
)
from app.services.resume_extractor import extract_text_from_file

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

    # Delete old resume file if it exists
    if profile.resume_url and os.path.exists(profile.resume_url):
        try:
            os.remove(profile.resume_url)
            logger.info("Deleted old resume: %s", profile.resume_url)
        except OSError as e:
            logger.warning("Could not delete old resume: %s", str(e))

    ext = os.path.splitext(filename)[1]
    saved_name = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, saved_name)
    with open(filepath, "wb") as f:
        f.write(file_content)

    # Update profile: new resume URL, clear stale parsed data
    profile.resume_url = filepath
    profile.parsed_resume = None  # Clear old parsed data — needs re-parsing
    db.commit()
    db.refresh(profile)
    logger.info("Resume saved for student %s: %s", profile.id, filepath)
    return filepath


async def parse_resume(db: Session, profile: StudentProfile) -> dict:
    if not profile.resume_url:
        raise NotFoundError("Resume not uploaded yet")

    # Extract text using format-aware extractor (PDF, DOCX, TXT)
    resume_text = extract_text_from_file(profile.resume_url)
    if not resume_text or len(resume_text.strip()) < 10:
        return {"error": "Could not extract meaningful text from the resume."}

    logger.info("Extracted %d chars from %s", len(resume_text), profile.resume_url)

    prompt = RESUME_PARSING_PROMPT.format(resume_text=resume_text[:4000])

    try:
        response = await local_llm.generate(prompt, system=RESUME_PARSING_SYSTEM)
        # Try to find JSON in response (LLMs sometimes add prose)
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(response[start:end])
        else:
            parsed = json.loads(response)
    except (json.JSONDecodeError, Exception) as e:
        logger.error("Resume parsing failed: %s", str(e))
        parsed = {
            "error": "Failed to parse resume with AI",
            "raw_text_preview": resume_text[:500],
            "extraction_success": True,
        }

    profile.parsed_resume = parsed
    if isinstance(parsed.get("skills"), list):
        profile.skills = parsed["skills"]
    db.commit()
    db.refresh(profile)
    return parsed


def get_skill_assessments(db: Session, student_id: int) -> list[SkillAssessment]:
    return db.query(SkillAssessment).filter(SkillAssessment.student_id == student_id).all()


async def screen_resume(db: Session, profile: StudentProfile) -> dict:
    """AI-powered resume screening with score and improvement suggestions."""
    if not profile.parsed_resume or "error" in (profile.parsed_resume or {}):
        raise NotFoundError("Resume not parsed yet — parse it first")

    parsed_str = json.dumps(profile.parsed_resume, indent=2)
    prompt = RESUME_SCREENING_PROMPT.format(
        parsed_resume=parsed_str[:3000],
        branch=profile.branch or "Not specified",
        college=profile.college_name or "Not specified",
        graduation_year=profile.graduation_year or "Not specified",
    )

    result: dict | None = None
    used_provider = "local"

    # Try local LLM first (Ollama)
    try:
        full_prompt = f"{RESUME_SCREENING_SYSTEM}\n\n{prompt}\n\nRespond ONLY with valid JSON."
        raw = await local_llm.generate(full_prompt, timeout=300.0)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(raw[start:end])
        else:
            raise ValueError("No JSON found in local LLM response")
        logger.info("Resume screened via Ollama for student %s", profile.id)
    except Exception as local_err:
        logger.warning("Local LLM screening failed: %s — trying OpenAI fallback", repr(local_err))

        # Fall back to OpenAI
        if settings.OPENAI_API_KEY:
            try:
                result = await cloud_llm.evaluate(prompt, system=RESUME_SCREENING_SYSTEM)
                used_provider = "openai"
                logger.info("Resume screened via OpenAI fallback for student %s", profile.id)
            except Exception as cloud_err:
                logger.error("OpenAI fallback also failed: %s", repr(cloud_err))
                return {
                    "error": "Screening failed on both local and cloud LLMs.",
                    "details": f"Local: {type(local_err).__name__}: {str(local_err) or repr(local_err)} | Cloud: {type(cloud_err).__name__}: {str(cloud_err) or repr(cloud_err)}",
                }
        else:
            return {
                "error": "Local LLM screening failed and no OpenAI key configured for fallback.",
                "details": f"{type(local_err).__name__}: {str(local_err) or repr(local_err)}",
            }

    if result is None:
        return {"error": "Unknown screening failure"}

    # Save the screening to parsed_resume metadata
    try:
        if profile.parsed_resume:
            from sqlalchemy.orm.attributes import flag_modified
            profile.parsed_resume = {**profile.parsed_resume, "_screening": result, "_screening_provider": used_provider}
            flag_modified(profile, "parsed_resume")
            db.commit()
            db.refresh(profile)
    except Exception as save_err:
        logger.warning("Could not save screening result: %s", repr(save_err))

    logger.info("Resume screened for student %s: score=%s, provider=%s", profile.id, result.get("overall_score"), used_provider)
    return result
