from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.repositories.lead_repository import LeadRepository
from app.schemas.lead import LeadCreateRequest, LeadUpdateRequest

ALLOWED_LEAD_STATUSES = {"new", "qualified", "won", "lost"}


class LeadService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lead_repository = LeadRepository(db)

    def list_leads(self) -> list[Lead]:
        return self.lead_repository.list_all()

    def create_lead(self, payload: LeadCreateRequest) -> Lead:
        self._validate_status(payload.status)
        lead = self.lead_repository.create(
            name=payload.name,
            status=payload.status,
            source=payload.source,
            summary=payload.summary,
            notes=payload.notes,
            company_id=payload.company_id,
            contact_id=payload.contact_id,
        )
        return self.lead_repository.save(lead)

    def update_lead(self, lead_id: int, payload: LeadUpdateRequest) -> Lead:
        lead = self.lead_repository.get_by_id(lead_id)
        if lead is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

        if payload.name is not None:
            lead.name = payload.name
        if payload.status is not None:
            self._validate_status(payload.status)
            lead.status = payload.status
        if payload.source is not None:
            lead.source = payload.source
        if payload.summary is not None:
            lead.summary = payload.summary
        if payload.notes is not None:
            lead.notes = payload.notes
        if "company_id" in payload.model_fields_set:
            lead.company_id = payload.company_id
        if "contact_id" in payload.model_fields_set:
            lead.contact_id = payload.contact_id

        return self.lead_repository.save(lead)

    def _validate_status(self, status_value: str) -> None:
        if status_value not in ALLOWED_LEAD_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown lead status: {status_value}",
            )
