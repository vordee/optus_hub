from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email
from app.core.database import SessionLocal
from app.schemas.lead import LeadCreateRequest, LeadResponse, LeadUpdateRequest
from app.services.audit_service import AuditService
from app.services.lead_service import LeadService

router = APIRouter()


def serialize_lead(lead) -> LeadResponse:
    return LeadResponse(
        id=lead.id,
        name=lead.name,
        status=lead.status,
        source=lead.source,
        summary=lead.summary,
        notes=lead.notes,
        company_id=lead.company_id,
        contact_id=lead.contact_id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.get("/leads", response_model=list[LeadResponse])
def list_leads(current_user_email: str = Depends(get_current_user_email)) -> list[LeadResponse]:
    with SessionLocal() as db:
        return [serialize_lead(lead) for lead in LeadService(db).list_leads()]


@router.post("/leads", response_model=LeadResponse)
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
            details={
                "name": lead.name,
                "status": lead.status,
                "company_id": lead.company_id,
                "contact_id": lead.contact_id,
            },
        )
        return serialize_lead(lead)


@router.patch("/leads/{lead_id}", response_model=LeadResponse)
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
            details={
                "name": lead.name,
                "status": lead.status,
                "company_id": lead.company_id,
                "contact_id": lead.contact_id,
            },
        )
        return serialize_lead(lead)
