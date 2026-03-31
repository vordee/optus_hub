from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.core.database import SessionLocal
from app.schemas.user import UserCreateRequest, UserResponse
from app.services.user_service import UserService

router = APIRouter()


def serialize_user(user) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        roles=sorted(role.name for role in user.roles),
        permissions=sorted({permission.code for role in user.roles for permission in role.permissions}),
    )


@router.get("/users", response_model=list[UserResponse], dependencies=[Depends(require_permission("users:read"))])
def list_users() -> list[UserResponse]:
    with SessionLocal() as db:
        return [serialize_user(user) for user in UserService(db).list_users()]


@router.post("/users", response_model=UserResponse, dependencies=[Depends(require_permission("users:write"))])
def create_user(payload: UserCreateRequest) -> UserResponse:
    with SessionLocal() as db:
        return serialize_user(UserService(db).create_user(payload))
