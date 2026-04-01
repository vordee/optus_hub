from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.company import Company
from app.models.contact import Contact
from app.models.lead import Lead


@dataclass
class LeadListItem:
    id: int
    company_id: int | None
    company_name: str | None
    contact_id: int | None
    contact_name: str | None
    title: str
    description: str | None
    source: str | None
    status: str
    created_at: object


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
    ) -> list[LeadListItem]:
        stmt = self._build_filtered_list_stmt(query=query, status=status)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        rows = self.db.execute(stmt).all()
        return [
            LeadListItem(
                id=row.id,
                company_id=row.company_id,
                company_name=row.company_name,
                contact_id=row.contact_id,
                contact_name=row.contact_name,
                title=row.title,
                description=row.description,
                source=row.source,
                status=row.status,
                created_at=row.created_at,
            )
            for row in rows
        ]

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

    def _build_filtered_list_stmt(self, *, query: str | None, status: str | None):
        stmt = (
            select(
                Lead.id.label("id"),
                Lead.company_id.label("company_id"),
                Company.legal_name.label("company_name"),
                Lead.contact_id.label("contact_id"),
                Contact.full_name.label("contact_name"),
                Lead.title.label("title"),
                Lead.description.label("description"),
                Lead.source.label("source"),
                Lead.status.label("status"),
                Lead.created_at.label("created_at"),
            )
            .outerjoin(Company, Company.id == Lead.company_id)
            .outerjoin(Contact, Contact.id == Lead.contact_id)
            .order_by(Lead.created_at.desc(), Lead.id.desc())
        )
        if status:
            stmt = stmt.where(Lead.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(or_(func.lower(Lead.title).like(term), func.lower(func.coalesce(Lead.source, "")).like(term)))
        return stmt
