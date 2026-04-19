"""College admin endpoints — scoped to a specific college's students."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth.dependencies import require_college_admin
from app.models.user import User
from app.models.student import StudentProfile
from app.models.interview import Interview
from app.models.evaluation import AnswerEvaluation
from app.models.readiness import PlacementReadiness
from app.models.talent_profile import TalentProfile
from app.models.enums import InterviewStatus, Recommendation
from app.exceptions import ValidationError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/college", tags=["college"])


def _get_college_name(user: User) -> str:
    """Get the college name for a college_admin user."""
    if not user.college_name:
        raise ValidationError("College not set. Please configure your college profile first.")
    return user.college_name


def _get_college_students(db: Session, college_name: str) -> list[StudentProfile]:
    """Get all student profiles belonging to this college."""
    return (
        db.query(StudentProfile)
        .filter(StudentProfile.college_name == college_name)
        .all()
    )


# --- College Profile ---

@router.get("/profile")
async def get_college_profile(
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    student_count = (
        db.query(StudentProfile)
        .filter(StudentProfile.college_name == user.college_name)
        .count() if user.college_name else 0
    )
    return {
        "college_name": user.college_name,
        "admin_name": user.full_name,
        "admin_email": user.email,
        "student_count": student_count,
    }


@router.put("/profile")
async def update_college_profile(
    college_name: str = Query(..., min_length=2, max_length=200),
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    user.college_name = college_name.strip()
    db.commit()
    db.refresh(user)
    return {"message": "College profile updated", "college_name": user.college_name}


# --- Create Student Accounts ---

class CreateStudentRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    branch: str | None = None
    department: str | None = None
    graduation_year: int | None = None


@router.post("/students/create", status_code=201)
async def create_student(
    req: CreateStudentRequest,
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    """College admin creates a student account linked to their college."""
    from app.auth.jwt import hash_password
    from app.models.enums import UserRole
    from app.exceptions import ConflictError

    college = _get_college_name(user)

    # Check duplicate
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise ConflictError("Email already registered")

    # Create user
    student_user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role=UserRole.student,
        is_active=True,
    )
    db.add(student_user)
    db.flush()

    # Create student profile linked to this college
    profile = StudentProfile(
        user_id=student_user.id,
        college_name=college,
        branch=req.branch,
        department=req.department,
        graduation_year=req.graduation_year,
    )
    db.add(profile)
    db.commit()

    return {
        "message": f"Student account created for {req.full_name}",
        "email": req.email,
        "college": college,
    }


@router.post("/students/bulk-import")
async def bulk_import_students(
    students_data: list[CreateStudentRequest],
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Bulk import students from a CSV/Excel parsed list."""
    from app.auth.jwt import hash_password
    from app.models.enums import UserRole

    college = _get_college_name(user)
    created = 0
    skipped = 0
    errors: list[str] = []

    for row in students_data:
        existing = db.query(User).filter(User.email == row.email).first()
        if existing:
            skipped += 1
            errors.append(f"{row.email}: already registered")
            continue
        try:
            student_user = User(
                email=row.email,
                hashed_password=hash_password(row.password),
                full_name=row.full_name,
                role=UserRole.student,
                is_active=True,
            )
            db.add(student_user)
            db.flush()
            profile = StudentProfile(
                user_id=student_user.id,
                college_name=college,
                branch=row.branch,
                department=row.department,
                graduation_year=row.graduation_year,
            )
            db.add(profile)
            created += 1
        except Exception as e:
            skipped += 1
            errors.append(f"{row.email}: {str(e)}")

    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors, "total": len(students_data)}


# --- Student Roster ---

