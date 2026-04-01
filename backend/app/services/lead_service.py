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
from app.services.saved_view_service import SavedViewService

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
        company_id: int | None = None,
        contact_id: int | None = None,
        source: str | None = None,
        sort_by: str = "created_at",
        sort_direction: str = "desc",
        saved_view_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Lead], int]:
        filters, sort_options = self._resolve_list_options(
            module="leads",
            query=query,
            status=status,
            company_id=company_id,
            contact_id=contact_id,
            source=source,
            sort_by=sort_by,
            sort_direction=sort_direction,
            saved_view_id=saved_view_id,
        )
        items = self.lead_repository.list_filtered(page=page, page_size=page_size, **filters, **sort_options)
        total = self.lead_repository.count_filtered(**filters)
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

    def _resolve_list_options(
        self,
        *,
        module: str,
        query: str | None,
        status: str | None,
        company_id: int | None,
        contact_id: int | None,
        source: str | None,
        sort_by: str,
        sort_direction: str,
        saved_view_id: int | None,
    ) -> tuple[dict[str, object], dict[str, object]]:
        if saved_view_id is not None:
            view = SavedViewService(self.db).get_view(saved_view_id, module=module)
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
                "source": source,
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
        normalized: dict[str, object] = {"query": None, "status": None, "company_id": None, "contact_id": None, "source": None}
        for key, value in filters.items():
            if key not in allowed_keys:
                continue
            if key in {"query", "status", "source"}:
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
