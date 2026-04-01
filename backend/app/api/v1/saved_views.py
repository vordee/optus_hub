from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.api.deps import get_current_user_email, require_any_permission
from app.core.database import SessionLocal
from app.schemas.saved_view import SavedViewCreateRequest, SavedViewResponse, SavedViewUpdateRequest
from app.services.audit_service import AuditService
from app.services.saved_view_service import SavedViewService

router = APIRouter()


def serialize_saved_view(view) -> SavedViewResponse:
    return SavedViewResponse(
        id=view.id,
        module=view.module,
        name=view.name,
        filters_json=view.filters_json,
        group_by=view.group_by,
        sort_by=view.sort_by,
        sort_direction=view.sort_direction,
        is_default=view.is_default,
        created_by_email=view.created_by_email,
        updated_by_email=view.updated_by_email,
        created_at=view.created_at,
        updated_at=view.updated_at,
    )


@router.get("/saved-views", response_model=list[SavedViewResponse], dependencies=[Depends(require_any_permission("leads:read", "opportunities:read"))])
def list_saved_views(
    module: str | None = Query(default=None),
    current_user_email: str = Depends(get_current_user_email),
) -> list[SavedViewResponse]:
    with SessionLocal() as db:
        items = SavedViewService(db).list_views(module=module, created_by_email=current_user_email)
        return [serialize_saved_view(item) for item in items]


@router.get("/saved-views/{view_id}", response_model=SavedViewResponse, dependencies=[Depends(require_any_permission("leads:read", "opportunities:read"))])
def get_saved_view(view_id: int, current_user_email: str = Depends(get_current_user_email)) -> SavedViewResponse:
    with SessionLocal() as db:
        view = SavedViewService(db).get_view(view_id, created_by_email=current_user_email)
        return serialize_saved_view(view)


@router.post("/saved-views", response_model=SavedViewResponse, dependencies=[Depends(require_any_permission("leads:write", "opportunities:write"))])
def create_saved_view(
    payload: SavedViewCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> SavedViewResponse:
    with SessionLocal() as db:
        view = SavedViewService(db).create_view(payload, created_by_email=current_user_email)
        AuditService(db).record_event(
            action="crm.saved_view.create",
            status="success",
            actor_email=current_user_email,
            target_type="saved_view",
            target_id=str(view.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"module": view.module, "name": view.name, "is_default": view.is_default},
        )
        return serialize_saved_view(view)


@router.patch("/saved-views/{view_id}", response_model=SavedViewResponse, dependencies=[Depends(require_any_permission("leads:write", "opportunities:write"))])
def update_saved_view(
    view_id: int,
    payload: SavedViewUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> SavedViewResponse:
    with SessionLocal() as db:
        view = SavedViewService(db).update_view(view_id, payload, updated_by_email=current_user_email)
        AuditService(db).record_event(
            action="crm.saved_view.update",
            status="success",
            actor_email=current_user_email,
            target_type="saved_view",
            target_id=str(view.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"module": view.module, "name": view.name, "is_default": view.is_default},
        )
        return serialize_saved_view(view)


@router.delete(
    "/saved-views/{view_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_any_permission("leads:write", "opportunities:write"))],
)
def delete_saved_view(
    view_id: int,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> Response:
    with SessionLocal() as db:
        service = SavedViewService(db)
        view = service.get_view(view_id, created_by_email=current_user_email)
        service.delete_view(view_id, created_by_email=current_user_email)
        AuditService(db).record_event(
            action="crm.saved_view.delete",
            status="success",
            actor_email=current_user_email,
            target_type="saved_view",
            target_id=str(view.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"module": view.module, "name": view.name},
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
