import secrets
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import settings
from app.core.errors import AppError
from app.models import Session, User

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def authenticate(db: DbSession, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not verify_password(password, user.password_hash):
        raise AppError("InvalidCredentials", "The email address or password is incorrect.", 401)
    return user


def create_session(db: DbSession, user: User) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_TTL_HOURS)
    db.add(Session(id=token, user_id=user.id, expires_at=expires_at))
    db.commit()
    return token


def get_user_by_session(db: DbSession, token: str) -> User | None:
    session = db.get(Session, token)
    if session is None:
        return None
    expires_at = session.expires_at
    if expires_at.tzinfo is None:  # SQLite drops tzinfo on read
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        return None
    return session.user


def delete_session(db: DbSession, token: str) -> None:
    session = db.get(Session, token)
    if session is not None:
        db.delete(session)
        db.commit()
