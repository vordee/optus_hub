from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.repositories.company_repository import CompanyRepository
from app.repositories.contact_repository import ContactRepository
from app.repositories.lead_repository import LeadRepository
from app.schemas.lead import LeadCreateRequest, LeadUpdateRequest

LEAD_STATUSES = {"new", "qualified", "diagnosis", "proposal", "won", "lost"}


class LeadService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lead_repository = LeadRepository(db)
        self.company_repository = CompanyRepository(db)
        self.contact_repository = ContactRepository(db)

    def list_leads(self) -> list[Lead]:
        return self.lead_repository.list_all()

    def create_lead(self, payload: LeadCreateRequest) -> Lead:
        company_id, contact_id = self._resolve_relationships(payload.company_id, payload.contact_id)
        lead = self.lead_repository.create(
            company_id=company_id,
            contact_id=contact_id,
            title=payload.title.strip(),
            description=self._normalize_optional(payload.description),
            source=self._normalize_optional(payload.source),
            status=self._validate_status(payload.status),
        )
        return self.lead_repository.save(lead)

    def update_lead(self, lead_id: int, payload: LeadUpdateRequest) -> Lead:
        lead = self.lead_repository.get_by_id(lead_id)
        if lead is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")

        company_id = lead.company_id
        contact_id = lead.contact_id
        if payload.company_id is not None or payload.contact_id is not None:
            company_id, contact_id = self._resolve_relationships(payload.company_id, payload.contact_id)
            lead.company_id = company_id
            lead.contact_id = contact_id

        if payload.title is not None:
            lead.title = payload.title.strip()
        if payload.description is not None:
            lead.description = self._normalize_optional(payload.description)
        if payload.source is not None:
            lead.source = self._normalize_optional(payload.source)
        if payload.status is not None:
            lead.status = self._validate_status(payload.status)

        return self.lead_repository.save(lead)

    def _resolve_relationships(self, company_id: int | None, contact_id: int | None) -> tuple[int | None, int | None]:
        company = self.company_repository.get_by_id(company_id) if company_id is not None else None
        if company_id is not None and company is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown company.")

        contact = self.contact_repository.get_by_id(contact_id) if contact_id is not None else None
        if contact_id is not None and contact is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown contact.")

        resolved_company_id = company.id if company is not None else None
        resolved_contact_id = contact.id if contact is not None else None

        if contact is not None and contact.company_id is not None:
            if resolved_company_id is not None and resolved_company_id != contact.company_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Contact does not belong to the informed company.",
                )
            resolved_company_id = contact.company_id

        return resolved_company_id, resolved_contact_id

    @staticmethod
    def _validate_status(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in LEAD_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown lead status.")
        return normalized

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
