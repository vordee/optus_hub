from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.opportunity import Opportunity
from app.repositories.crm_activity_repository import CRMActivityRepository
from app.repositories.company_repository import CompanyRepository
from app.repositories.contact_repository import ContactRepository
from app.repositories.lead_repository import LeadRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.status_history_repository import StatusHistoryRepository
from app.schemas.opportunity import OpportunityCreateRequest, OpportunityTransitionRequest, OpportunityUpdateRequest
from app.services.saved_view_service import SavedViewService

OPPORTUNITY_STATUSES = {"open", "proposal", "won", "lost"}
OPPORTUNITY_TRANSITIONS = {
    "open": {"proposal", "lost"},
    "proposal": {"open", "won", "lost"},
    "won": set(),
    "lost": set(),
}


class OpportunityService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.opportunity_repository = OpportunityRepository(db)
        self.status_history_repository = StatusHistoryRepository(db)
        self.lead_repository = LeadRepository(db)
        self.company_repository = CompanyRepository(db)
        self.contact_repository = ContactRepository(db)
        self.crm_activity_repository = CRMActivityRepository(db)

    def list_opportunities(
        self,
        *,
        query: str | None = None,
        status: str | None = None,
        company_id: int | None = None,
        contact_id: int | None = None,
        lead_id: int | None = None,
        sort_by: str = "created_at",
        sort_direction: str = "desc",
        saved_view_id: int | None = None,
        current_user_email: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Opportunity], int]:
        filters, sort_options = self._resolve_list_options(
            module="opportunities",
            query=query,
            status=status,
            company_id=company_id,
            contact_id=contact_id,
            lead_id=lead_id,
            sort_by=sort_by,
            sort_direction=sort_direction,
            saved_view_id=saved_view_id,
            current_user_email=current_user_email,
        )
        items = self.opportunity_repository.list_filtered(page=page, page_size=page_size, **filters, **sort_options)
        total = self.opportunity_repository.count_filtered(**filters)
        return items, total

    def get_opportunity(self, opportunity_id: int) -> Opportunity:
        opportunity = self.opportunity_repository.get_by_id(opportunity_id)
        if opportunity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")
        return opportunity

    def create_opportunity(self, payload: OpportunityCreateRequest, *, changed_by_email: str | None = None) -> Opportunity:
        lead_id, company_id, contact_id = self._resolve_relationships(
            payload.lead_id,
            payload.company_id,
            payload.contact_id,
        )
        validated_status = self._validate_status(payload.status)
        opportunity = self.opportunity_repository.create(
            lead_id=lead_id,
            company_id=company_id,
            contact_id=contact_id,
            title=payload.title.strip(),
            description=self._normalize_optional(payload.description),
            status=validated_status,
            amount=payload.amount,
        )
        self.status_history_repository.create(
            entity_type="opportunity",
            entity_id=opportunity.id,
            from_status=None,
            to_status=validated_status,
            changed_by_email=changed_by_email,
        )
        return self.opportunity_repository.save(opportunity)

    def update_opportunity(
        self,
        opportunity_id: int,
        payload: OpportunityUpdateRequest,
        *,
        changed_by_email: str | None = None,
    ) -> Opportunity:
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
            next_status = self._validate_status(payload.status)
            if next_status != opportunity.status:
                self._apply_status_transition(
                    opportunity,
                    next_status,
                    changed_by_email=changed_by_email,
                )
        if payload.amount is not None:
            opportunity.amount = payload.amount

        return self.opportunity_repository.save(opportunity)

    def transition_opportunity(
        self,
        opportunity_id: int,
        payload: OpportunityTransitionRequest,
        *,
        changed_by_email: str | None = None,
    ) -> Opportunity:
        opportunity = self.get_opportunity(opportunity_id)
        next_status = self._validate_status(payload.to_status)
        note = self._normalize_optional(payload.note)
        self._apply_status_transition(
            opportunity,
            next_status,
            changed_by_email=changed_by_email,
            note=note,
            enforce_lost_note=True,
        )
        return self.opportunity_repository.save(opportunity)

    def list_status_history(self, opportunity_id: int, *, opportunity: Opportunity | None = None):
        if opportunity is None:
            opportunity = self.get_opportunity(opportunity_id)
        return self.status_history_repository.list_for_entity(
            entity_type="opportunity",
            entity_id=opportunity.id,
        )

    def list_next_statuses(self, opportunity_id: int, *, opportunity: Opportunity | None = None) -> list[str]:
        if opportunity is None:
            opportunity = self.get_opportunity(opportunity_id)
        return sorted(OPPORTUNITY_TRANSITIONS[opportunity.status])

    def list_activities(self, opportunity_id: int, *, opportunity: Opportunity | None = None):
        if opportunity is None:
            opportunity = self.get_opportunity(opportunity_id)
        return self.crm_activity_repository.list_for_entity(entity_type="opportunity", entity_id=opportunity.id)

    def get_next_activity(self, opportunity_id: int, *, opportunity: Opportunity | None = None):
        if opportunity is None:
            opportunity = self.get_opportunity(opportunity_id)
        return self.crm_activity_repository.get_next_for_entity(entity_type="opportunity", entity_id=opportunity.id)

    def count_overdue_activities(self, opportunity_id: int, *, opportunity: Opportunity | None = None) -> int:
        if opportunity is None:
            opportunity = self.get_opportunity(opportunity_id)
        from app.core.time import local_now

        return self.crm_activity_repository.count_overdue_for_entity(
            entity_type="opportunity",
            entity_id=opportunity.id,
            reference_time=local_now(),
        )

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

    def _apply_status_transition(
        self,
        opportunity: Opportunity,
        next_status: str,
        *,
        changed_by_email: str | None = None,
        note: str | None = None,
        enforce_lost_note: bool = False,
    ) -> None:
        previous_status = opportunity.status
        if next_status not in OPPORTUNITY_TRANSITIONS[previous_status]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid opportunity transition.")
        if next_status in {"proposal", "won"} and opportunity.amount is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount is required before proposal or won.")
        if next_status == "lost" and enforce_lost_note and not note:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Loss reason is required.")

        opportunity.status = next_status
        self.status_history_repository.create(
            entity_type="opportunity",
            entity_id=opportunity.id,
            from_status=previous_status,
            to_status=next_status,
            changed_by_email=changed_by_email,
            note=note,
        )

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    def _resolve_list_options(
        self,
        *,
        module: str,
        query: str | None,
        status: str | None,
        company_id: int | None,
        contact_id: int | None,
        lead_id: int | None,
        sort_by: str,
        sort_direction: str,
        saved_view_id: int | None,
        current_user_email: str | None,
    ) -> tuple[dict[str, object], dict[str, object]]:
        if saved_view_id is not None:
            view = SavedViewService(self.db).get_view(saved_view_id, module=module, created_by_email=current_user_email)
            filters, sort_options = self._normalize_view_filters(
                module=module,
                filters=view.filters_json,
                sort_by=view.sort_by,
                sort_direction=view.sort_direction,
            )
            return filters, sort_options
        return self._normalize_view_filters(
            module=module,
            filters={
                "query": query,
                "status": status,
                "company_id": company_id,
                "contact_id": contact_id,
                "lead_id": lead_id,
            },
            sort_by=sort_by,
            sort_direction=sort_direction,
        )

    def _normalize_view_filters(
        self,
        *,
        module: str,
        filters: dict,
        sort_by: str | None,
        sort_direction: str | None,
    ) -> tuple[dict[str, object], dict[str, object]]:
        from app.services.saved_view_service import SAVED_VIEW_FILTER_KEYS, SAVED_VIEW_SORT_DIRECTIONS, SAVED_VIEW_SORT_FIELDS

        allowed_keys = SAVED_VIEW_FILTER_KEYS[module]
        normalized: dict[str, object] = {"query": None, "status": None, "company_id": None, "contact_id": None, "lead_id": None}
        for key, value in filters.items():
            if key not in allowed_keys:
                continue
            if key in {"query", "status"}:
                normalized[key] = self._normalize_optional(value if value is None else str(value))
            else:
                normalized[key] = int(value) if value is not None else None
        normalized_sort_by = self._normalize_optional(sort_by)
        normalized_sort_direction = (sort_direction or "desc").strip().lower()
        if normalized_sort_direction not in SAVED_VIEW_SORT_DIRECTIONS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sort direction.")
        if normalized_sort_by is not None and normalized_sort_by not in SAVED_VIEW_SORT_FIELDS[module]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sort field.")
        filters = {key: value for key, value in normalized.items() if value is not None}
        sort_options = {
            "sort_by": normalized_sort_by or "created_at",
            "sort_direction": normalized_sort_direction,
        }
        return filters, sort_options
