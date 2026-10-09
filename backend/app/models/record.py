from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import utcnow

if TYPE_CHECKING:
    from app.models.hosted_zone import HostedZone


class Record(Base):
    __tablename__ = "records"
    __table_args__ = (
        # set_identifier is "" (not NULL) for simple records so this constraint also covers them.
        UniqueConstraint("zone_id", "name", "type", "set_identifier", name="uq_records_zone_name_type_setid"),
        Index("ix_records_zone_name", "zone_id", "name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))  # lowercase, trailing dot
    type: Mapped[str] = mapped_column(String(10))
    ttl: Mapped[int | None] = mapped_column(Integer, nullable=True)  # null for alias records
    values: Mapped[list[str]] = mapped_column(JSON, default=list)
    routing_policy: Mapped[str] = mapped_column(String(20), default="SIMPLE", server_default="SIMPLE")
    set_identifier: Mapped[str] = mapped_column(String(128), default="", server_default="")
    weight: Mapped[int | None] = mapped_column(Integer, nullable=True)
    region: Mapped[str | None] = mapped_column(String(32), nullable=True)
    failover: Mapped[str | None] = mapped_column(String(10), nullable=True)  # PRIMARY | SECONDARY
    geo_location: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    alias_target: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    health_check_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    zone: Mapped[HostedZone] = relationship(back_populates="records")
