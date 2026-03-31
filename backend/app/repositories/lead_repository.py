from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import Lead


class LeadRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Lead]:
        stmt = select(Lead).order_by(Lead.created_at.desc(), Lead.id.desc())
        return list(self.db.execute(stmt).scalars().all())

    def get_by_id(self, lead_id: int) -> Optional[Lead]:
        stmt = select(Lead).where(Lead.id == lead_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        name: str,
        status: str,
        source: Optional[str] = None,
        summary: Optional[str] = None,
        notes: Optional[str] = None,
        company_id: Optional[int] = None,
        contact_id: Optional[int] = None,
    ) -> Lead:
        lead = Lead(
            name=name,
            status=status,
            source=source,
            summary=summary,
            notes=notes,
            company_id=company_id,
            contact_id=contact_id,
        )
        self.db.add(lead)
        self.db.flush()
        return lead

    def save(self, lead: Lead) -> Lead:
        self.db.commit()
        self.db.refresh(lead)
        return lead
