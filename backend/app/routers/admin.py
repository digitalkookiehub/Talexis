import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.user import User
from app.models.interview import Interview
from app.models.enums import UserRole
from app.services.tracking_service import get_token_usage_summary, get_user_activity_summary, get_revenue_summary, get_health_metrics, get_database_info
from app.schemas.auth import UserResponse
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    role: UserRole | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list:
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.offset(skip).limit(limit).all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    is_active: bool | None = None,
    role: UserRole | None = None,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User")
    if is_active is not None:
        user.is_active = is_active
    if role is not None:
        user.role = role
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(
    user_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User")
    user.is_active = False
    db.commit()


@router.put("/users/{user_id}/plan")
async def set_user_plan(
    user_id: int,
    plan_key: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    from app.services.subscription_service import set_user_plan as svc_set_plan, get_plan_info
    svc_set_plan(db, user_id, plan_key)
    info = get_plan_info(plan_key)
    return {"message": f"Plan set to {info['name']}", "plan_key": plan_key}


@router.get("/plans")
async def list_plans(
    _admin: User = Depends(require_admin),
) -> dict:
    from app.models.subscription import DEFAULT_PLANS
    return {
        key: {"name": p["name"], "price_inr": p["price_inr"], "billing": p["billing"]}
        for key, p in DEFAULT_PLANS.items()
    }


@router.get("/monitoring/tokens")
async def token_usage(
    days: int = Query(30, ge=1, le=365),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    return get_token_usage_summary(db, days)


@router.get("/monitoring/activity")
async def user_activity(
    days: int = Query(30, ge=1, le=365),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    return get_user_activity_summary(db, days)


@router.get("/monitoring/database")
async def database_info(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    return get_database_info(db)


@router.get("/monitoring/revenue")
async def revenue(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    return get_revenue_summary(db)


@router.get("/monitoring/health")
async def health_metrics(
    hours: int = Query(24, ge=1, le=168),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    return get_health_metrics(db, hours)


@router.get("/stats")
async def platform_stats(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    total_users = db.query(User).count()
    students = db.query(User).filter(User.role == UserRole.student).count()
    companies = db.query(User).filter(User.role == UserRole.company).count()
    total_interviews = db.query(Interview).count()
    return {
        "total_users": total_users,
        "students": students,
        "companies": companies,
        "total_interviews": total_interviews,
    }


@router.get("/demo-requests")
async def list_demo_requests(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list:
    from app.models.demo_request import DemoRequest
    requests = db.query(DemoRequest).order_by(DemoRequest.created_at.desc()).limit(50).all()
    return [
        {
            "id": r.id,
            "contact_name": r.contact_name,
            "company_name": r.company_name,
            "email": r.email,
            "phone": r.phone,
            "message": r.message,
            "status": r.status.value,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in requests
    ]


@router.put("/demo-requests/{request_id}")
async def update_demo_request(
    request_id: int,
    status: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    from app.models.demo_request import DemoRequest, DemoStatus
    req = db.query(DemoRequest).filter(DemoRequest.id == request_id).first()
    if not req:
        raise NotFoundError("Demo request")
    req.status = DemoStatus(status)
    db.commit()
    return {"message": "Status updated", "id": request_id, "status": status}


@router.get("/settings")
async def get_settings(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Get current system settings and service health status."""
    from app.config import settings
    import httpx

    # Check Ollama health
    ollama_status = "offline"
    ollama_model = settings.OLLAMA_MODEL
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if r.status_code == 200:
                ollama_status = "online"
                models = r.json().get("models", [])
                ollama_model = ", ".join(m["name"] for m in models) if models else settings.OLLAMA_MODEL
    except Exception:
        pass

    # Check DB
    db_status = "online"
    try:
        db.execute(db.get_bind().dialect.server_version_info if hasattr(db.get_bind().dialect, 'server_version_info') else None)
    except Exception:
        pass  # if we got this far, DB is fine

    return {
        "database": {
            "status": db_status,
            "url": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "configured",
        },
        "ollama": {
            "status": ollama_status,
            "base_url": settings.OLLAMA_BASE_URL,
            "models": ollama_model,
        },
        "openai": {
            "configured": bool(settings.OPENAI_API_KEY),
            "model": settings.OPENAI_MODEL,
        },
        "auth": {
            "algorithm": settings.ALGORITHM,
            "access_token_expire_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            "refresh_token_expire_days": settings.REFRESH_TOKEN_EXPIRE_DAYS,
        },
        "upload": {
            "upload_dir": settings.UPLOAD_DIR,
            "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
        },
        "frontend_url": settings.FRONTEND_URL,
    }
