from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import utcnow

if TYPE_CHECKING:
    from app.models.change_log import ChangeLog
    from app.models.hosted_zone import HostedZone
    from app.models.session import Session


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    sessions: Mapped[list[Session]] = relationship(back_populates="user", cascade="all, delete-orphan")
    hosted_zones: Mapped[list[HostedZone]] = relationship(back_populates="user", cascade="all, delete-orphan")
    change_log: Mapped[list[ChangeLog]] = relationship(back_populates="user", cascade="all, delete-orphan")
