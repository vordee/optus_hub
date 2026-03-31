from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import local_now

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.lead import Lead
    from app.models.opportunity import Opportunity
    from app.models.project import Project


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    position: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
    company: Mapped[Optional["Company"]] = relationship(back_populates="contacts", lazy="joined")
    leads: Mapped[list["Lead"]] = relationship(back_populates="contact", lazy="selectin")
    opportunities: Mapped[list["Opportunity"]] = relationship(back_populates="contact", lazy="selectin")
    projects: Mapped[list["Project"]] = relationship(back_populates="contact", lazy="selectin")
