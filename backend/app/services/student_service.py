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


def _fallback_parse_resume(resume_text: str) -> dict:
    """Rule-based fallback when no LLM is available. Extracts basic info via patterns."""
    import re

    lines = resume_text.strip().split("\n")
    lines = [l.strip() for l in lines if l.strip()]

    result: dict = {
        "full_name": None,
        "email": None,
        "phone": None,
        "education": [],
        "skills": [],
        "experience": [],
        "projects": [],
        "certifications": [],
        "languages": [],
        "summary": None,
        "_parsed_via": "fallback",
    }

    # Extract email
    email_match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", resume_text)
    if email_match:
        result["email"] = email_match.group()

    # Extract phone
    phone_match = re.search(r"[\+]?[\d\s\-\(\)]{7,15}", resume_text)
    if phone_match:
        candidate = phone_match.group().strip()
        digits = re.sub(r"\D", "", candidate)
        if len(digits) >= 7:
            result["phone"] = candidate

    # First non-empty line that isn't an email/phone is likely the name
    for line in lines[:5]:
        if "@" not in line and not re.match(r"^[\d\+\(\)\-\s]{7,}$", line):
            clean = re.sub(r"[^a-zA-Z\s\.]", "", line).strip()
            if clean and len(clean.split()) <= 5:
                result["full_name"] = clean
                break

    # Extract skills — look for common section headers
    text_lower = resume_text.lower()
    skill_section = ""
    for header in ["skills", "technical skills", "key skills", "core competencies", "tools & technologies"]:
        idx = text_lower.find(header)
        if idx >= 0:
            # Grab text after the header until next likely section
            after = resume_text[idx + len(header):]
            # Take until next section-like header (line starting with caps word + colon)
            section_end = re.search(r"\n[A-Z][a-zA-Z\s]{2,}[:\n]", after)
            skill_section = after[:section_end.start()] if section_end else after[:500]
            break

    if skill_section:
        # Split by commas, pipes, bullets, newlines
        raw_skills = re.split(r"[,|\n•·\-\*]", skill_section)
        for s in raw_skills:
            clean = s.strip().strip(":").strip()
            if clean and 2 <= len(clean) <= 50 and not clean[0].isdigit():
                result["skills"].append(clean)
        result["skills"] = result["skills"][:20]

    # Extract experience — look for patterns like "Title at Company" or "Title - Company"
    for header in ["experience", "work experience", "employment", "professional experience"]:
        idx = text_lower.find(header)
        if idx >= 0:
            after = resume_text[idx + len(header):]
            section_end = re.search(r"\n[A-Z][a-zA-Z\s]{2,}[:\n]", after)
            exp_section = after[:section_end.start()] if section_end else after[:1000]
            # Try to find "Title at/- Company" patterns
            exp_matches = re.findall(
                r"([A-Z][a-zA-Z\s&]+?)(?:\s+at\s+|\s*[-–|]\s*)([A-Z][a-zA-Z\s&,.]+)",
                exp_section,
            )
            for title, company in exp_matches[:5]:
                result["experience"].append({
                    "title": title.strip(),
                    "company": company.strip().rstrip(",. "),
                    "duration": None,
                    "description": "",
                })
            break

    # Extract education
    for header in ["education", "academic", "qualifications"]:
        idx = text_lower.find(header)
        if idx >= 0:
            after = resume_text[idx + len(header):]
            section_end = re.search(r"\n[A-Z][a-zA-Z\s]{2,}[:\n]", after)
            edu_section = after[:section_end.start()] if section_end else after[:600]
            # Look for degree patterns
            degree_patterns = [
                r"((?:B\.?(?:Tech|Sc|A|E|Ed|Com)|M\.?(?:Tech|Sc|A|E|Ed|Com|BA)|PhD|Diploma|Certificate)[^,\n]{0,80})",
                r"((?:Bachelor|Master|Doctor|Associate)[^,\n]{0,80})",
            ]
            for pattern in degree_patterns:
                matches = re.findall(pattern, edu_section, re.IGNORECASE)
                for match in matches[:3]:
                    result["education"].append({
                        "degree": match.strip(),
                        "institution": None,
                        "year": None,
                        "gpa": None,
                    })
            break

    # Summary: first substantial paragraph (>50 chars) that isn't a heading
    for line in lines:
        if len(line) > 50 and not line.endswith(":") and "@" not in line:
            result["summary"] = line[:300]
            break

    return result


