from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.contact import ContactCreateRequest, ContactResponse, ContactUpdateRequest
from app.services.audit_service import AuditService
from app.services.contact_service import ContactService

router = APIRouter()


def serialize_contact(contact) -> ContactResponse:
    return ContactResponse(
        id=contact.id,
        company_id=contact.company_id,
        company_name=contact.company.legal_name if contact.company else None,
        full_name=contact.full_name,
        email=contact.email,
        phone=contact.phone,
        position=contact.position,
        is_active=contact.is_active,
        created_at=contact.created_at,
    )


@router.get("/contacts", response_model=list[ContactResponse], dependencies=[Depends(require_permission("contacts:read"))])
def list_contacts() -> list[ContactResponse]:
    with SessionLocal() as db:
        return [serialize_contact(contact) for contact in ContactService(db).list_contacts()]


@router.post("/contacts", response_model=ContactResponse, dependencies=[Depends(require_permission("contacts:write"))])
def create_contact(
    payload: ContactCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ContactResponse:
    with SessionLocal() as db:
        contact = ContactService(db).create_contact(payload)
        AuditService(db).record_event(
            action="crm.contact.create",
            status="success",
            actor_email=current_user_email,
            target_type="contact",
            target_id=str(contact.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"full_name": contact.full_name, "company_id": contact.company_id, "is_active": contact.is_active},
        )
        return serialize_contact(contact)


@router.patch("/contacts/{contact_id}", response_model=ContactResponse, dependencies=[Depends(require_permission("contacts:write"))])
def update_contact(
    contact_id: int,
    payload: ContactUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ContactResponse:
    with SessionLocal() as db:
        contact = ContactService(db).update_contact(contact_id, payload)
        AuditService(db).record_event(
            action="crm.contact.update",
            status="success",
            actor_email=current_user_email,
            target_type="contact",
            target_id=str(contact.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"full_name": contact.full_name, "company_id": contact.company_id, "is_active": contact.is_active},
        )
        return serialize_contact(contact)
