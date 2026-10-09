from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._common import utcnow

if TYPE_CHECKING:
    from app.models.change_log import ChangeLog
    from app.models.record import Record
    from app.models.user import User
    from app.models.zone_tag import ZoneTag
    from app.models.zone_vpc import ZoneVpc


class HostedZone(Base):
    __tablename__ = "hosted_zones"
    __table_args__ = (Index("ix_hosted_zones_user_name", "user_id", "name"),)

    id: Mapped[str] = mapped_column(String(21), primary_key=True)  # "Z" + 20 uppercase alphanumerics
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))  # lowercase, trailing dot
    comment: Mapped[str] = mapped_column(String(256), default="")
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="hosted_zones")
    vpcs: Mapped[list[ZoneVpc]] = relationship(back_populates="zone", cascade="all, delete-orphan")
    tags: Mapped[list[ZoneTag]] = relationship(back_populates="zone", cascade="all, delete-orphan")
    records: Mapped[list[Record]] = relationship(back_populates="zone", cascade="all, delete-orphan")
    change_log: Mapped[list[ChangeLog]] = relationship(back_populates="zone", cascade="all, delete-orphan")
