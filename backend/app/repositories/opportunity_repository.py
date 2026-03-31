from __future__ import annotations

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.opportunity import Opportunity


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
    ) -> list[Opportunity]:
        stmt = self._build_filtered_stmt(query=query, status=status)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        return list(self.db.execute(stmt).scalars().unique().all())

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
