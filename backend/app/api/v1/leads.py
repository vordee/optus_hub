from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.lead import LeadCreateRequest, LeadResponse, LeadUpdateRequest
from app.services.audit_service import AuditService
from app.services.lead_service import LeadService

router = APIRouter()


def serialize_lead(lead) -> LeadResponse:
    return LeadResponse(
        id=lead.id,
        company_id=lead.company_id,
        company_name=lead.company.legal_name if lead.company else None,
        contact_id=lead.contact_id,
        contact_name=lead.contact.full_name if lead.contact else None,
        title=lead.title,
        description=lead.description,
        source=lead.source,
        status=lead.status,
        created_at=lead.created_at,
    )


@router.get("/leads", response_model=list[LeadResponse], dependencies=[Depends(require_permission("leads:read"))])
def list_leads() -> list[LeadResponse]:
    with SessionLocal() as db:
        return [serialize_lead(lead) for lead in LeadService(db).list_leads()]


@router.post("/leads", response_model=LeadResponse, dependencies=[Depends(require_permission("leads:write"))])
def create_lead(
    payload: LeadCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> LeadResponse:
    with SessionLocal() as db:
        lead = LeadService(db).create_lead(payload)
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
        lead = LeadService(db).update_lead(lead_id, payload)
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
