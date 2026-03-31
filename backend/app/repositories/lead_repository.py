from __future__ import annotations

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.lead import Lead


class LeadRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Lead]:
        stmt = (
            select(Lead)
            .options(joinedload(Lead.company), joinedload(Lead.contact))
            .order_by(Lead.created_at.desc(), Lead.id.desc())
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def list_filtered(
        self,
        *,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[Lead]:
        stmt = self._build_filtered_stmt(query=query, status=status)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        return list(self.db.execute(stmt).scalars().unique().all())

    def count_filtered(self, *, query: str | None = None, status: str | None = None) -> int:
        stmt = select(func.count()).select_from(Lead)
        if status:
            stmt = stmt.where(Lead.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(or_(func.lower(Lead.title).like(term), func.lower(func.coalesce(Lead.source, "")).like(term)))
        return int(self.db.execute(stmt).scalar_one())

    def get_by_id(self, lead_id: int) -> Optional[Lead]:
        stmt = select(Lead).options(joinedload(Lead.company), joinedload(Lead.contact)).where(Lead.id == lead_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        company_id: int | None,
        contact_id: int | None,
        title: str,
        description: str | None,
        source: str | None,
        status: str,
    ) -> Lead:
        lead = Lead(
            company_id=company_id,
            contact_id=contact_id,
            title=title,
            description=description,
            source=source,
            status=status,
        )
        self.db.add(lead)
        self.db.flush()
        return lead

    def save(self, lead: Lead) -> Lead:
        self.db.commit()
        self.db.refresh(lead)
        return lead

    def _build_filtered_stmt(self, *, query: str | None, status: str | None):
        stmt = (
            select(Lead)
            .options(joinedload(Lead.company), joinedload(Lead.contact))
            .order_by(Lead.created_at.desc(), Lead.id.desc())
        )
        if status:
            stmt = stmt.where(Lead.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(or_(func.lower(Lead.title).like(term), func.lower(func.coalesce(Lead.source, "")).like(term)))
        return stmt
