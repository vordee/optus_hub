from __future__ import annotations

from typing import Optional

from sqlalchemy import select
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
