import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_company, require_student
from app.models.user import User
from app.models.company import Company
from app.schemas.talent import (
    TalentProfileResponse, TalentListResponse, ShortlistCreate,
    ShortlistResponse, ShortlistStatusUpdate, ConsentRequest,
)
from app.services.talent_service import (
    list_visible_talents, get_talent_by_code, shortlist_candidate,
    remove_from_shortlist, get_company_shortlist,
    update_shortlist_status, update_consent, get_or_create_talent_profile,
)
from app.services.student_service import get_or_create_profile
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/talents", tags=["talents"])


@router.get("")
async def browse_talents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    from app.services.subscription_service import check_limit, increment_usage
    check_limit(db, user.id, "talent_browse")
    increment_usage(db, user.id, "talent_browse")

    talents, total = list_visible_talents(db, skip, limit)
    result = []
    for t in talents:
        # Access student while session is open
        s = t.student
        data = {
            "id": t.id,
            "candidate_code": t.candidate_code,
            "is_visible": t.is_visible,
            "skill_scores": t.skill_scores or {},
            "role_fit_scores": t.role_fit_scores or {},
            "recommendation": t.recommendation.value if t.recommendation else None,
            "risk_indicators": t.risk_indicators or [],
            "college_name": s.college_name if s else None,
            "experience_level": s.experience_level if s else None,
            "years_of_experience": s.years_of_experience if s else None,
        }
        result.append(data)
    return {
        "talents": result,
        "total": total,
    }


# IMPORTANT: All static routes MUST be defined before /{candidate_code}
# Otherwise FastAPI tries to parse "shortlist", "consent", etc. as a candidate code


