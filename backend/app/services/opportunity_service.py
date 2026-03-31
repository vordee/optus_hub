from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.opportunity import Opportunity
from app.repositories.company_repository import CompanyRepository
from app.repositories.contact_repository import ContactRepository
from app.repositories.lead_repository import LeadRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.schemas.opportunity import OpportunityCreateRequest, OpportunityUpdateRequest

OPPORTUNITY_STATUSES = {"open", "proposal", "won", "lost"}


class OpportunityService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.opportunity_repository = OpportunityRepository(db)
        self.lead_repository = LeadRepository(db)
        self.company_repository = CompanyRepository(db)
        self.contact_repository = ContactRepository(db)

    def list_opportunities(self) -> list[Opportunity]:
        return self.opportunity_repository.list_all()

    def create_opportunity(self, payload: OpportunityCreateRequest) -> Opportunity:
        lead_id, company_id, contact_id = self._resolve_relationships(
            payload.lead_id,
            payload.company_id,
            payload.contact_id,
        )
        opportunity = self.opportunity_repository.create(
            lead_id=lead_id,
            company_id=company_id,
            contact_id=contact_id,
            title=payload.title.strip(),
            description=self._normalize_optional(payload.description),
            status=self._validate_status(payload.status),
            amount=payload.amount,
        )
        return self.opportunity_repository.save(opportunity)

    def update_opportunity(self, opportunity_id: int, payload: OpportunityUpdateRequest) -> Opportunity:
        opportunity = self.opportunity_repository.get_by_id(opportunity_id)
        if opportunity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")

        if payload.lead_id is not None or payload.company_id is not None or payload.contact_id is not None:
            lead_id, company_id, contact_id = self._resolve_relationships(
                payload.lead_id,
                payload.company_id,
                payload.contact_id,
            )
            opportunity.lead_id = lead_id
            opportunity.company_id = company_id
            opportunity.contact_id = contact_id

        if payload.title is not None:
            opportunity.title = payload.title.strip()
        if payload.description is not None:
            opportunity.description = self._normalize_optional(payload.description)
        if payload.status is not None:
            opportunity.status = self._validate_status(payload.status)
        if payload.amount is not None:
            opportunity.amount = payload.amount

        return self.opportunity_repository.save(opportunity)

    def _resolve_relationships(
        self,
        lead_id: int | None,
        company_id: int | None,
        contact_id: int | None,
    ) -> tuple[int | None, int | None, int | None]:
        lead = self.lead_repository.get_by_id(lead_id) if lead_id is not None else None
        if lead_id is not None and lead is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown lead.")

        company = self.company_repository.get_by_id(company_id) if company_id is not None else None
        if company_id is not None and company is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown company.")

        contact = self.contact_repository.get_by_id(contact_id) if contact_id is not None else None
        if contact_id is not None and contact is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown contact.")

        resolved_lead_id = lead.id if lead is not None else None
        resolved_company_id = company.id if company is not None else None
        resolved_contact_id = contact.id if contact is not None else None

        if lead is not None:
            if resolved_company_id is not None and lead.company_id is not None and resolved_company_id != lead.company_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lead does not belong to the informed company.")
            if resolved_contact_id is not None and lead.contact_id is not None and resolved_contact_id != lead.contact_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lead does not belong to the informed contact.")
            if lead.company_id is not None:
                resolved_company_id = lead.company_id
            if lead.contact_id is not None:
                resolved_contact_id = lead.contact_id

        if contact is not None and contact.company_id is not None:
            if resolved_company_id is not None and resolved_company_id != contact.company_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact does not belong to the informed company.")
            resolved_company_id = contact.company_id

        return resolved_lead_id, resolved_company_id, resolved_contact_id

    @staticmethod
    def _validate_status(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in OPPORTUNITY_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown opportunity status.")
        return normalized

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
