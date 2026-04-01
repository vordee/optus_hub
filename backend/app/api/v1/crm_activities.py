from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import get_current_user_email, require_any_permission
from app.core.database import SessionLocal
from app.schemas.crm_activity import CRMActivityCreateRequest, CRMActivityResponse, CRMActivityUpdateRequest
from app.services.audit_service import AuditService
from app.services.crm_activity_service import CRMActivityService

router = APIRouter()


def serialize_activity(activity) -> CRMActivityResponse:
    owner_user = getattr(activity, "owner_user", None)
    return CRMActivityResponse(
        id=activity.id,
        entity_type=activity.entity_type,
        entity_id=activity.entity_id,
        activity_type=activity.activity_type,
        title=activity.title,
        note=activity.note,
        due_at=activity.due_at,
        owner_user_id=activity.owner_user_id,
        owner_user_email=owner_user.email if owner_user else None,
        owner_user_name=owner_user.full_name if owner_user else None,
        status=activity.status,
        completed_at=activity.completed_at,
        created_at=activity.created_at,
        created_by_email=activity.created_by_email,
    )


@router.get(
    "/activities",
    response_model=list[CRMActivityResponse],
    dependencies=[Depends(require_any_permission("leads:read", "opportunities:read"))],
)
def list_activities(
    entity_type: str = Query(...),
    entity_id: int = Query(..., ge=1),
) -> list[CRMActivityResponse]:
    with SessionLocal() as db:
        items = CRMActivityService(db).list_for_entity(entity_type=entity_type, entity_id=entity_id)
        return [serialize_activity(item) for item in items]


@router.post(
    "/activities",
    response_model=CRMActivityResponse,
    dependencies=[Depends(require_any_permission("leads:write", "opportunities:write"))],
)
def create_activity(
    payload: CRMActivityCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> CRMActivityResponse:
    with SessionLocal() as db:
        activity = CRMActivityService(db).create_activity(payload, created_by_email=current_user_email)
        AuditService(db).record_event(
            action="crm.activity.create",
            status="success",
            actor_email=current_user_email,
            target_type=payload.entity_type,
            target_id=str(payload.entity_id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"activity_id": activity.id, "activity_type": activity.activity_type, "title": activity.title},
        )
        return serialize_activity(activity)


@router.patch(
    "/activities/{activity_id}",
    response_model=CRMActivityResponse,
    dependencies=[Depends(require_any_permission("leads:write", "opportunities:write"))],
)
def update_activity(
    activity_id: int,
    payload: CRMActivityUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> CRMActivityResponse:
    with SessionLocal() as db:
        activity = CRMActivityService(db).update_activity(activity_id, payload)
        AuditService(db).record_event(
            action="crm.activity.update",
            status="success",
            actor_email=current_user_email,
            target_type=activity.entity_type,
            target_id=str(activity.entity_id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"activity_id": activity.id, "status": activity.status, "due_at": activity.due_at.isoformat() if activity.due_at else None},
        )
        return serialize_activity(activity)
