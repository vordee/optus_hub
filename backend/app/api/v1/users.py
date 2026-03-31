from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest
from app.services.audit_service import AuditService
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
def create_user(
    payload: UserCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> UserResponse:
    with SessionLocal() as db:
        user = UserService(db).create_user(payload)
        AuditService(db).record_event(
            action="admin.user.create",
            status="success",
            actor_email=current_user_email,
            target_type="user",
            target_id=str(user.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"email": user.email, "roles": sorted(role.name for role in user.roles)},
        )
        return serialize_user(user)


@router.patch("/users/{user_id}", response_model=UserResponse, dependencies=[Depends(require_permission("users:write"))])
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> UserResponse:
    with SessionLocal() as db:
        user = UserService(db).update_user(user_id, payload)
        AuditService(db).record_event(
            action="admin.user.update",
            status="success",
            actor_email=current_user_email,
            target_type="user",
            target_id=str(user.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "roles": sorted(role.name for role in user.roles),
            },
        )
        return serialize_user(user)
