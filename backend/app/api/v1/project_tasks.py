from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.project_task import ProjectTaskCreateRequest, ProjectTaskResponse, ProjectTaskUpdateRequest
from app.services.audit_service import AuditService
from app.services.project_task_service import ProjectTaskService

router = APIRouter()


def serialize_task(task) -> ProjectTaskResponse:
    return ProjectTaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        assigned_to_email=task.assigned_to_email,
        due_date=task.due_date,
        created_at=task.created_at,
    )


@router.get(
    "/projects/{project_id}/tasks",
    response_model=list[ProjectTaskResponse],
    dependencies=[Depends(require_permission("project_tasks:read"))],
)
def list_tasks(project_id: int) -> list[ProjectTaskResponse]:
    with SessionLocal() as db:
        return [serialize_task(task) for task in ProjectTaskService(db).list_tasks(project_id)]


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
        task = ProjectTaskService(db).create_task(project_id, payload)
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
        task = ProjectTaskService(db).update_task(project_id, task_id, payload)
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
