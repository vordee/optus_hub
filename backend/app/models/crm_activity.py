from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import local_now

if TYPE_CHECKING:
    from app.models.user import User


class CRMActivity(Base):
    __tablename__ = "crm_activities"
    __table_args__ = (
        Index("ix_crm_activities_entity", "entity_type", "entity_id"),
        Index("ix_crm_activities_status_due", "status", "due_at"),
        Index("ix_crm_activities_owner_status_due", "owner_user_id", "status", "due_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[int] = mapped_column(nullable=False)
    activity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    owner_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
    created_by_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    owner_user: Mapped[Optional["User"]] = relationship(lazy="joined")
