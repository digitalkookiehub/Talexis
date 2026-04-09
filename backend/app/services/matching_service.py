import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.job_role import JobRole
from app.models.talent_profile import TalentProfile
from app.models.match_result import MatchResult
from app.models.readiness import PlacementReadiness
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)


def run_matching(db: Session, job_id: int, company_id: int) -> list[MatchResult]:
    job = (
        db.query(JobRole)
        .filter(JobRole.id == job_id, JobRole.company_id == company_id)
        .first()
    )
    if not job:
        raise NotFoundError("Job role")

    # Clear previous results for this job
    db.query(MatchResult).filter(MatchResult.job_role_id == job_id).delete()

    # Get all visible talent profiles
    talents = (
        db.query(TalentProfile)
        .filter(TalentProfile.is_visible == True, TalentProfile.consent_given == True)
        .all()
    )

    results: list[MatchResult] = []
    for talent in talents:
        readiness = (
            db.query(PlacementReadiness)
            .filter(PlacementReadiness.student_id == talent.student_id)
            .first()
        )
        if not readiness:
            continue

        # Calculate match score
        skill_match = _calculate_skill_match(talent.skill_scores, job.required_skills)
        readiness_match = readiness.overall_readiness_percent / 100.0
        min_score_ok = (
            job.min_readiness_score is None
            or readiness.overall_readiness_percent >= job.min_readiness_score
        )

        if not min_score_ok:
            continue

        match_score = (skill_match * 0.6) + (readiness_match * 0.4)

        result = MatchResult(
            job_role_id=job_id,
            talent_profile_id=talent.id,
            match_score=round(match_score * 100, 1),
            skill_match_percent=round(skill_match * 100, 1),
            readiness_match=round(readiness_match * 100, 1),
            overall_rank=0,  # Set after sorting
            matched_at=datetime.now(timezone.utc),
        )
        results.append(result)

    # Sort by match score and assign ranks
    results.sort(key=lambda r: r.match_score, reverse=True)
    for i, result in enumerate(results):
        result.overall_rank = i + 1
        db.add(result)

    db.commit()
    for r in results:
        db.refresh(r)

    logger.info("Matching complete for job %s: %d candidates", job_id, len(results))
    return results


def get_match_results(db: Session, job_id: int, company_id: int) -> list[MatchResult]:
    job = (
        db.query(JobRole)
        .filter(JobRole.id == job_id, JobRole.company_id == company_id)
        .first()
    )
    if not job:
        raise NotFoundError("Job role")
    return (
        db.query(MatchResult)
        .filter(MatchResult.job_role_id == job_id)
        .order_by(MatchResult.overall_rank)
        .all()
    )


def _calculate_skill_match(talent_scores: dict, required_skills: list[str]) -> float:
    if not required_skills or not talent_scores:
        return 0.5  # Neutral if no data

    matched = 0
    for skill in required_skills:
        skill_lower = skill.lower()
        for score_key, score_val in talent_scores.items():
            if skill_lower in score_key.lower():
                if isinstance(score_val, (int, float)) and score_val >= 6.0:
                    matched += 1
                break

    return matched / len(required_skills) if required_skills else 0
