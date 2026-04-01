from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import local_now

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.project_phase import ProjectPhase


class ProjectChecklistItem(Base):
    __tablename__ = "project_checklist_items"
    __table_args__ = (
        Index("ix_project_checklist_items_project_status_created_at_id", "project_id", "status", "created_at", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    project_phase_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("project_phases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
    project: Mapped["Project"] = relationship(back_populates="checklist_items")
    project_phase: Mapped[Optional["ProjectPhase"]] = relationship(lazy="joined")
