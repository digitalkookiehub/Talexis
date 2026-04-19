"""Subscription and usage limit enforcement."""
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.subscription import UserSubscription, DEFAULT_PLANS
from app.models.user import User
from app.exceptions import ForbiddenError

logger = logging.getLogger(__name__)


def get_or_create_subscription(db: Session, user_id: int) -> UserSubscription:
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
    if not sub:
        sub = UserSubscription(user_id=user_id, plan_key="free")
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _reset_if_new_month(db: Session, sub: UserSubscription) -> None:
    current = _current_month()
    if sub.usage_month != current:
        sub.usage_month = current
        sub.interviews_used = 0
        sub.talent_browses_used = 0
        sub.shortlists_used = 0
        sub.schedules_used = 0
        sub.resume_screens_used = 0
        db.commit()


def get_plan_limits(plan_key: str) -> dict:
    plan = DEFAULT_PLANS.get(plan_key, DEFAULT_PLANS["free"])
    return plan["limits"]


def get_plan_info(plan_key: str) -> dict:
    return DEFAULT_PLANS.get(plan_key, DEFAULT_PLANS["free"])


def check_limit(db: Session, user_id: int, action: str) -> None:
    """Check if user can perform the action. Raises ForbiddenError if limit exceeded."""
    sub = get_or_create_subscription(db, user_id)
    _reset_if_new_month(db, sub)
    limits = get_plan_limits(sub.plan_key)

    if action == "interview":
        max_val = limits.get("interviews_per_month", 3)
        if max_val != -1 and sub.interviews_used >= max_val:
            raise ForbiddenError(
                f"Monthly interview limit reached ({max_val}). Upgrade to Pro for unlimited interviews at ₹399/month."
            )

    elif action == "talent_browse":
        max_val = limits.get("talent_browse_per_month", 0)
        if max_val == 0:
            raise ForbiddenError("Talent browsing not available on your plan.")
        if max_val != -1 and sub.talent_browses_used >= max_val:
            raise ForbiddenError(
                f"Monthly talent browse limit reached ({max_val}). Upgrade to Growth plan at ₹24,999/month."
            )

    elif action == "shortlist":
        max_val = limits.get("shortlists_per_month", 0)
        if max_val == 0:
            raise ForbiddenError("Shortlisting not available on your plan.")
        if max_val != -1 and sub.shortlists_used >= max_val:
            raise ForbiddenError(
                f"Monthly shortlist limit reached ({max_val}). Upgrade to Growth plan."
            )

    elif action == "schedule":
        max_val = limits.get("schedules_per_month", 0)
        if max_val == 0:
            raise ForbiddenError("Scheduling not available on your plan.")
        if max_val != -1 and sub.schedules_used >= max_val:
            raise ForbiddenError(
                f"Monthly schedule limit reached ({max_val}). Upgrade your plan."
            )

    elif action == "resume_screen":
        max_val = limits.get("resume_screens", 1)
        if max_val != -1 and sub.resume_screens_used >= max_val:
            raise ForbiddenError(
                f"Resume screening limit reached ({max_val}). Upgrade to Pro for unlimited."
            )

    elif action == "matching":
        if not limits.get("matching", False):
            raise ForbiddenError("AI matching is available on Growth plan (₹24,999/month) and above.")

    elif action == "csv_export":
        if not limits.get("csv_export", False):
            raise ForbiddenError("CSV export is available on Growth plan and above.")

    elif action == "comparison":
        if not limits.get("comparison", False):
            raise ForbiddenError("Candidate comparison is available on Growth plan and above.")

    elif action == "difficulty_intermediate":
        max_diff = limits.get("difficulty_max", "basic")
        if max_diff == "basic":
            raise ForbiddenError("Intermediate difficulty requires Pro plan (₹399/month).")

    elif action == "difficulty_advanced":
        max_diff = limits.get("difficulty_max", "basic")
        if max_diff in ("basic", "intermediate"):
            raise ForbiddenError("Advanced difficulty requires Pro plan (₹399/month).")

    elif action == "talent_visible":
        if not limits.get("talent_visible", False):
            raise ForbiddenError("Company visibility requires Pro plan (₹399/month).")

    elif action == "job_board":
        if not limits.get("job_board_access", False):
            raise ForbiddenError("Job Board access requires Pro plan (₹399/month).")


def increment_usage(db: Session, user_id: int, action: str) -> None:
    """Increment the usage counter after a successful action."""
    sub = get_or_create_subscription(db, user_id)
    _reset_if_new_month(db, sub)

    if action == "interview":
        sub.interviews_used += 1
    elif action == "talent_browse":
        sub.talent_browses_used += 1
    elif action == "shortlist":
        sub.shortlists_used += 1
    elif action == "schedule":
        sub.schedules_used += 1
    elif action == "resume_screen":
        sub.resume_screens_used += 1

    db.commit()


def get_usage_summary(db: Session, user_id: int) -> dict:
    """Get current plan and usage for display."""
    sub = get_or_create_subscription(db, user_id)
    _reset_if_new_month(db, sub)
    plan = get_plan_info(sub.plan_key)
    limits = plan["limits"]

    return {
        "plan_key": sub.plan_key,
        "plan_name": plan["name"],
        "price_inr": plan["price_inr"],
        "billing": plan["billing"],
        "usage": {
            "interviews": {"used": sub.interviews_used, "limit": limits.get("interviews_per_month", 0)},
            "talent_browses": {"used": sub.talent_browses_used, "limit": limits.get("talent_browse_per_month", 0)},
            "shortlists": {"used": sub.shortlists_used, "limit": limits.get("shortlists_per_month", 0)},
            "schedules": {"used": sub.schedules_used, "limit": limits.get("schedules_per_month", 0)},
            "resume_screens": {"used": sub.resume_screens_used, "limit": limits.get("resume_screens", 0)},
        },
        "features": {
            "matching": limits.get("matching", False),
            "csv_export": limits.get("csv_export", False),
            "comparison": limits.get("comparison", False),
            "talent_visible": limits.get("talent_visible", False),
            "job_board_access": limits.get("job_board_access", False),
        },
    }


def set_user_plan(db: Session, user_id: int, plan_key: str) -> UserSubscription:
    """Admin sets a user's plan."""
    if plan_key not in DEFAULT_PLANS:
        raise ValueError(f"Unknown plan: {plan_key}")
    sub = get_or_create_subscription(db, user_id)
    sub.plan_key = plan_key
    db.commit()
    db.refresh(sub)
    logger.info("User %s plan set to %s", user_id, plan_key)
    return sub
