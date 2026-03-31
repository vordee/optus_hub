from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email
from app.core.database import SessionLocal
from app.schemas.auth import (
    AuthenticatedUserResponse,
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request) -> TokenResponse:
    with SessionLocal() as db:
        return AuthService(db).authenticate(
            payload,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )


@router.get("/me", response_model=AuthenticatedUserResponse)
def me(current_user_email: str = Depends(get_current_user_email)) -> AuthenticatedUserResponse:
    with SessionLocal() as db:
        return AuthService(db).get_authenticated_user(current_user_email)


@router.post("/change-password", status_code=204)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> None:
    with SessionLocal() as db:
        AuthService(db).change_password(
            current_user_email,
            payload,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
