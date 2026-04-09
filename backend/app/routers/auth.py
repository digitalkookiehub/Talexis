import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.auth import (
    Token, RegisterRequest, RefreshRequest,
    UserResponse, UserUpdate,
)
from app.services.auth_service import (
    register_user, authenticate_user, create_tokens,
    refresh_tokens, revoke_refresh_token, update_user,
)
from app.exceptions import AppException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(req: RegisterRequest, db: Session = Depends(get_db)) -> User:
    return register_user(db, req.email, req.password, req.full_name, req.role)


@router.post("/login", response_model=Token)
async def login(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> dict:
    user = authenticate_user(db, form.username, form.password)
    return create_tokens(db, user)


@router.post("/refresh", response_model=Token)
async def refresh(req: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    return refresh_tokens(db, req.refresh_token)


@router.post("/logout", status_code=204)
async def logout(req: RefreshRequest, db: Session = Depends(get_db)) -> None:
    revoke_refresh_token(db, req.refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_active_user)) -> User:
    return user


@router.put("/me", response_model=UserResponse)
async def update_me(
    req: UserUpdate,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    return update_user(db, user, req.full_name, req.email)
