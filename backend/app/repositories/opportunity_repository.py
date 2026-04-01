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
        company_id: int | None = None,
        contact_id: int | None = None,
        lead_id: int | None = None,
        sort_by: str = "created_at",
        sort_direction: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> list[OpportunityListItem]:
        stmt = self._build_filtered_list_stmt(
            query=query,
            status=status,
            company_id=company_id,
            contact_id=contact_id,
            lead_id=lead_id,
            sort_by=sort_by,
            sort_direction=sort_direction,
        )
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

    def count_filtered(
        self,
        *,
        query: str | None = None,
        status: str | None = None,
        company_id: int | None = None,
        contact_id: int | None = None,
        lead_id: int | None = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Opportunity)
            .outerjoin(Company, Company.id == Opportunity.company_id)
            .outerjoin(Contact, Contact.id == Opportunity.contact_id)
        )
        stmt = self._apply_filters(
            stmt,
            query=query,
            status=status,
            company_id=company_id,
            contact_id=contact_id,
            lead_id=lead_id,
        )
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

    def _apply_filters(
        self,
        stmt,
        *,
        query: str | None,
        status: str | None,
        company_id: int | None,
        contact_id: int | None,
        lead_id: int | None,
    ):
        if status:
            stmt = stmt.where(Opportunity.status == status)
        if company_id is not None:
            stmt = stmt.where(Opportunity.company_id == company_id)
        if contact_id is not None:
            stmt = stmt.where(Opportunity.contact_id == contact_id)
        if lead_id is not None:
            stmt = stmt.where(Opportunity.lead_id == lead_id)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Opportunity.title).like(term),
                    func.lower(func.coalesce(Opportunity.description, "")).like(term),
                    func.lower(func.coalesce(Company.legal_name, "")).like(term),
                    func.lower(func.coalesce(Contact.full_name, "")).like(term),
                )
            )
        return stmt

    def _resolve_sort_column(self, sort_by: str):
        sort_map = {
            "created_at": Opportunity.created_at,
            "title": Opportunity.title,
            "status": Opportunity.status,
            "amount": Opportunity.amount,
            "company_name": Company.legal_name,
            "contact_name": Contact.full_name,
            "lead_id": Opportunity.lead_id,
        }
        return sort_map.get(sort_by, Opportunity.created_at)

    def _apply_sort(self, stmt, *, sort_by: str, sort_direction: str):
        column = self._resolve_sort_column(sort_by)
        if sort_direction == "asc":
            return stmt.order_by(column.asc().nulls_last(), Opportunity.id.asc())
        return stmt.order_by(column.desc().nulls_last(), Opportunity.id.desc())

    def _build_filtered_stmt(
        self,
        *,
        query: str | None,
        status: str | None,
        company_id: int | None,
        contact_id: int | None,
        lead_id: int | None,
        sort_by: str,
        sort_direction: str,
    ):
        stmt = (
            select(Opportunity)
            .options(
                joinedload(Opportunity.lead),
                joinedload(Opportunity.company),
                joinedload(Opportunity.contact),
            )
            .outerjoin(Company, Company.id == Opportunity.company_id)
            .outerjoin(Contact, Contact.id == Opportunity.contact_id)
        )
        stmt = self._apply_filters(
            stmt,
            query=query,
            status=status,
            company_id=company_id,
            contact_id=contact_id,
            lead_id=lead_id,
        )
        stmt = self._apply_sort(stmt, sort_by=sort_by, sort_direction=sort_direction)
        return stmt

    def _build_filtered_list_stmt(
        self,
        *,
        query: str | None,
        status: str | None,
        company_id: int | None,
        contact_id: int | None,
        lead_id: int | None,
        sort_by: str,
        sort_direction: str,
    ):
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
        )
        stmt = self._apply_filters(
            stmt,
            query=query,
            status=status,
            company_id=company_id,
            contact_id=contact_id,
            lead_id=lead_id,
        )
        stmt = self._apply_sort(stmt, sort_by=sort_by, sort_direction=sort_direction)
        return stmt
