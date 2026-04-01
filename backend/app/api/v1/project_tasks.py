from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.project_task import (
    ProjectTaskCreateRequest,
    ProjectTaskDetailResponse,
    ProjectTaskListResponse,
    ProjectTaskResponse,
    ProjectTaskUpdateRequest,
)
from app.schemas.status_history import StatusHistoryResponse
from app.services.audit_service import AuditService
from app.services.project_task_service import ProjectTaskService

router = APIRouter()


def serialize_task(task) -> ProjectTaskResponse:
    return ProjectTaskResponse(
        id=task.id,
        project_id=task.project_id,
        project_phase_id=task.project_phase_id,
        project_phase_name=task.project_phase.name if task.project_phase else None,
        title=task.title,
        description=task.description,
        status=task.status,
        assigned_to_email=task.assigned_to_email,
        due_date=task.due_date,
        created_at=task.created_at,
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
    "/projects/{project_id}/tasks",
    response_model=ProjectTaskListResponse,
    dependencies=[Depends(require_permission("project_tasks:read"))],
)
def list_tasks(
    project_id: int,
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> ProjectTaskListResponse:
    with SessionLocal() as db:
        items, total = ProjectTaskService(db).list_tasks(
            project_id,
            query=query,
            status=status,
            page=page,
            page_size=page_size,
        )
        return ProjectTaskListResponse(
            items=[serialize_task(task) for task in items],
            total=total,
            page=page,
            page_size=page_size,
        )


@router.get(
    "/projects/{project_id}/tasks/{task_id}",
    response_model=ProjectTaskDetailResponse,
    dependencies=[Depends(require_permission("project_tasks:read"))],
)
def get_task(project_id: int, task_id: int) -> ProjectTaskDetailResponse:
    with SessionLocal() as db:
        service = ProjectTaskService(db)
        task = service.get_task(project_id, task_id)
        return ProjectTaskDetailResponse(
            **serialize_task(task).model_dump(),
            history=[serialize_status_history(item) for item in service.list_status_history(project_id, task_id)],
        )


@router.post(
    "/projects/{project_id}/tasks",
    response_model=ProjectTaskResponse,
    dependencies=[Depends(require_permission("project_tasks:write"))],
)
def create_task(
    project_id: int,
    payload: ProjectTaskCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ProjectTaskResponse:
    with SessionLocal() as db:
        task = ProjectTaskService(db).create_task(project_id, payload, changed_by_email=current_user_email)
        AuditService(db).record_event(
            action="project_task.create",
            status="success",
            actor_email=current_user_email,
            target_type="project_task",
            target_id=str(task.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "project_id": project_id,
                "title": task.title,
                "status": task.status,
                "assigned_to_email": task.assigned_to_email,
                "due_date": task.due_date.isoformat() if task.due_date else None,
            },
        )
        return serialize_task(task)


@router.patch(
    "/projects/{project_id}/tasks/{task_id}",
    response_model=ProjectTaskResponse,
    dependencies=[Depends(require_permission("project_tasks:write"))],
)
def update_task(
    project_id: int,
    task_id: int,
    payload: ProjectTaskUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ProjectTaskResponse:
    with SessionLocal() as db:
        task = ProjectTaskService(db).update_task(project_id, task_id, payload, changed_by_email=current_user_email)
        AuditService(db).record_event(
            action="project_task.update",
            status="success",
            actor_email=current_user_email,
            target_type="project_task",
            target_id=str(task.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "project_id": project_id,
                "title": task.title,
                "status": task.status,
                "assigned_to_email": task.assigned_to_email,
                "due_date": task.due_date.isoformat() if task.due_date else None,
            },
        )
        return serialize_task(task)
