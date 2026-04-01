from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.repositories.crm_activity_repository import CRMActivityRepository
from app.repositories.company_repository import CompanyRepository
from app.repositories.contact_repository import ContactRepository
from app.repositories.lead_repository import LeadRepository
from app.repositories.status_history_repository import StatusHistoryRepository
from app.schemas.lead import LeadCreateRequest, LeadUpdateRequest

LEAD_STATUSES = {"new", "qualified", "diagnosis", "proposal", "won", "lost"}


class LeadService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.lead_repository = LeadRepository(db)
        self.status_history_repository = StatusHistoryRepository(db)
        self.company_repository = CompanyRepository(db)
        self.contact_repository = ContactRepository(db)
        self.crm_activity_repository = CRMActivityRepository(db)

    def list_leads(
        self,
        *,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Lead], int]:
        items = self.lead_repository.list_filtered(query=query, status=status, page=page, page_size=page_size)
        total = self.lead_repository.count_filtered(query=query, status=status)
        return items, total

    def get_lead(self, lead_id: int) -> Lead:
        lead = self.lead_repository.get_by_id(lead_id)
        if lead is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")
        return lead

    def create_lead(self, payload: LeadCreateRequest, *, changed_by_email: str | None = None) -> Lead:
        company_id, contact_id = self._resolve_relationships(payload.company_id, payload.contact_id)
        validated_status = self._validate_status(payload.status)
        lead = self.lead_repository.create(
            company_id=company_id,
            contact_id=contact_id,
            title=payload.title.strip(),
            description=self._normalize_optional(payload.description),
            source=self._normalize_optional(payload.source),
            status=validated_status,
        )
        self.status_history_repository.create(
            entity_type="lead",
            entity_id=lead.id,
            from_status=None,
            to_status=validated_status,
            changed_by_email=changed_by_email,
        )
        return self.lead_repository.save(lead)

    def update_lead(self, lead_id: int, payload: LeadUpdateRequest, *, changed_by_email: str | None = None) -> Lead:
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
            next_status = self._validate_status(payload.status)
            if next_status != lead.status:
                previous_status = lead.status
                lead.status = next_status
                self.status_history_repository.create(
                    entity_type="lead",
                    entity_id=lead.id,
                    from_status=previous_status,
                    to_status=next_status,
                    changed_by_email=changed_by_email,
                )

        return self.lead_repository.save(lead)

    def list_status_history(self, lead_id: int, *, lead: Lead | None = None):
        if lead is None:
            lead = self.get_lead(lead_id)
        return self.status_history_repository.list_for_entity(entity_type="lead", entity_id=lead.id)

    def list_activities(self, lead_id: int, *, lead: Lead | None = None):
        if lead is None:
            lead = self.get_lead(lead_id)
        return self.crm_activity_repository.list_for_entity(entity_type="lead", entity_id=lead.id)

    def get_next_activity(self, lead_id: int, *, lead: Lead | None = None):
        if lead is None:
            lead = self.get_lead(lead_id)
        return self.crm_activity_repository.get_next_for_entity(entity_type="lead", entity_id=lead.id)

    def count_overdue_activities(self, lead_id: int, *, lead: Lead | None = None) -> int:
        if lead is None:
            lead = self.get_lead(lead_id)
        from app.core.time import local_now

        return self.crm_activity_repository.count_overdue_for_entity(
            entity_type="lead",
            entity_id=lead.id,
            reference_time=local_now(),
        )

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