async def parse_resume(db: Session, profile: StudentProfile) -> dict:
    if not profile.resume_url:
        raise NotFoundError("Resume not uploaded yet")

    # Extract text using format-aware extractor (PDF, DOCX, TXT)
    resume_text = extract_text_from_file(profile.resume_url)
    if not resume_text or len(resume_text.strip()) < 10:
        return {"error": "Could not extract meaningful text from the resume."}

    logger.info("Extracted %d chars from %s", len(resume_text), profile.resume_url)

    prompt = RESUME_PARSING_PROMPT.format(resume_text=resume_text[:4000])
    parsed = None

    # Try local LLM (Ollama)
    try:
        response = await local_llm.generate(prompt, system=RESUME_PARSING_SYSTEM)
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(response[start:end])
        else:
            parsed = json.loads(response)
        logger.info("Resume parsed via local LLM for student %s", profile.id)
        # Track token usage for resume parsing (Ollama)
        try:
            from app.services.tracking_service import log_token_usage
            log_token_usage(
                db, user_id=profile.id, action="resume_parse",
                provider="ollama", model="local",
                prompt_tokens=len(prompt.split()), completion_tokens=len(response.split()),
            )
        except Exception:
            pass
    except Exception as local_err:
        logger.warning("Local LLM resume parsing failed: %s", repr(local_err))

    # Fallback to cloud LLM
    if parsed is None and settings.OPENAI_API_KEY:
        try:
            parsed = await cloud_llm.evaluate(prompt, system=RESUME_PARSING_SYSTEM)
            logger.info("Resume parsed via OpenAI fallback for student %s", profile.id)
            # Track token usage for resume parsing (OpenAI)
            try:
                from app.services.tracking_service import log_token_usage
                from app.services.llm.cloud_llm import get_last_usage
                usage = get_last_usage()
                if usage.get("total_tokens", 0) > 0:
                    log_token_usage(
                        db, user_id=profile.id, action="resume_parse",
                        provider="openai", model=settings.OPENAI_MODEL,
                        prompt_tokens=usage["prompt_tokens"], completion_tokens=usage["completion_tokens"],
                    )
            except Exception:
                pass
        except Exception as cloud_err:
            logger.warning("Cloud LLM resume parsing also failed: %s", repr(cloud_err))

    # Final fallback: rule-based extraction
    if parsed is None:
        logger.info("Using fallback rule-based resume parser for student %s", profile.id)
        parsed = _fallback_parse_resume(resume_text)

    profile.parsed_resume = parsed
    if isinstance(parsed.get("skills"), list):
        profile.skills = parsed["skills"]
    db.commit()
    db.refresh(profile)
    return parsed


def get_skill_assessments(db: Session, student_id: int) -> list[SkillAssessment]:
    return db.query(SkillAssessment).filter(SkillAssessment.student_id == student_id).all()


def build_interview_suggestions(profile: StudentProfile) -> dict:
    """Derive target role and industry suggestions from a student's profile and resume.

    Returns only options relevant to this student's background — a Montessori teacher
    should see 'Early Childhood Educator', not 'Software Engineer'.
    """
    roles: list[str] = []
    industries: list[str] = []

    # --- Extract from parsed resume ---
    resume = profile.parsed_resume or {}

    # Job titles from experience
    experience = resume.get("experience")
    if isinstance(experience, list):
        for exp in experience:
            if isinstance(exp, dict):
                title = exp.get("title")
                if isinstance(title, str) and title.strip():
                    roles.append(title.strip())
                # Company names can hint at industry
                company = exp.get("company")
                if isinstance(company, str) and company.strip():
                    industries.append(company.strip())

    # Education can suggest roles
    education = resume.get("education")
    if isinstance(education, list):
        for edu in education:
            if isinstance(edu, dict):
                degree = edu.get("degree")
                if isinstance(degree, str) and degree.strip():
                    # Turn "B.Ed in Early Childhood Education" into a role suggestion
                    roles.append(degree.strip())

    # Projects can suggest technical focus
    projects = resume.get("projects")
    if isinstance(projects, list):
        for proj in projects:
            if isinstance(proj, dict):
                name = proj.get("name")
                if isinstance(name, str) and name.strip():
                    roles.append(f"{name.strip()} Developer")
                techs = proj.get("technologies")
                if isinstance(techs, list):
                    for tech in techs[:3]:
                        if isinstance(tech, str) and tech.strip():
                            roles.append(f"{tech.strip()} Developer")

    # Resume summary can provide context
    summary = resume.get("summary")
    if isinstance(summary, str) and summary.strip():
        # Use summary as a hint but don't add it directly as an option
        pass

    # Skills from resume
    resume_skills = resume.get("skills")
    if isinstance(resume_skills, list):
        for skill in resume_skills[:10]:
            if isinstance(skill, str) and skill.strip():
                roles.append(f"{skill.strip()} Specialist")

    # --- Extract from profile fields ---
    if profile.skills and isinstance(profile.skills, list):
        for skill in profile.skills[:10]:
            if isinstance(skill, str) and skill.strip():
                roles.append(f"{skill.strip()} Specialist")

    if profile.interests and isinstance(profile.interests, list):
        for interest in profile.interests:
            if isinstance(interest, str) and interest.strip():
                industries.append(interest.strip())

    if profile.department and isinstance(profile.department, str) and profile.department.strip():
        industries.append(profile.department.strip())
        roles.append(f"{profile.department.strip()} Professional")

    if profile.branch and isinstance(profile.branch, str) and profile.branch.strip():
        industries.append(profile.branch.strip())
        roles.append(f"{profile.branch.strip()} Graduate")

    if profile.bio and isinstance(profile.bio, str) and profile.bio.strip():
        # Don't add bio as an option, but it confirms we have a profile
        pass

    # --- Deduplicate and clean ---
    def dedupe(items: list[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for item in items:
            clean = item.strip()
            if not clean or len(clean) < 2:
                continue
            key = clean.lower()
            if key not in seen:
                seen.add(key)
                result.append(clean)
        return result

    roles = dedupe(roles)
    industries = dedupe(industries)

    has_profile = bool(roles or industries)

    return {
        "roles": roles,
        "industries": industries,
        "has_profile_data": has_profile,
    }


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