@router.get("/students")
async def list_college_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    college = _get_college_name(user)
    query = db.query(StudentProfile).filter(StudentProfile.college_name == college)
    total = query.count()
    students = query.offset(skip).limit(limit).all()

    result = []
    for s in students:
        # Get user info
        student_user = db.query(User).filter(User.id == s.user_id).first()
        # Get interview count
        interview_count = db.query(Interview).filter(Interview.student_id == s.id).count()
        evaluated_count = db.query(Interview).filter(
            Interview.student_id == s.id, Interview.status == InterviewStatus.evaluated
        ).count()
        # Get readiness
        readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == s.id).first()
        # Get talent consent
        talent = db.query(TalentProfile).filter(TalentProfile.student_id == s.id).first()

        result.append({
            "id": s.id,
            "name": student_user.full_name if student_user else None,
            "email": student_user.email if student_user else None,
            "branch": s.branch,
            "department": s.department,
            "graduation_year": s.graduation_year,
            "skills": s.skills or [],
            "total_interviews": interview_count,
            "evaluated_interviews": evaluated_count,
            "readiness_percent": readiness.overall_readiness_percent if readiness else None,
            "recommendation": readiness.recommendation.value if readiness and readiness.recommendation else None,
            "talent_visible": talent.is_visible if talent else False,
            "resume_uploaded": bool(s.resume_url),
        })

    return {"students": result, "total": total, "college_name": college}


# --- College Analytics ---

