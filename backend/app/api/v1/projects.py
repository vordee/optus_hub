from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectDetailResponse,
    ProjectKickoffRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.schemas.status_history import StatusHistoryResponse
from app.services.audit_service import AuditService
from app.services.project_service import ProjectService
from app.services.project_phase_service import ProjectPhaseService
from app.api.v1.project_phases import serialize_project_phase

router = APIRouter()


def serialize_project(project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        opportunity_id=project.opportunity_id,
        company_id=project.company_id,
        company_name=project.company.legal_name if project.company else None,
        contact_id=project.contact_id,
        contact_name=project.contact.full_name if project.contact else None,
        name=project.name,
        status=project.status,
        description=project.description,
        kickoff_owner_email=project.kickoff_owner_email,
        kickoff_target_date=project.kickoff_target_date,
        kickoff_notes=project.kickoff_notes,
        created_at=project.created_at,
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


@router.get("/projects", response_model=ProjectListResponse, dependencies=[Depends(require_permission("projects:read"))])
def list_projects(
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> ProjectListResponse:
    with SessionLocal() as db:
        items, total = ProjectService(db).list_projects(query=query, status=status, page=page, page_size=page_size)
        return ProjectListResponse(
            items=[serialize_project(project) for project in items],
            total=total,
            page=page,
            page_size=page_size,
        )


@router.get("/projects/{project_id}", response_model=ProjectDetailResponse, dependencies=[Depends(require_permission("projects:read"))])
def get_project(project_id: int) -> ProjectDetailResponse:
    with SessionLocal() as db:
        service = ProjectService(db)
        phase_service = ProjectPhaseService(db)
        project = service.get_project_detail(project_id)
        phase_metrics = phase_service.list_phase_metrics(project_id)
        return ProjectDetailResponse(
            **serialize_project(project).model_dump(),
            phases=[serialize_project_phase(item, phase_metrics.get(item.id)) for item in project.phases],
            history=[serialize_status_history(item) for item in service.list_status_history(project_id)],
        )


@router.post("/projects", response_model=ProjectResponse, dependencies=[Depends(require_permission("projects:write"))])
def create_project(
    payload: ProjectCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ProjectResponse:
    with SessionLocal() as db:
        project = ProjectService(db).create_project(payload, changed_by_email=current_user_email)
        AuditService(db).record_event(
            action="project.create",
            status="success",
            actor_email=current_user_email,
            target_type="project",
            target_id=str(project.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "name": project.name,
                "status": project.status,
                "opportunity_id": project.opportunity_id,
                "kickoff_owner_email": project.kickoff_owner_email,
                "kickoff_target_date": project.kickoff_target_date.isoformat() if project.kickoff_target_date else None,
            },
        )
        return serialize_project(project)


@router.patch("/projects/{project_id}", response_model=ProjectResponse, dependencies=[Depends(require_permission("projects:write"))])
def update_project(
    project_id: int,
    payload: ProjectUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> ProjectResponse:
    with SessionLocal() as db:
        project = ProjectService(db).update_project(project_id, payload, changed_by_email=current_user_email)
        AuditService(db).record_event(
            action="project.update",
            status="success",
            actor_email=current_user_email,
            target_type="project",
            target_id=str(project.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "name": project.name,
                "status": project.status,
                "kickoff_owner_email": project.kickoff_owner_email,
                "kickoff_target_date": project.kickoff_target_date.isoformat() if project.kickoff_target_date else None,
            },
        )
        return serialize_project(project)


@router.post("/projects/from-opportunity/{opportunity_id}", response_model=ProjectResponse, dependencies=[Depends(require_permission("projects:write"))])
def create_project_from_opportunity(
    opportunity_id: int,
    request: Request,
    payload: ProjectKickoffRequest | None = None,
    current_user_email: str = Depends(get_current_user_email),
) -> ProjectResponse:
    with SessionLocal() as db:
        project = ProjectService(db).create_from_opportunity(
            opportunity_id,
            changed_by_email=current_user_email,
            project_name=payload.project_name if payload else None,
            kickoff_owner_email=payload.kickoff_owner_email if payload else None,
            kickoff_target_date=payload.kickoff_target_date if payload else None,
            kickoff_notes=payload.kickoff_notes if payload else None,
        )
        AuditService(db).record_event(
            action="project.create_from_opportunity",
            status="success",
            actor_email=current_user_email,
            target_type="project",
            target_id=str(project.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "name": project.name,
                "opportunity_id": project.opportunity_id,
                "kickoff_owner_email": project.kickoff_owner_email,
                "kickoff_target_date": project.kickoff_target_date.isoformat() if project.kickoff_target_date else None,
            },
        )
        return serialize_project(project)
