from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.core.database import SessionLocal
from app.schemas.role import RoleCreateRequest, RoleResponse
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
def create_role(payload: RoleCreateRequest) -> RoleResponse:
    with SessionLocal() as db:
        return serialize_role(RoleService(db).create_role(payload))


@router.get("/permissions", dependencies=[Depends(require_permission("roles:read"))])
def list_permissions() -> list[dict[str, str]]:
    with SessionLocal() as db:
        permissions = RoleService(db).list_permissions()
        return [{"code": permission.code, "description": permission.description} for permission in permissions]