@router.get("/analytics")
async def college_analytics(
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    college = _get_college_name(user)
    students = _get_college_students(db, college)
    student_ids = [s.id for s in students]

    if not student_ids:
        return {
            "college_name": college,
            "total_students": 0,
            "total_interviews": 0,
            "evaluated_interviews": 0,
            "avg_score": 0,
            "readiness_summary": {"ready": 0, "maybe": 0, "not_ready": 0},
            "placement_rate": 0,
            "interviews_by_type": {},
            "branch_breakdown": {},
        }

    # Interview stats
    all_interviews = db.query(Interview).filter(Interview.student_id.in_(student_ids)).all()
    evaluated = [i for i in all_interviews if i.status == InterviewStatus.evaluated]
    scores = [i.total_score for i in evaluated if i.total_score is not None]

    # Readiness summary
    readiness_records = db.query(PlacementReadiness).filter(PlacementReadiness.student_id.in_(student_ids)).all()
    ready = sum(1 for r in readiness_records if r.recommendation == Recommendation.yes)
    maybe = sum(1 for r in readiness_records if r.recommendation == Recommendation.maybe)
    not_ready = sum(1 for r in readiness_records if r.recommendation == Recommendation.no)

    # Talent visibility (placement potential)
    visible_talents = db.query(TalentProfile).filter(
        TalentProfile.student_id.in_(student_ids),
        TalentProfile.is_visible == True,
    ).count()

    # Interviews by type
    type_counts: dict[str, int] = {}
    for i in all_interviews:
        key = i.interview_type.value
        type_counts[key] = type_counts.get(key, 0) + 1

    # Branch breakdown
    branch_counts: dict[str, int] = {}
    for s in students:
        key = s.branch or "Unknown"
        branch_counts[key] = branch_counts.get(key, 0) + 1

    return {
        "college_name": college,
        "total_students": len(students),
        "total_interviews": len(all_interviews),
        "evaluated_interviews": len(evaluated),
        "avg_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "readiness_summary": {"ready": ready, "maybe": maybe, "not_ready": not_ready},
        "placement_rate": round((ready / len(students)) * 100, 1) if students else 0,
        "visible_to_companies": visible_talents,
        "resume_uploaded": sum(1 for s in students if s.resume_url),
        "interviews_by_type": type_counts,
        "branch_breakdown": branch_counts,
    }


# --- Placement Tracking ---

@router.get("/placements")
async def placement_tracking(
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    college = _get_college_name(user)
    students = _get_college_students(db, college)
    student_ids = [s.id for s in students]

    if not student_ids:
        return {"students": [], "summary": {"ready": 0, "maybe": 0, "not_ready": 0, "no_data": 0}}

    result = []
    summary = {"ready": 0, "maybe": 0, "not_ready": 0, "no_data": 0}

    for s in students:
        student_user = db.query(User).filter(User.id == s.user_id).first()
        readiness = db.query(PlacementReadiness).filter(PlacementReadiness.student_id == s.id).first()
        talent = db.query(TalentProfile).filter(TalentProfile.student_id == s.id).first()

        # Count interviews
        eval_count = db.query(Interview).filter(
            Interview.student_id == s.id, Interview.status == InterviewStatus.evaluated
        ).count()

        rec = None
        if readiness and readiness.recommendation:
            rec = readiness.recommendation.value
            if rec == "yes":
                summary["ready"] += 1
            elif rec == "maybe":
                summary["maybe"] += 1
            else:
                summary["not_ready"] += 1
        else:
            summary["no_data"] += 1

        result.append({
            "id": s.id,
            "name": student_user.full_name if student_user else None,
            "branch": s.branch,
            "graduation_year": s.graduation_year,
            "interviews_completed": eval_count,
            "readiness_percent": readiness.overall_readiness_percent if readiness else None,
            "recommendation": rec,
            "weak_areas": readiness.weak_areas if readiness else [],
            "strong_areas": readiness.strong_areas if readiness else [],
            "visible_to_companies": talent.is_visible if talent else False,
            "resume_uploaded": bool(s.resume_url),
        })

    # Sort: ready first, then maybe, then not_ready, then no_data
    order = {"yes": 0, "maybe": 1, "no": 2}
    result.sort(key=lambda x: (order.get(x["recommendation"] or "", 3), -(x["readiness_percent"] or 0)))

    return {"students": result, "summary": summary}


# --- Scheduled Interviews for College Students ---

@router.get("/schedules")
async def college_schedules(
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> list:
    """Get scheduled interviews for students from this college (platform candidates only)."""
    college = _get_college_name(user)
    students = _get_college_students(db, college)
    student_ids = [s.id for s in students]

    if not student_ids:
        return []

    # Find talent profiles for these students
    talent_profiles = (
        db.query(TalentProfile)
        .filter(TalentProfile.student_id.in_(student_ids))
        .all()
    )
    talent_id_map = {t.id: t.student_id for t in talent_profiles}
    talent_ids = [t.id for t in talent_profiles]

    if not talent_ids:
        return []

    from app.models.scheduled_interview import ScheduledInterview as SI
    from app.models.company import Company

    schedules = (
        db.query(SI)
        .filter(SI.talent_profile_id.in_(talent_ids))
        .order_by(SI.scheduled_at.desc())
        .limit(50)
        .all()
    )

    result = []
    for s in schedules:
        # Get company name
        company = db.query(Company).filter(Company.id == s.company_id).first()
        # Get student name
        sid = talent_id_map.get(s.talent_profile_id)
        student_name = None
        if sid:
            sp = db.query(StudentProfile).filter(StudentProfile.id == sid).first()
            if sp:
                su = db.query(User).filter(User.id == sp.user_id).first()
                if su:
                    student_name = su.full_name

        result.append({
            "id": s.id,
            "student_name": student_name,
            "candidate_name": s.candidate_name,
            "company_name": company.company_name if company else "Unknown",
            "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
            "duration_minutes": s.duration_minutes,
            "interview_type": s.interview_type,
            "status": s.status.value,
            "college_approval": s.college_approval.value if s.college_approval else "pending",
            "interviewer_name": s.interviewer_name,
            "feedback_rating": s.feedback_rating,
            "feedback_notes": s.feedback_notes,
            "feedback_outcome": s.feedback_outcome.value if s.feedback_outcome else None,
        })

    return result


@router.post("/schedules/{schedule_id}/approve")
async def approve_schedule(
    schedule_id: int,
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    """College admin approves a scheduled interview."""
    from app.models.scheduled_interview import ScheduledInterview as SI, ApprovalStatus
    college = _get_college_name(user)
    schedule = db.query(SI).filter(SI.id == schedule_id).first()
    if not schedule:
        raise ValidationError("Schedule not found")
    # Verify this schedule is for a student in this college
    if schedule.talent_profile_id:
        talent = db.query(TalentProfile).filter(TalentProfile.id == schedule.talent_profile_id).first()
        if talent:
            student = db.query(StudentProfile).filter(StudentProfile.id == talent.student_id).first()
            if not student or student.college_name != college:
                raise ValidationError("This schedule is not for a student in your college")
    schedule.college_approval = ApprovalStatus.approved
    db.commit()
    return {"message": "Schedule approved", "id": schedule_id}


@router.post("/schedules/{schedule_id}/decline")
async def decline_schedule(
    schedule_id: int,
    reason: str = "",
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    """College admin declines a scheduled interview."""
    from app.models.scheduled_interview import ScheduledInterview as SI, ApprovalStatus
    college = _get_college_name(user)
    schedule = db.query(SI).filter(SI.id == schedule_id).first()
    if not schedule:
        raise ValidationError("Schedule not found")
    if schedule.talent_profile_id:
        talent = db.query(TalentProfile).filter(TalentProfile.id == schedule.talent_profile_id).first()
        if talent:
            student = db.query(StudentProfile).filter(StudentProfile.id == talent.student_id).first()
            if not student or student.college_name != college:
                raise ValidationError("This schedule is not for a student in your college")
    schedule.college_approval = ApprovalStatus.declined
    schedule.college_decline_reason = reason
    db.commit()
    return {"message": "Schedule declined", "id": schedule_id}


# --- College Recommendations ---

@router.post("/recommend")
async def recommend_student(
    student_id: int,
    company_id: int,
    message: str = "",
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> dict:
    """College admin recommends a student to a company."""
    from app.models.college_recommendation import CollegeRecommendation
    from app.models.company import Company

    college = _get_college_name(user)
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id, StudentProfile.college_name == college).first()
    if not student:
        raise ValidationError("Student not found in your college")
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise ValidationError("Company not found")

    # Check for duplicate
    existing = db.query(CollegeRecommendation).filter(
        CollegeRecommendation.student_profile_id == student_id,
        CollegeRecommendation.company_id == company_id,
    ).first()
    if existing:
        raise ValidationError("Already recommended this student to this company")

    rec = CollegeRecommendation(
        college_user_id=user.id,
        student_profile_id=student_id,
        company_id=company_id,
        message=message,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"message": "Student recommended", "id": rec.id}


@router.get("/recommendations")
async def list_recommendations(
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> list:
    """List all recommendations made by this college admin."""
    from app.models.college_recommendation import CollegeRecommendation
    from app.models.company import Company

    recs = db.query(CollegeRecommendation).filter(CollegeRecommendation.college_user_id == user.id).order_by(CollegeRecommendation.created_at.desc()).all()
    result = []
    for r in recs:
        student = db.query(StudentProfile).filter(StudentProfile.id == r.student_profile_id).first()
        student_user = db.query(User).filter(User.id == student.user_id).first() if student else None
        company = db.query(Company).filter(Company.id == r.company_id).first()
        result.append({
            "id": r.id,
            "student_name": student_user.full_name if student_user else None,
            "student_branch": student.branch if student else None,
            "company_name": company.company_name if company else None,
            "message": r.message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


# --- Activity Feed ---

@router.get("/activity")
async def college_activity_feed(
    user: User = Depends(require_college_admin),
    db: Session = Depends(get_db),
) -> list:
    """Get activity feed for this college."""
    college = _get_college_name(user)
    from app.services.activity_service import get_activities_for_college
    activities = get_activities_for_college(db, college)
    return [
        {
            "id": a.id,
            "event_type": a.event_type,
            "actor_role": a.actor_role,
            "actor_name": a.actor_name,
            "description": a.description,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in activities
    ]
