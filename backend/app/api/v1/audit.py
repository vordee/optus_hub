from fastapi import APIRouter, Depends, Query

from app.api.deps import require_permission
from app.core.database import SessionLocal
from app.schemas.audit import AuditEventResponse
from app.services.audit_service import AuditService

router = APIRouter()


def serialize_audit_event(event) -> AuditEventResponse:
    return AuditEventResponse(
        id=event.id,
        created_at=event.created_at,
        action=event.action,
        status=event.status,
        actor_email=event.actor_email,
        target_type=event.target_type,
        target_id=event.target_id,
        ip_address=event.ip_address,
        user_agent=event.user_agent,
        details=event.details,
    )


@router.get(
    "/audit-events",
    response_model=list[AuditEventResponse],
    dependencies=[Depends(require_permission("audit:read"))],
)
def list_audit_events(limit: int = Query(default=100, ge=1, le=500)) -> list[AuditEventResponse]:
    with SessionLocal() as db:
        return [serialize_audit_event(event) for event in AuditService(db).list_events(limit=limit)]
