from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import local_now

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.lead import Lead
    from app.models.opportunity import Opportunity
    from app.models.project import Project


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    trade_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
    contacts: Mapped[list["Contact"]] = relationship(back_populates="company", lazy="selectin")
    leads: Mapped[list["Lead"]] = relationship(back_populates="company", lazy="selectin")
    opportunities: Mapped[list["Opportunity"]] = relationship(back_populates="company", lazy="selectin")
    projects: Mapped[list["Project"]] = relationship(back_populates="company", lazy="selectin")
