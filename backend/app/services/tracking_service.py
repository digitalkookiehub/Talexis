"""Centralized tracking for tokens, user activity, and API health."""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

from app.models.tracking import TokenUsage, UserActivity, ApiMetric

logger = logging.getLogger(__name__)

# OpenAI pricing per 1M tokens (INR approximate)
COST_PER_1M = {
    "gpt-4o": {"input": 210.0, "output": 840.0},
    "gpt-4o-mini": {"input": 12.5, "output": 50.0},
}


def log_token_usage(
    db: Session, user_id: int | None, action: str, provider: str,
    model: str = "", prompt_tokens: int = 0, completion_tokens: int = 0,
) -> None:
    try:
        total = prompt_tokens + completion_tokens
        cost = 0.0
        if provider == "openai" and model in COST_PER_1M:
            rates = COST_PER_1M[model]
            cost = (prompt_tokens / 1_000_000 * rates["input"]) + (completion_tokens / 1_000_000 * rates["output"])

        entry = TokenUsage(
            user_id=user_id, action=action, provider=provider, model=model,
            prompt_tokens=prompt_tokens, completion_tokens=completion_tokens,
            total_tokens=total, cost_inr=round(cost, 4),
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.warning("Token tracking failed: %s", repr(e))


def log_user_activity(
    db: Session, user_id: int | None, action: str, detail: str = "", ip_address: str = "",
) -> None:
    try:
        entry = UserActivity(
            user_id=user_id, action=action, detail=detail or None, ip_address=ip_address or None,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.warning("Activity tracking failed: %s", repr(e))


def log_api_metric(
    db: Session, endpoint: str, method: str, status_code: int,
    response_time_ms: float, error_message: str = "",
) -> None:
    try:
        entry = ApiMetric(
            endpoint=endpoint, method=method, status_code=status_code,
            response_time_ms=response_time_ms, error_message=error_message or None,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.warning("API metric tracking failed: %s", repr(e))


# ===== Query functions for admin dashboard =====

def get_token_usage_summary(db: Session, days: int = 30) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(TokenUsage).filter(TokenUsage.created_at >= since).all()

    total_tokens = sum(r.total_tokens for r in rows)
    total_cost = sum(r.cost_inr for r in rows)
    openai_calls = sum(1 for r in rows if r.provider == "openai")
    ollama_calls = sum(1 for r in rows if r.provider == "ollama")

    # Per action breakdown
    by_action: dict[str, dict] = {}
    for r in rows:
        if r.action not in by_action:
            by_action[r.action] = {"tokens": 0, "cost": 0.0, "count": 0}
        by_action[r.action]["tokens"] += r.total_tokens
        by_action[r.action]["cost"] += r.cost_inr
        by_action[r.action]["count"] += 1

    # Per user top consumers
    user_usage: dict[int, dict] = {}
    for r in rows:
        if r.user_id and r.user_id not in user_usage:
            user_usage[r.user_id] = {"tokens": 0, "cost": 0.0, "count": 0}
        if r.user_id:
            user_usage[r.user_id]["tokens"] += r.total_tokens
            user_usage[r.user_id]["cost"] += r.cost_inr
            user_usage[r.user_id]["count"] += 1

    top_users = sorted(user_usage.items(), key=lambda x: x[1]["tokens"], reverse=True)[:10]

    # Daily breakdown
    daily = (
        db.query(cast(TokenUsage.created_at, Date).label("day"), func.sum(TokenUsage.total_tokens), func.sum(TokenUsage.cost_inr))
        .filter(TokenUsage.created_at >= since)
        .group_by(cast(TokenUsage.created_at, Date))
        .order_by(cast(TokenUsage.created_at, Date))
        .all()
    )

    return {
        "total_tokens": total_tokens,
        "total_cost_inr": round(total_cost, 2),
        "openai_calls": openai_calls,
        "ollama_calls": ollama_calls,
        "by_action": by_action,
        "top_users": [{"user_id": uid, **data} for uid, data in top_users],
        "daily": [{"date": str(d[0]), "tokens": d[1], "cost": round(float(d[2] or 0), 2)} for d in daily],
    }


def get_user_activity_summary(db: Session, days: int = 30) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    today = datetime.now(timezone.utc).date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # DAU / WAU / MAU
    dau = db.query(func.count(func.distinct(UserActivity.user_id))).filter(
        UserActivity.action == "login", cast(UserActivity.created_at, Date) == today
    ).scalar() or 0

    wau = db.query(func.count(func.distinct(UserActivity.user_id))).filter(
        UserActivity.action == "login", cast(UserActivity.created_at, Date) >= week_ago
    ).scalar() or 0

    mau = db.query(func.count(func.distinct(UserActivity.user_id))).filter(
        UserActivity.action == "login", cast(UserActivity.created_at, Date) >= month_ago
    ).scalar() or 0

    # Signups by source
    signups = db.query(UserActivity.detail, func.count()).filter(
        UserActivity.action == "signup", UserActivity.created_at >= since
    ).group_by(UserActivity.detail).all()

    # Daily active users trend
    daily_active = (
        db.query(cast(UserActivity.created_at, Date).label("day"), func.count(func.distinct(UserActivity.user_id)))
        .filter(UserActivity.action == "login", UserActivity.created_at >= since)
        .group_by(cast(UserActivity.created_at, Date))
        .order_by(cast(UserActivity.created_at, Date))
        .all()
    )

    # Recent activities
    recent = db.query(UserActivity).order_by(UserActivity.created_at.desc()).limit(20).all()

    return {
        "dau": dau,
        "wau": wau,
        "mau": mau,
        "signups_by_source": {str(s[0] or "unknown"): s[1] for s in signups},
        "daily_active": [{"date": str(d[0]), "count": d[1]} for d in daily_active],
        "recent": [
            {"user_id": a.user_id, "action": a.action, "detail": a.detail,
             "created_at": a.created_at.isoformat() if a.created_at else None}
            for a in recent
        ],
    }


def get_revenue_summary(db: Session) -> dict:
    from app.models.subscription import UserSubscription, DEFAULT_PLANS
    from app.models.demo_request import DemoRequest

    subs = db.query(UserSubscription).all()
    plan_counts: dict[str, int] = {}
    plan_revenue: dict[str, float] = {}

    for s in subs:
        plan_counts[s.plan_key] = plan_counts.get(s.plan_key, 0) + 1
        price = DEFAULT_PLANS.get(s.plan_key, {}).get("price_inr", 0)
        if isinstance(price, (int, float)) and price > 0:
            plan_revenue[s.plan_key] = plan_revenue.get(s.plan_key, 0) + price

    total_paid = sum(1 for s in subs if s.plan_key != "free")
    total_free = sum(1 for s in subs if s.plan_key == "free")
    conversion_rate = (total_paid / (total_paid + total_free) * 100) if (total_paid + total_free) > 0 else 0

    # Demo requests
    from app.models.demo_request import DemoStatus
    total_demos = db.query(DemoRequest).count()
    converted_demos = db.query(DemoRequest).filter(DemoRequest.status == DemoStatus.converted).count()
    demo_conversion = (converted_demos / total_demos * 100) if total_demos > 0 else 0

    return {
        "plan_distribution": plan_counts,
        "monthly_revenue_inr": plan_revenue,
        "total_mrr_inr": sum(plan_revenue.values()),
        "total_paid_users": total_paid,
        "total_free_users": total_free,
        "free_to_paid_conversion": round(conversion_rate, 1),
        "total_demo_requests": total_demos,
        "demo_to_converted": round(demo_conversion, 1),
    }


def get_health_metrics(db: Session, hours: int = 24) -> dict:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    metrics = db.query(ApiMetric).filter(ApiMetric.created_at >= since).all()
    if not metrics:
        return {"total_requests": 0, "avg_response_ms": 0, "error_rate": 0, "errors_by_endpoint": {}, "slowest_endpoints": []}

    total = len(metrics)
    errors = [m for m in metrics if m.status_code >= 400]
    error_rate = (len(errors) / total * 100) if total > 0 else 0
    avg_response = sum(m.response_time_ms for m in metrics) / total

    # Errors by endpoint
    error_by_ep: dict[str, int] = {}
    for e in errors:
        error_by_ep[e.endpoint] = error_by_ep.get(e.endpoint, 0) + 1

    # Slowest endpoints
    ep_times: dict[str, list] = {}
    for m in metrics:
        if m.endpoint not in ep_times:
            ep_times[m.endpoint] = []
        ep_times[m.endpoint].append(m.response_time_ms)

    slowest = sorted(
        [{"endpoint": ep, "avg_ms": round(sum(times)/len(times), 1), "count": len(times)} for ep, times in ep_times.items()],
        key=lambda x: x["avg_ms"], reverse=True
    )[:10]

    # LLM fallback stats
    token_rows = db.query(TokenUsage).filter(TokenUsage.created_at >= since).all()
    ollama_ok = sum(1 for r in token_rows if r.provider == "ollama")
    openai_fallback = sum(1 for r in token_rows if r.provider == "openai")

    return {
        "total_requests": total,
        "avg_response_ms": round(avg_response, 1),
        "error_count": len(errors),
        "error_rate": round(error_rate, 1),
        "errors_by_endpoint": dict(sorted(error_by_ep.items(), key=lambda x: x[1], reverse=True)[:10]),
        "slowest_endpoints": slowest,
        "ollama_success": ollama_ok,
        "openai_fallback": openai_fallback,
    }
