from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.hosted_zone import HostedZone


class ZoneTag(Base):
    __tablename__ = "zone_tags"
    __table_args__ = (UniqueConstraint("zone_id", "key", name="uq_zone_tags_zone_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(128))
    value: Mapped[str] = mapped_column(String(256), default="")

    zone: Mapped[HostedZone] = relationship(back_populates="tags")
