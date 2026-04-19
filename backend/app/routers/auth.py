import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.auth import (
    Token, RegisterRequest, RefreshRequest,
    UserResponse, UserUpdate, ForgotPasswordRequest,
)
from app.services.auth_service import (
    register_user, authenticate_user, create_tokens,
    refresh_tokens, revoke_refresh_token, update_user,
    reset_password,
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


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    """Reset password using email and new password."""
    reset_password(db, req.email, req.new_password)
    return {"message": "Password reset successfully. You can now login with your new password."}


@router.post("/demo-request")
async def request_demo(
    contact_name: str,
    company_name: str,
    email: str,
    phone: str = "",
    message: str = "",
    db: Session = Depends(get_db),
) -> dict:
    """Public endpoint — companies request a demo. No auth needed."""
    from app.models.demo_request import DemoRequest
    req = DemoRequest(
        contact_name=contact_name,
        company_name=company_name,
        email=email,
        phone=phone or None,
        message=message or None,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    logger.info("Demo request from %s (%s)", contact_name, company_name)

    # Send email to admin
    try:
        from app.services.email_service import send_demo_request_notification
        send_demo_request_notification(contact_name, company_name, email, phone, message)
    except Exception as e:
        logger.warning("Demo request email failed: %s", repr(e))

    return {"message": "Demo request submitted! Our team will contact you shortly.", "id": req.id}


@router.get("/my-plan")
async def my_plan(
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Get current user's subscription plan and usage."""
    from app.services.subscription_service import get_usage_summary
    return get_usage_summary(db, user.id)


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
