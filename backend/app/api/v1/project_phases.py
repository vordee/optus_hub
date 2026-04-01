from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.project_phase import ProjectPhaseResponse, ProjectPhaseUpdateRequest
from app.services.audit_service import AuditService
from app.services.project_phase_service import ProjectPhaseService

router = APIRouter()


def serialize_project_phase(phase, metrics=None) -> ProjectPhaseResponse:
    metrics = ProjectPhaseService.build_metrics_for_phase(phase, metrics)
    return ProjectPhaseResponse(
        id=phase.id,
        project_id=phase.project_id,
        key=phase.key,
        name=phase.name,
        sequence=phase.sequence,
        status=phase.status,
        notes=phase.notes,
        started_at=phase.started_at,
        completed_at=phase.completed_at,
        created_at=phase.created_at,
        task_count=metrics.task_count,
        pending_task_count=metrics.pending_task_count,
        in_progress_task_count=metrics.in_progress_task_count,
        blocked_task_count=metrics.blocked_task_count,
        done_task_count=metrics.done_task_count,
        duration_days=metrics.duration_days,
    )


@router.get(
    "/projects/{project_id}/phases",
    response_model=list[ProjectPhaseResponse],
    dependencies=[Depends(require_permission("projects:read"))],
)
def list_project_phases(project_id: int) -> list[ProjectPhaseResponse]:
    with SessionLocal() as db:
        service = ProjectPhaseService(db)
        phases = service.list_phases(project_id)
        metrics = service.list_phase_metrics(project_id)
        return [serialize_project_phase(phase, metrics.get(phase.id)) for phase in phases]


@router.patch(
    "/projects/{project_id}/phases/{phase_id}",
    response_model=ProjectPhaseResponse,
    dependencies=[Depends(require_permission("projects:write"))],
)
def update_project_phase(
    project_id: int,
    phase_id: int,
    payload: ProjectPhaseUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ProjectPhaseResponse:
    with SessionLocal() as db:
        service = ProjectPhaseService(db)
        phase = service.update_phase(
            project_id,
            phase_id,
            payload,
            changed_by_email=current_user_email,
        )
        AuditService(db).record_event(
            action="project.phase.update",
            status="success",
            actor_email=current_user_email,
            target_type="project_phase",
            target_id=str(phase.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"project_id": project_id, "phase_key": phase.key, "status": phase.status},
        )
        return serialize_project_phase(phase, service.build_metrics_for_phase(phase))
