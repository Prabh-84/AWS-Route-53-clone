"""Seed demo data. Run with: python -m app.seed (idempotent)."""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.models  # noqa: F401
from app.core.database import SessionLocal
from app.models import User
from app.services.auth_service import hash_password

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "Alex Demo"


def random_account_id() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(12))


def seed_demo_user(db: Session) -> tuple[User, bool]:
    """Return (user, created); does nothing if the demo user already exists."""
    user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if user is not None:
        return user, False
    user = User(
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        display_name=DEMO_NAME,
        account_id=random_account_id(),
    )
    db.add(user)
    db.commit()
    return user, True


def main() -> None:
    with SessionLocal() as db:
        user, created = seed_demo_user(db)
    print(f"{'Created' if created else 'Already exists'}: {user.email} (account {user.account_id})")


if __name__ == "__main__":
    main()
