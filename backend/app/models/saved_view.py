from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.time import local_now


class SavedView(Base):
    __tablename__ = "saved_views"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    module: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    filters_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    group_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sort_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sort_direction: Mapped[str] = mapped_column(String(8), nullable=False, default="desc")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    updated_by_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=local_now, onupdate=local_now, nullable=False)
