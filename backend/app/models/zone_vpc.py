from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.hosted_zone import HostedZone


class ZoneVpc(Base):
    __tablename__ = "zone_vpcs"
    __table_args__ = (UniqueConstraint("zone_id", "region", "vpc_id", name="uq_zone_vpcs_zone_region_vpc"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("hosted_zones.id", ondelete="CASCADE"), index=True)
    region: Mapped[str] = mapped_column(String(32))
    vpc_id: Mapped[str] = mapped_column(String(32))

    zone: Mapped[HostedZone] = relationship(back_populates="vpcs")
