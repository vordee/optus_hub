from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import get_current_user_email, require_permission
from app.api.v1.crm_activities import serialize_activity
from app.core.database import SessionLocal
from app.schemas.lead import LeadCreateRequest, LeadDetailResponse, LeadListResponse, LeadResponse, LeadUpdateRequest
from app.schemas.status_history import StatusHistoryResponse
from app.services.audit_service import AuditService
from app.services.lead_service import LeadService

router = APIRouter()


def serialize_lead(lead) -> LeadResponse:
    return LeadResponse(
        id=lead.id,
        company_id=lead.company_id,
        company_name=getattr(lead, "company_name", None) or (lead.company.legal_name if getattr(lead, "company", None) else None),
        contact_id=lead.contact_id,
        contact_name=getattr(lead, "contact_name", None) or (lead.contact.full_name if getattr(lead, "contact", None) else None),
        title=lead.title,
        description=lead.description,
        source=lead.source,
        status=lead.status,
        created_at=lead.created_at,
        next_activity=serialize_activity(lead.next_activity) if getattr(lead, "next_activity", None) else None,
        overdue_activity_count=getattr(lead, "overdue_activity_count", 0),
    )


def serialize_status_history(item) -> StatusHistoryResponse:
    return StatusHistoryResponse(
        id=item.id,
        entity_type=item.entity_type,
        entity_id=item.entity_id,
        from_status=item.from_status,
        to_status=item.to_status,
        note=item.note,
        changed_by_email=item.changed_by_email,
        changed_at=item.changed_at,
    )


@router.get("/leads", response_model=LeadListResponse, dependencies=[Depends(require_permission("leads:read"))])
def list_leads(
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> LeadListResponse:
    with SessionLocal() as db:
        items, total = LeadService(db).list_leads(query=query, status=status, page=page, page_size=page_size)
        return LeadListResponse(items=[serialize_lead(lead) for lead in items], total=total, page=page, page_size=page_size)


@router.get("/leads/{lead_id}", response_model=LeadDetailResponse, dependencies=[Depends(require_permission("leads:read"))])
def get_lead(lead_id: int) -> LeadDetailResponse:
    with SessionLocal() as db:
        service = LeadService(db)
        lead = service.get_lead(lead_id)
        return LeadDetailResponse(
            **serialize_lead(lead).model_dump(),
            activities=[serialize_activity(item) for item in service.list_activities(lead_id, lead=lead)],
            history=[serialize_status_history(item) for item in service.list_status_history(lead_id, lead=lead)],
        )


@router.post("/leads", response_model=LeadResponse, dependencies=[Depends(require_permission("leads:write"))])
def create_lead(
    payload: LeadCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> LeadResponse:
    with SessionLocal() as db:
        lead = LeadService(db).create_lead(payload, changed_by_email=current_user_email)
        AuditService(db).record_event(
            action="crm.lead.create",
            status="success",
            actor_email=current_user_email,
            target_type="lead",
            target_id=str(lead.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"title": lead.title, "company_id": lead.company_id, "contact_id": lead.contact_id, "status": lead.status},
        )
        return serialize_lead(lead)


@router.patch("/leads/{lead_id}", response_model=LeadResponse, dependencies=[Depends(require_permission("leads:write"))])
def update_lead(
    lead_id: int,
    payload: LeadUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> LeadResponse:
    with SessionLocal() as db:
        lead = LeadService(db).update_lead(lead_id, payload, changed_by_email=current_user_email)
        AuditService(db).record_event(
            action="crm.lead.update",
            status="success",
            actor_email=current_user_email,
            target_type="lead",
            target_id=str(lead.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"title": lead.title, "company_id": lead.company_id, "contact_id": lead.contact_id, "status": lead.status},
        )
        return serialize_lead(lead)