@router.get("/shortlist", response_model=list[ShortlistResponse])
async def my_shortlist(
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> list:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    items = get_company_shortlist(db, company.id)
    return [ShortlistResponse.model_validate(s) for s in items]


@router.get("/recommendations/received")
async def received_recommendations(
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> list:
    """Get recommendations sent by college admins to this company."""
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    from app.models.college_recommendation import CollegeRecommendation
    from app.models.student import StudentProfile as SP
    recs = db.query(CollegeRecommendation).filter(CollegeRecommendation.company_id == company.id).order_by(CollegeRecommendation.created_at.desc()).all()
    result = []
    for r in recs:
        student = db.query(SP).filter(SP.id == r.student_profile_id).first()
        student_user = db.query(User).filter(User.id == student.user_id).first() if student else None
        college_user = db.query(User).filter(User.id == r.college_user_id).first()
        talent = db.query(TalentProfile).filter(TalentProfile.student_id == r.student_profile_id).first()
        result.append({
            "id": r.id, "student_name": student_user.full_name if student_user else None,
            "student_branch": student.branch if student else None, "student_college": student.college_name if student else None,
            "candidate_code": talent.candidate_code if talent else None, "recommended_by": college_user.full_name if college_user else None,
            "message": r.message, "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@router.get("/consent/status", tags=["students"])
async def consent_status(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    talent = db.query(TalentProfile).filter(TalentProfile.student_id == profile.id).first()
    return {
        "consent_given": talent.consent_given if talent else False,
        "is_visible": talent.is_visible if talent else False,
        "candidate_code": talent.candidate_code if talent else None,
    }


@router.get("/readiness-requirements", tags=["students"])
async def readiness_requirements(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    """Check if student meets minimum requirements for company visibility."""
    from app.models.interview import Interview
    from app.models.readiness import PlacementReadiness
    from app.models.enums import InterviewStatus, DifficultyLevel

    profile = get_or_create_profile(db, user)
    interviews = (
        db.query(Interview)
        .filter(Interview.student_id == profile.id, Interview.status == InterviewStatus.evaluated)
        .all()
    )
    types_completed = set(i.interview_type.value for i in interviews)
    total_evaluated = len(interviews)
    has_intermediate = any(
        i.difficulty_level in (DifficultyLevel.intermediate, DifficultyLevel.advanced) for i in interviews
    )
    readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == profile.id).first()
    readiness_pct = readiness.overall_readiness_percent if readiness else 0

    requirements = [
        {"key": "types", "label": "Complete at least 2 interview types", "met": len(types_completed) >= 2, "detail": f"{len(types_completed)}/2 types ({', '.join(types_completed) or 'none'})"},
        {"key": "total", "label": "Complete at least 3 evaluated interviews", "met": total_evaluated >= 3, "detail": f"{total_evaluated}/3 interviews"},
        {"key": "difficulty", "label": "Complete at least 1 intermediate or advanced interview", "met": has_intermediate, "detail": "Done" if has_intermediate else "Only basic completed"},
        {"key": "readiness", "label": "Readiness score >= 60%", "met": readiness_pct >= 60, "detail": f"{readiness_pct:.0f}%/60%"},
    ]
    return {"requirements": requirements, "all_met": all(r["met"] for r in requirements)}


@router.post("/consent", tags=["students"])
async def grant_consent(
    req: ConsentRequest,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    if req.consent:
        from app.models.interview import Interview
        from app.models.readiness import PlacementReadiness
        from app.models.enums import InterviewStatus, DifficultyLevel

        interviews = db.query(Interview).filter(Interview.student_id == profile.id, Interview.status == InterviewStatus.evaluated).all()
        types_completed = set(i.interview_type.value for i in interviews)
        has_intermediate = any(i.difficulty_level in (DifficultyLevel.intermediate, DifficultyLevel.advanced) for i in interviews)
        readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == profile.id).first()
        readiness_pct = readiness.overall_readiness_percent if readiness else 0

        errors = []
        if len(types_completed) < 2: errors.append("Complete at least 2 different interview types")
        if len(interviews) < 3: errors.append("Complete at least 3 evaluated interviews")
        if not has_intermediate: errors.append("Complete at least 1 intermediate or advanced interview")
        if readiness_pct < 60: errors.append(f"Readiness must be >= 60% (current: {readiness_pct:.0f}%)")
        if errors:
            raise NotFoundError("Requirements not met: " + "; ".join(errors))

    talent = update_consent(db, profile, req.consent)
    return {"message": "Consent updated", "visible": talent.is_visible}


# Dynamic routes below — /{candidate_code} catches everything not matched above

@router.get("/{candidate_code}", response_model=TalentProfileResponse)
async def get_talent(
    candidate_code: str,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> TalentProfileResponse:
    talent = get_talent_by_code(db, candidate_code)
    return TalentProfileResponse.model_validate(talent)


@router.get("/{candidate_code}/detail")
async def get_talent_detail(
    candidate_code: str,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> dict:
    """Get enriched talent profile with interview stats, resume skills, and score trends."""
    from app.models.interview import Interview
    from app.models.evaluation import AnswerEvaluation
    from app.models.readiness import PlacementReadiness
    from app.models.enums import InterviewStatus

    talent = get_talent_by_code(db, candidate_code)
    student_id = talent.student_id

    # Interview stats
    interviews = (
        db.query(Interview)
        .filter(Interview.student_id == student_id, Interview.status == InterviewStatus.evaluated)
        .order_by(Interview.completed_at.desc())
        .all()
    )

    types_completed = list(set(i.interview_type.value for i in interviews))
    interview_summaries = []
    for iv in interviews[:10]:
        interview_summaries.append({
            "type": iv.interview_type.value,
            "difficulty": iv.difficulty_level.value,
            "score": iv.total_score,
            "target_role": iv.target_role,
            "target_industry": iv.target_industry,
            "date": str(iv.completed_at) if iv.completed_at else None,
            "summary": iv.overall_summary,
        })

    # Score trend (last 10 interviews)
    score_trend = [
        {"score": iv.total_score, "type": iv.interview_type.value, "date": str(iv.completed_at)}
        for iv in reversed(interviews[:10]) if iv.total_score
    ]

    # Resume skills and education (anonymized — no name, email, phone)
    student = talent.student
    resume_skills: list[str] = []
    resume_education: list[dict] = []
    resume_experience_summary: list[str] = []
    if student and student.parsed_resume and not student.parsed_resume.get("error"):
        resume = student.parsed_resume
        if isinstance(resume.get("skills"), list):
            resume_skills = resume["skills"][:20]
        if isinstance(resume.get("education"), list):
            for edu in resume["education"][:3]:
                if isinstance(edu, dict):
                    resume_education.append({
                        "degree": edu.get("degree"),
                        "institution": edu.get("institution"),
                        "year": edu.get("year"),
                    })
        if isinstance(resume.get("experience"), list):
            for exp in resume["experience"][:5]:
                if isinstance(exp, dict) and exp.get("title"):
                    resume_experience_summary.append(exp["title"])

    # Readiness
    readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == student_id).first()
    readiness_data = None
    if readiness:
        readiness_data = {
            "overall_percent": readiness.overall_readiness_percent,
            "weak_areas": readiness.weak_areas or [],
            "strong_areas": readiness.strong_areas or [],
        }

    # Profile metadata (anonymized — no name/email, but college is organizational info)
    profile_info = {}
    if student:
        profile_info = {
            "college_name": student.college_name,
            "branch": student.branch,
            "department": student.department,
            "graduation_year": student.graduation_year,
            "skills": student.skills or [],
            "interests": student.interests or [],
            "experience_level": student.experience_level,
            "years_of_experience": student.years_of_experience,
            "linkedin_url": student.linkedin_url,
            "github_url": student.github_url,
            "portfolio_url": student.portfolio_url,
            "preferred_roles": student.preferred_roles or [],
            "preferred_locations": student.preferred_locations or [],
        }

    return {
        "id": talent.id,
        "candidate_code": talent.candidate_code,
        "recommendation": talent.recommendation.value if talent.recommendation else None,
        "skill_scores": talent.skill_scores or {},
        "risk_indicators": talent.risk_indicators or [],
        "last_updated": str(talent.last_updated) if talent.last_updated else None,
        # Enriched data
        "total_interviews": len(interviews),
        "types_completed": types_completed,
        "interview_summaries": interview_summaries,
        "score_trend": score_trend,
        "resume_skills": resume_skills,
        "resume_education": resume_education,
        "resume_experience_roles": resume_experience_summary,
        "readiness": readiness_data,
        "profile": profile_info,
    }


@router.post("/{candidate_code}/shortlist", response_model=ShortlistResponse, status_code=201)
async def add_to_shortlist(
    candidate_code: str,
    req: ShortlistCreate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> ShortlistResponse:
    from app.services.subscription_service import check_limit, increment_usage
    check_limit(db, user.id, "shortlist")
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    talent = get_talent_by_code(db, candidate_code)
    shortlist = shortlist_candidate(db, company.id, talent.id, req.notes)
    return ShortlistResponse.model_validate(shortlist)


@router.delete("/{candidate_code}/shortlist", status_code=204)
async def remove_shortlist(
    candidate_code: str,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> None:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    talent = get_talent_by_code(db, candidate_code)
    remove_from_shortlist(db, company.id, talent.id)


@router.put("/shortlist/{shortlist_id}/notes", response_model=ShortlistResponse)
async def update_notes(
    shortlist_id: int,
    notes: str = "",
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> ShortlistResponse:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    from app.models.shortlist import CompanyShortlist
    record = db.query(CompanyShortlist).filter(
        CompanyShortlist.id == shortlist_id, CompanyShortlist.company_id == company.id
    ).first()
    if not record:
        raise NotFoundError("Shortlist entry")
    record.notes = notes
    db.commit()
    db.refresh(record)
    return ShortlistResponse.model_validate(record)


@router.put("/shortlist/{shortlist_id}/status", response_model=ShortlistResponse)
async def update_status(
    shortlist_id: int,
    req: ShortlistStatusUpdate,
    user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> ShortlistResponse:
    company = db.query(Company).filter(Company.user_id == user.id).first()
    if not company:
        raise NotFoundError("Company profile")
    updated = update_shortlist_status(db, shortlist_id, company.id, req.status)
    return ShortlistResponse.model_validate(updated)
