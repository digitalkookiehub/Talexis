import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.talent_profile import TalentProfile
from app.models.shortlist import CompanyShortlist
from app.models.student import StudentProfile
from app.models.readiness import PlacementReadiness
from app.models.enums import ShortlistStatus
from app.exceptions import NotFoundError, ConflictError, ValidationError

logger = logging.getLogger(__name__)


def get_or_create_talent_profile(db: Session, student: StudentProfile) -> TalentProfile:
    profile = (
        db.query(TalentProfile)
        .filter(TalentProfile.student_id == student.id)
        .first()
    )
    if not profile:
        profile = TalentProfile(
            student_id=student.id,
            candidate_code=f"TAL-{uuid.uuid4().hex[:8].upper()}",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def update_consent(db: Session, student: StudentProfile, consent: bool) -> TalentProfile:
    profile = get_or_create_talent_profile(db, student)
    profile.consent_given = consent
    profile.is_visible = consent
    profile.consent_date = datetime.now(timezone.utc) if consent else None
    db.commit()
    db.refresh(profile)
    logger.info("Student %s consent updated: %s", student.id, consent)
    return profile


def sync_talent_scores(db: Session, student_id: int) -> None:
    """Sync readiness scores to talent profile."""
    readiness = (
        db.query(PlacementReadiness)
        .filter(PlacementReadiness.student_id == student_id)
        .first()
    )
    talent = (
        db.query(TalentProfile)
        .filter(TalentProfile.student_id == student_id)
        .first()
    )
    if readiness and talent:
        talent.skill_scores = {
            "communication": readiness.communication_avg,
            "technical": readiness.technical_avg,
            "confidence": readiness.confidence_avg,
            "structure": readiness.structure_avg,
        }
        talent.recommendation = readiness.recommendation
        talent.last_updated = datetime.now(timezone.utc)
        db.commit()


def list_visible_talents(
    db: Session, skip: int = 0, limit: int = 20,
    min_score: float | None = None,
) -> tuple[list[TalentProfile], int]:
    query = db.query(TalentProfile).filter(
        TalentProfile.is_visible == True,
        TalentProfile.consent_given == True,
    )
    if min_score is not None:
        # Filter by readiness through the linked student
        pass  # Simplified for MVP
    total = query.count()
    talents = query.offset(skip).limit(limit).all()
    return talents, total


def get_talent_by_code(db: Session, candidate_code: str) -> TalentProfile:
    talent = (
        db.query(TalentProfile)
        .filter(
            TalentProfile.candidate_code == candidate_code,
            TalentProfile.is_visible == True,
        )
        .first()
    )
    if not talent:
        raise NotFoundError("Talent profile")
    return talent


def shortlist_candidate(
    db: Session, company_id: int, talent_profile_id: int, notes: str | None
) -> CompanyShortlist:
    existing = (
        db.query(CompanyShortlist)
        .filter(
            CompanyShortlist.company_id == company_id,
            CompanyShortlist.talent_profile_id == talent_profile_id,
        )
        .first()
    )
    if existing:
        raise ConflictError("Candidate already shortlisted")

    shortlist = CompanyShortlist(
        company_id=company_id,
        talent_profile_id=talent_profile_id,
        notes=notes,
        shortlisted_at=datetime.now(timezone.utc),
    )
    db.add(shortlist)
    db.commit()
    db.refresh(shortlist)
    return shortlist


def remove_from_shortlist(db: Session, company_id: int, talent_profile_id: int) -> None:
    record = (
        db.query(CompanyShortlist)
        .filter(
            CompanyShortlist.company_id == company_id,
            CompanyShortlist.talent_profile_id == talent_profile_id,
        )
        .first()
    )
    if record:
        db.delete(record)
        db.commit()


def get_company_shortlist(db: Session, company_id: int) -> list[CompanyShortlist]:
    return (
        db.query(CompanyShortlist)
        .filter(CompanyShortlist.company_id == company_id)
        .order_by(CompanyShortlist.shortlisted_at.desc())
        .all()
    )


def update_shortlist_status(
    db: Session, shortlist_id: int, company_id: int, status: ShortlistStatus
) -> CompanyShortlist:
    record = (
        db.query(CompanyShortlist)
        .filter(
            CompanyShortlist.id == shortlist_id,
            CompanyShortlist.company_id == company_id,
        )
        .first()
    )
    if not record:
        raise NotFoundError("Shortlist entry")
    record.status = status
    db.commit()
    db.refresh(record)
    return record
