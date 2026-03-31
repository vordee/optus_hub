from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.opportunity import OpportunityCreateRequest, OpportunityResponse, OpportunityUpdateRequest
from app.services.audit_service import AuditService
from app.services.opportunity_service import OpportunityService

router = APIRouter()


def serialize_opportunity(opportunity) -> OpportunityResponse:
    return OpportunityResponse(
        id=opportunity.id,
        lead_id=opportunity.lead_id,
        company_id=opportunity.company_id,
        company_name=opportunity.company.legal_name if opportunity.company else None,
        contact_id=opportunity.contact_id,
        contact_name=opportunity.contact.full_name if opportunity.contact else None,
        title=opportunity.title,
        description=opportunity.description,
        status=opportunity.status,
        amount=float(opportunity.amount) if opportunity.amount is not None else None,
        created_at=opportunity.created_at,
    )


@router.get(
    "/opportunities",
    response_model=list[OpportunityResponse],
    dependencies=[Depends(require_permission("opportunities:read"))],
)
def list_opportunities() -> list[OpportunityResponse]:
    with SessionLocal() as db:
        return [serialize_opportunity(opportunity) for opportunity in OpportunityService(db).list_opportunities()]


@router.post(
    "/opportunities",
    response_model=OpportunityResponse,
    dependencies=[Depends(require_permission("opportunities:write"))],
)
def create_opportunity(
    payload: OpportunityCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> OpportunityResponse:
    with SessionLocal() as db:
        opportunity = OpportunityService(db).create_opportunity(payload)
        AuditService(db).record_event(
            action="crm.opportunity.create",
            status="success",
            actor_email=current_user_email,
            target_type="opportunity",
            target_id=str(opportunity.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "title": opportunity.title,
                "lead_id": opportunity.lead_id,
                "company_id": opportunity.company_id,
                "contact_id": opportunity.contact_id,
                "status": opportunity.status,
                "amount": float(opportunity.amount) if opportunity.amount is not None else None,
            },
        )
        return serialize_opportunity(opportunity)


@router.patch(
    "/opportunities/{opportunity_id}",
    response_model=OpportunityResponse,
    dependencies=[Depends(require_permission("opportunities:write"))],
)
def update_opportunity(
    opportunity_id: int,
    payload: OpportunityUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> OpportunityResponse:
    with SessionLocal() as db:
        opportunity = OpportunityService(db).update_opportunity(opportunity_id, payload)
        AuditService(db).record_event(
            action="crm.opportunity.update",
            status="success",
            actor_email=current_user_email,
            target_type="opportunity",
            target_id=str(opportunity.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "title": opportunity.title,
                "lead_id": opportunity.lead_id,
                "company_id": opportunity.company_id,
                "contact_id": opportunity.contact_id,
                "status": opportunity.status,
                "amount": float(opportunity.amount) if opportunity.amount is not None else None,
            },
        )
        return serialize_opportunity(opportunity)
