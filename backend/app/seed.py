"""Seed demo data. Run with: python -m app.seed (idempotent)."""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.models  # noqa: F401
from app.core.database import SessionLocal
from app.models import HostedZone, Record, User
from app.schemas.hosted_zone import HostedZoneCreate
from app.schemas.record import RecordCreate
from app.services.auth_service import hash_password
from app.services.record_service import create_record, resolve_name
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

# Sample records per zone (names are relative to the zone). No PTR: that needs a reverse zone.
SAMPLE_RECORDS: dict[str, list[dict]] = {
    "example.com.": [
        {"name": "@", "type": "A", "ttl": 300, "values": ["93.184.216.34"]},
        {"name": "www", "type": "A", "ttl": 300, "values": ["93.184.216.34"]},
        {"name": "www", "type": "AAAA", "ttl": 300, "values": ["2606:2800:220:1:248:1893:25c8:1946"]},
        {"name": "mail", "type": "A", "ttl": 300, "values": ["198.51.100.25"]},
        {"name": "@", "type": "MX", "ttl": 3600, "values": ["10 mail.example.com.", "20 mail2.example.com."]},
        {"name": "@", "type": "TXT", "ttl": 3600, "values": ['"v=spf1 mx include:_spf.example.com ~all"']},
        {"name": "blog", "type": "CNAME", "ttl": 300, "values": ["example.wordpress.com"]},
        {"name": "@", "type": "CAA", "ttl": 3600, "values": ['0 issue "letsencrypt.org"']},
        {"name": "_sip._tcp", "type": "SRV", "ttl": 3600, "values": ["10 60 5060 sip.example.com."]},
        {"name": "dev", "type": "NS", "ttl": 172800, "values": ["ns-1.dev-dns.example.net.", "ns-2.dev-dns.example.org."]},
    ],
    "mycompany.io.": [
        {
            "name": "api", "type": "A", "ttl": 60, "values": ["203.0.113.10"],
            "routing_policy": "WEIGHTED", "set_identifier": "primary", "weight": 70,
        },
        {
            "name": "api", "type": "A", "ttl": 60, "values": ["203.0.113.20"],
            "routing_policy": "WEIGHTED", "set_identifier": "secondary", "weight": 30,
        },
    ],
    "corp.internal.": [
        {"name": "db", "type": "A", "ttl": 300, "values": ["10.0.1.15"]},
    ],
}

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


def seed_sample_records(db: Session, user: User) -> int:
    """Add the sample records that don't exist yet; returns how many were created."""
    created = 0
    for zone_name, samples in SAMPLE_RECORDS.items():
        zone = db.scalar(select(HostedZone).where(HostedZone.user_id == user.id, HostedZone.name == zone_name))
        if zone is None:
            continue
        for sample in samples:
            data = RecordCreate(**sample)
            exists = db.scalar(
                select(Record.id).where(
                    Record.zone_id == zone.id,
                    Record.name == resolve_name(zone, data.name),
                    Record.type == data.type,
                    Record.set_identifier == (data.set_identifier or ""),
                )
            )
            if exists is None:
                create_record(db, zone, data)
                created += 1
    return created


def main() -> None:
    with SessionLocal() as db:
        user, created = seed_demo_user(db)
        zones = seed_sample_zones(db, user)
        records = seed_sample_records(db, user)
    print(f"{'Created' if created else 'Already exists'}: {user.email} (account {user.account_id})")
    print(f"Created {zones} sample hosted zone(s) and {records} sample record(s).")


if __name__ == "__main__":
    main()
