from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.project_checklist_item import (
    ProjectChecklistItemCreateRequest,
    ProjectChecklistItemDetailResponse,
    ProjectChecklistItemListResponse,
    ProjectChecklistItemResponse,
    ProjectChecklistItemUpdateRequest,
)
from app.schemas.status_history import StatusHistoryResponse
from app.services.audit_service import AuditService
from app.services.project_checklist_service import ProjectChecklistService

router = APIRouter()


def serialize_item(item) -> ProjectChecklistItemResponse:
    return ProjectChecklistItemResponse(
        id=item.id,
        project_id=item.project_id,
        project_phase_id=item.project_phase_id,
        project_phase_name=item.project_phase.name if item.project_phase else None,
        title=item.title,
        description=item.description,
        status=item.status,
        completed_at=item.completed_at,
        created_at=item.created_at,
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
    "/projects/{project_id}/checklist-items",
    response_model=ProjectChecklistItemListResponse,
    dependencies=[Depends(require_permission("project_checklists:read"))],
)
def list_checklist_items(
    project_id: int,
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> ProjectChecklistItemListResponse:
    with SessionLocal() as db:
        items, total = ProjectChecklistService(db).list_items(
            project_id,
            query=query,
            status=status,
            page=page,
            page_size=page_size,
        )
        return ProjectChecklistItemListResponse(
            items=[serialize_item(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )


@router.get(
    "/projects/{project_id}/checklist-items/{item_id}",
    response_model=ProjectChecklistItemDetailResponse,
    dependencies=[Depends(require_permission("project_checklists:read"))],
)
def get_checklist_item(project_id: int, item_id: int) -> ProjectChecklistItemDetailResponse:
    with SessionLocal() as db:
        service = ProjectChecklistService(db)
        item = service.get_item(project_id, item_id)
        return ProjectChecklistItemDetailResponse(
            **serialize_item(item).model_dump(),
            history=[serialize_status_history(entry) for entry in service.list_status_history(project_id, item_id)],
        )


@router.post(
    "/projects/{project_id}/checklist-items",
    response_model=ProjectChecklistItemResponse,
    dependencies=[Depends(require_permission("project_checklists:write"))],
)
def create_checklist_item(
    project_id: int,
    payload: ProjectChecklistItemCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ProjectChecklistItemResponse:
    with SessionLocal() as db:
        item = ProjectChecklistService(db).create_item(project_id, payload, changed_by_email=current_user_email)
        AuditService(db).record_event(
            action="project_checklist_item.create",
            status="success",
            actor_email=current_user_email,
            target_type="project_checklist_item",
            target_id=str(item.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "project_id": project_id,
                "title": item.title,
                "status": item.status,
                "project_phase_id": item.project_phase_id,
            },
        )
        return serialize_item(item)


@router.patch(
    "/projects/{project_id}/checklist-items/{item_id}",
    response_model=ProjectChecklistItemResponse,
    dependencies=[Depends(require_permission("project_checklists:write"))],
)
def update_checklist_item(
    project_id: int,
    item_id: int,
    payload: ProjectChecklistItemUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ProjectChecklistItemResponse:
    with SessionLocal() as db:
        item = ProjectChecklistService(db).update_item(project_id, item_id, payload, changed_by_email=current_user_email)
        AuditService(db).record_event(
            action="project_checklist_item.update",
            status="success",
            actor_email=current_user_email,
            target_type="project_checklist_item",
            target_id=str(item.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "project_id": project_id,
                "title": item.title,
                "status": item.status,
                "project_phase_id": item.project_phase_id,
            },
        )
        return serialize_item(item)
