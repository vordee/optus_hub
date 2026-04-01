from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.time import local_now


class StatusHistory(Base):
    __tablename__ = "status_history"
    __table_args__ = (
        Index("ix_status_history_entity_changed_at_id", "entity_type", "entity_id", "changed_at", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    changed_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    changed_by_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
