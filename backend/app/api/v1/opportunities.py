from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.opportunity import (
    OpportunityCreateRequest,
    OpportunityDetailResponse,
    OpportunityListResponse,
    OpportunityResponse,
    OpportunityUpdateRequest,
)
from app.schemas.status_history import StatusHistoryResponse
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


@router.get(
    "/opportunities",
    response_model=OpportunityListResponse,
    dependencies=[Depends(require_permission("opportunities:read"))],
)
def list_opportunities(
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> OpportunityListResponse:
    with SessionLocal() as db:
        items, total = OpportunityService(db).list_opportunities(query=query, status=status, page=page, page_size=page_size)
        return OpportunityListResponse(items=[serialize_opportunity(opportunity) for opportunity in items], total=total, page=page, page_size=page_size)


@router.get(
    "/opportunities/{opportunity_id}",
    response_model=OpportunityDetailResponse,
    dependencies=[Depends(require_permission("opportunities:read"))],
)
def get_opportunity(opportunity_id: int) -> OpportunityDetailResponse:
    with SessionLocal() as db:
        service = OpportunityService(db)
        opportunity = service.get_opportunity(opportunity_id)
        return OpportunityDetailResponse(
            **serialize_opportunity(opportunity).model_dump(),
            history=[serialize_status_history(item) for item in service.list_status_history(opportunity_id)],
        )


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
        opportunity = OpportunityService(db).create_opportunity(payload, changed_by_email=current_user_email)
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
        opportunity = OpportunityService(db).update_opportunity(
            opportunity_id,
            payload,
            changed_by_email=current_user_email,
        )
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
