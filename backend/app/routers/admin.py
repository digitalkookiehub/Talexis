import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.user import User
from app.models.interview import Interview
from app.models.enums import UserRole
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
