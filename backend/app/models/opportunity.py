from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import local_now

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.contact import Contact
    from app.models.lead import Lead
    from app.models.project import Project


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lead_id: Mapped[Optional[int]] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    company_id: Mapped[Optional[int]] = mapped_column(ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    contact_id: Mapped[Optional[int]] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open", index=True)
    amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
    lead: Mapped[Optional["Lead"]] = relationship(back_populates="opportunities", lazy="joined")
    company: Mapped[Optional["Company"]] = relationship(back_populates="opportunities", lazy="joined")
    contact: Mapped[Optional["Contact"]] = relationship(back_populates="opportunities", lazy="joined")
    projects: Mapped[list["Project"]] = relationship(back_populates="opportunity", lazy="selectin")
