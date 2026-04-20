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
    interview_id: int | None = None, question_id: int | None = None,
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
            interview_id=interview_id, question_id=question_id,
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

    top_users_raw = sorted(user_usage.items(), key=lambda x: x[1]["tokens"], reverse=True)[:10]
    # Resolve user names
    from app.models.user import User
    top_users = []
    for uid, data in top_users_raw:
        u = db.query(User).filter(User.id == uid).first()
        top_users.append({"user_id": uid, "name": u.full_name or u.email if u else f"User #{uid}", "email": u.email if u else "", **data})

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
        "top_users": top_users,
        "daily": [{"date": str(d[0]), "tokens": d[1], "cost": round(float(d[2] or 0), 2)} for d in daily],
    }


def get_interview_token_detail(db: Session, interview_id: int) -> dict:
    """Get per-question token breakdown for a specific interview."""
    rows = db.query(TokenUsage).filter(TokenUsage.interview_id == interview_id).all()
    if not rows:
        return {"interview_id": interview_id, "total_tokens": 0, "total_cost_inr": 0, "breakdown": []}

    total_tokens = sum(r.total_tokens for r in rows)
    total_cost = sum(r.cost_inr for r in rows)

    breakdown = []
    for r in rows:
        breakdown.append({
            "action": r.action,
            "question_id": r.question_id,
            "provider": r.provider,
            "model": r.model,
            "prompt_tokens": r.prompt_tokens,
            "completion_tokens": r.completion_tokens,
            "total_tokens": r.total_tokens,
            "cost_inr": round(r.cost_inr, 4),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "interview_id": interview_id,
        "total_tokens": total_tokens,
        "total_cost_inr": round(total_cost, 4),
        "question_gen_tokens": sum(r.total_tokens for r in rows if r.action == "question_gen"),
        "evaluation_tokens": sum(r.total_tokens for r in rows if r.action == "evaluation"),
        "summary_tokens": sum(r.total_tokens for r in rows if r.action == "summary"),
        "breakdown": sorted(breakdown, key=lambda x: x["created_at"] or ""),
    }


def get_per_user_interview_costs(db: Session, days: int = 30) -> list[dict]:
    """Get token costs grouped by interview for the admin dashboard."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    from app.models.interview import Interview
    from app.models.user import User

    # Get all interviews with token usage in the period
    rows = (
        db.query(
            TokenUsage.interview_id,
            func.sum(TokenUsage.total_tokens).label("tokens"),
            func.sum(TokenUsage.cost_inr).label("cost"),
            func.count().label("calls"),
            TokenUsage.user_id,
        )
        .filter(TokenUsage.created_at >= since, TokenUsage.interview_id.isnot(None))
        .group_by(TokenUsage.interview_id, TokenUsage.user_id)
        .order_by(func.sum(TokenUsage.total_tokens).desc())
        .limit(50)
        .all()
    )

    results = []
    for row in rows:
        interview = db.query(Interview).filter(Interview.id == row.interview_id).first()
        user = db.query(User).filter(User.id == row.user_id).first() if row.user_id else None
        results.append({
            "interview_id": row.interview_id,
            "user_id": row.user_id,
            "user_name": user.full_name or user.email if user else f"User #{row.user_id}",
            "interview_type": interview.interview_type.value if interview else "unknown",
            "difficulty": interview.difficulty_level.value if interview else "unknown",
            "questions_answered": interview.questions_answered if interview else 0,
            "total_tokens": row.tokens,
            "total_cost_inr": round(float(row.cost or 0), 4),
            "api_calls": row.calls,
            "created_at": interview.created_at.isoformat() if interview and interview.created_at else None,
        })

    return results


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
        "total_signups": sum(s[1] for s in signups),
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

    # Interviews today
    from app.models.interview import Interview
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    interviews_today = db.query(func.count(Interview.id)).filter(Interview.created_at >= today_start).scalar() or 0

    # Response time trend (hourly)
    hourly_response = (
        db.query(
            func.date_trunc('hour', ApiMetric.created_at).label("hour"),
            func.avg(ApiMetric.response_time_ms),
            func.count(),
        )
        .filter(ApiMetric.created_at >= since)
        .group_by(func.date_trunc('hour', ApiMetric.created_at))
        .order_by(func.date_trunc('hour', ApiMetric.created_at))
        .all()
    )

    return {
        "total_requests": total,
        "avg_response_ms": round(avg_response, 1),
        "error_count": len(errors),
        "error_rate": round(error_rate, 1),
        "errors_by_endpoint": dict(sorted(error_by_ep.items(), key=lambda x: x[1], reverse=True)[:10]),
        "slowest_endpoints": slowest,
        "ollama_success": ollama_ok,
        "openai_fallback": openai_fallback,
        "interviews_today": interviews_today,
        "response_trend": [{"hour": str(h[0]), "avg_ms": round(float(h[1] or 0), 1), "count": h[2]} for h in hourly_response],
    }


def get_database_info(db: Session) -> dict:
    """Get database size, version, region, table counts."""
    from sqlalchemy import text

    try:
        # DB version
        version = db.execute(text("SELECT version()")).scalar() or ""
        version_short = version.split("(")[0].strip() if version else "Unknown"

        # DB size
        db_size = db.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))")).scalar() or "Unknown"

        # DB name
        db_name = db.execute(text("SELECT current_database()")).scalar() or "Unknown"

        # Table count
        table_count = db.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).scalar() or 0

        # Total rows across all tables
        total_rows = 0
        tables_info = []
        table_names = db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).fetchall()
        for (tname,) in table_names:
            try:
                count = db.execute(text(f"SELECT count(*) FROM \"{tname}\"")).scalar() or 0
                size = db.execute(text(f"SELECT pg_size_pretty(pg_total_relation_size('\"{tname}\"'))")).scalar() or "0 bytes"
                total_rows += count
                tables_info.append({"name": tname, "rows": count, "size": size})
            except Exception:
                tables_info.append({"name": tname, "rows": 0, "size": "?"})

        # Connection info (extract region from host)
        connection_host = ""
        try:
            from app.config import settings
            url = settings.DATABASE_URL
            if "@" in url:
                host_part = url.split("@")[1].split("/")[0]
                connection_host = host_part
        except Exception:
            pass

        # Detect region from Neon host
        region = "Unknown"
        if "us-east" in connection_host:
            region = "US East (Virginia)"
        elif "us-west" in connection_host:
            region = "US West (Oregon)"
        elif "ap-southeast" in connection_host:
            region = "Asia Pacific (Singapore)"
        elif "eu-central" in connection_host:
            region = "Europe (Frankfurt)"
        elif "ap-south" in connection_host:
            region = "Asia Pacific (Mumbai)"
        elif "neon.tech" in connection_host:
            region = "Neon Cloud"
        elif "localhost" in connection_host or "127.0.0.1" in connection_host:
            region = "Local"

        # Active connections
        active_connections = db.execute(text("SELECT count(*) FROM pg_stat_activity")).scalar() or 0

        return {
            "version": version_short,
            "database_name": db_name,
            "size": db_size,
            "region": region,
            "host": connection_host,
            "table_count": table_count,
            "total_rows": total_rows,
            "active_connections": active_connections,
            "tables": sorted(tables_info, key=lambda x: x["rows"], reverse=True)[:15],
            "provider": "Neon" if "neon.tech" in connection_host else "PostgreSQL",
        }
    except Exception as e:
        logger.error("Database info query failed: %s", repr(e))
        return {"error": str(e)}
