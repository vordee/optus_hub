from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import local_now

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.contact import Contact
    from app.models.opportunity import Opportunity
    from app.models.project_phase import ProjectPhase


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    opportunity_id: Mapped[Optional[int]] = mapped_column(ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True, index=True)
    company_id: Mapped[Optional[int]] = mapped_column(ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    contact_id: Mapped[Optional[int]] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="planned", index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
    opportunity: Mapped[Optional["Opportunity"]] = relationship(back_populates="projects", lazy="joined")
    company: Mapped[Optional["Company"]] = relationship(back_populates="projects", lazy="joined")
    contact: Mapped[Optional["Contact"]] = relationship(back_populates="projects", lazy="joined")
    phases: Mapped[list["ProjectPhase"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectPhase.sequence",
    )
