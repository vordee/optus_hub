from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.role import RoleCreateRequest, RoleResponse, RoleUpdateRequest
from app.services.audit_service import AuditService
from app.services.role_service import RoleService

router = APIRouter()


def serialize_role(role) -> RoleResponse:
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=sorted(permission.code for permission in role.permissions),
    )


@router.get("/roles", response_model=list[RoleResponse], dependencies=[Depends(require_permission("roles:read"))])
def list_roles() -> list[RoleResponse]:
    with SessionLocal() as db:
        return [serialize_role(role) for role in RoleService(db).list_roles()]


@router.post("/roles", response_model=RoleResponse, dependencies=[Depends(require_permission("roles:write"))])
def create_role(
    payload: RoleCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> RoleResponse:
    with SessionLocal() as db:
        role = RoleService(db).create_role(payload)
        AuditService(db).record_event(
            action="admin.role.create",
            status="success",
            actor_email=current_user_email,
            target_type="role",
            target_id=str(role.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"name": role.name, "permissions": sorted(permission.code for permission in role.permissions)},
        )
        return serialize_role(role)


@router.patch("/roles/{role_id}", response_model=RoleResponse, dependencies=[Depends(require_permission("roles:write"))])
def update_role(
    role_id: int,
    payload: RoleUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> RoleResponse:
    with SessionLocal() as db:
        role = RoleService(db).update_role(role_id, payload)
        AuditService(db).record_event(
            action="admin.role.update",
            status="success",
            actor_email=current_user_email,
            target_type="role",
            target_id=str(role.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"name": role.name, "description": role.description, "permissions": sorted(permission.code for permission in role.permissions)},
        )
        return serialize_role(role)


@router.get("/permissions", dependencies=[Depends(require_permission("roles:read"))])
def list_permissions() -> list[dict[str, str]]:
    with SessionLocal() as db:
        permissions = RoleService(db).list_permissions()
        return [{"code": permission.code, "description": permission.description} for permission in permissions]
