from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import utcnow

if TYPE_CHECKING:
    from app.models.hosted_zone import HostedZone
    from app.models.user import User


class ChangeLog(Base):
    __tablename__ = "change_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), index=True)
    action: Mapped[str] = mapped_column(String(20))  # CREATE | UPSERT | DELETE
    record_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    record_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="change_log")
    zone: Mapped[HostedZone] = relationship(back_populates="change_log")
