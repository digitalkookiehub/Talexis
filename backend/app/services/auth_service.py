import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.auth.jwt import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.enums import UserRole
from app.exceptions import ConflictError, UnauthorizedError, NotFoundError

logger = logging.getLogger(__name__)


def register_user(
    db: Session, email: str, password: str, full_name: str | None, role: UserRole
) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ConflictError("Email already registered")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("User registered: %s (role=%s)", email, role.value)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password")
    if not user.is_active:
        raise UnauthorizedError("Account is disabled")
    return user


def create_tokens(db: Session, user: User) -> dict:
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token_str = create_refresh_token({"sub": str(user.id)})

    refresh_record = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(refresh_record)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
    }


def refresh_tokens(db: Session, refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")

    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == refresh_token, RefreshToken.revoked == False)
        .first()
    )
    if not record:
        raise UnauthorizedError("Refresh token not found or revoked")

    if record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise UnauthorizedError("Refresh token expired")

    # Revoke old token
    record.revoked = True
    db.commit()

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise UnauthorizedError("User not found")

    return create_tokens(db, user)


def revoke_refresh_token(db: Session, refresh_token: str) -> None:
    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == refresh_token)
        .first()
    )
    if record:
        record.revoked = True
        db.commit()


def update_user(db: Session, user: User, full_name: str | None, email: str | None) -> User:
    if email and email != user.email:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ConflictError("Email already in use")
        user.email = email
    if full_name is not None:
        user.full_name = full_name
    db.commit()
    db.refresh(user)
    return user
