"""Seed demo data. Run with: python -m app.seed (idempotent)."""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.models  # noqa: F401
from app.core.database import SessionLocal
from app.models import HostedZone, User
from app.schemas.hosted_zone import HostedZoneCreate
from app.services.auth_service import hash_password
from app.services.zone_service import create_zone

SAMPLE_ZONES = [
    {"name": "example.com", "comment": "Production website", "type": "PUBLIC"},
    {"name": "mycompany.io", "comment": "Marketing site", "type": "PUBLIC"},
    {
        "name": "corp.internal",
        "comment": "Internal services",
        "type": "PRIVATE",
        "vpcs": [{"region": "us-east-1", "vpc_id": "vpc-0a1b2c3d4e5f6a7b8"}],
    },
]

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


def seed_sample_zones(db: Session, user: User) -> int:
    """Create the sample zones the user doesn't have yet; returns how many were created."""
    existing = set(db.scalars(select(HostedZone.name).where(HostedZone.user_id == user.id)))
    created = 0
    for sample in SAMPLE_ZONES:
        data = HostedZoneCreate(**sample)
        if data.name not in existing:
            create_zone(db, user.id, data)
            created += 1
    return created


def main() -> None:
    with SessionLocal() as db:
        user, created = seed_demo_user(db)
        zones = seed_sample_zones(db, user)
    print(f"{'Created' if created else 'Already exists'}: {user.email} (account {user.account_id})")
    print(f"Created {zones} sample hosted zone(s).")


if __name__ == "__main__":
    main()
