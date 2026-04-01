from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.company import Company
from app.models.contact import Contact
from app.models.opportunity import Opportunity


@dataclass
class OpportunityListItem:
    id: int
    lead_id: int | None
    company_id: int | None
    company_name: str | None
    contact_id: int | None
    contact_name: str | None
    title: str
    description: str | None
    status: str
    amount: float | None
    created_at: object


class OpportunityRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Opportunity]:
        stmt = (
            select(Opportunity)
            .options(
                joinedload(Opportunity.lead),
                joinedload(Opportunity.company),
                joinedload(Opportunity.contact),
            )
            .order_by(Opportunity.created_at.desc(), Opportunity.id.desc())
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def list_filtered(
        self,
        *,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[OpportunityListItem]:
        stmt = self._build_filtered_list_stmt(query=query, status=status)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        rows = self.db.execute(stmt).all()
        return [
            OpportunityListItem(
                id=row.id,
                lead_id=row.lead_id,
                company_id=row.company_id,
                company_name=row.company_name,
                contact_id=row.contact_id,
                contact_name=row.contact_name,
                title=row.title,
                description=row.description,
                status=row.status,
                amount=float(row.amount) if row.amount is not None else None,
                created_at=row.created_at,
            )
            for row in rows
        ]

    def count_filtered(self, *, query: str | None = None, status: str | None = None) -> int:
        stmt = select(func.count()).select_from(Opportunity)
        if status:
            stmt = stmt.where(Opportunity.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(or_(func.lower(Opportunity.title).like(term), func.lower(func.coalesce(Opportunity.description, "")).like(term)))
        return int(self.db.execute(stmt).scalar_one())

    def get_by_id(self, opportunity_id: int) -> Optional[Opportunity]:
        stmt = (
            select(Opportunity)
            .options(
                joinedload(Opportunity.lead),
                joinedload(Opportunity.company),
                joinedload(Opportunity.contact),
            )
            .where(Opportunity.id == opportunity_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        lead_id: int | None,
        company_id: int | None,
        contact_id: int | None,
        title: str,
        description: str | None,
        status: str,
        amount: float | None,
    ) -> Opportunity:
        opportunity = Opportunity(
            lead_id=lead_id,
            company_id=company_id,
            contact_id=contact_id,
            title=title,
            description=description,
            status=status,
            amount=amount,
        )
        self.db.add(opportunity)
        self.db.flush()
        return opportunity

    def save(self, opportunity: Opportunity) -> Opportunity:
        self.db.commit()
        self.db.refresh(opportunity)
        return opportunity

    def _build_filtered_stmt(self, *, query: str | None, status: str | None):
        stmt = (
            select(Opportunity)
            .options(
                joinedload(Opportunity.lead),
                joinedload(Opportunity.company),
                joinedload(Opportunity.contact),
            )
            .order_by(Opportunity.created_at.desc(), Opportunity.id.desc())
        )
        if status:
            stmt = stmt.where(Opportunity.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Opportunity.title).like(term),
                    func.lower(func.coalesce(Opportunity.description, "")).like(term),
                )
            )
        return stmt

    def _build_filtered_list_stmt(self, *, query: str | None, status: str | None):
        stmt = (
            select(
                Opportunity.id.label("id"),
                Opportunity.lead_id.label("lead_id"),
                Opportunity.company_id.label("company_id"),
                Company.legal_name.label("company_name"),
                Opportunity.contact_id.label("contact_id"),
                Contact.full_name.label("contact_name"),
                Opportunity.title.label("title"),
                Opportunity.description.label("description"),
                Opportunity.status.label("status"),
                Opportunity.amount.label("amount"),
                Opportunity.created_at.label("created_at"),
            )
            .outerjoin(Company, Company.id == Opportunity.company_id)
            .outerjoin(Contact, Contact.id == Opportunity.contact_id)
            .order_by(Opportunity.created_at.desc(), Opportunity.id.desc())
        )
        if status:
            stmt = stmt.where(Opportunity.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Opportunity.title).like(term),
                    func.lower(func.coalesce(Opportunity.description, "")).like(term),
                )
            )
        return stmt
