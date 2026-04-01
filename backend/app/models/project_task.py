from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import local_now

if TYPE_CHECKING:
    from app.models.project_phase import ProjectPhase
    from app.models.project import Project


class ProjectTask(Base):
    __tablename__ = "project_tasks"
    __table_args__ = (
        Index("ix_project_tasks_project_status_created_at_id", "project_id", "status", "created_at", "id"),
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
    assigned_to_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
    project: Mapped["Project"] = relationship(back_populates="tasks")
    project_phase: Mapped[Optional["ProjectPhase"]] = relationship(back_populates="tasks", lazy="joined")
