from fastapi import APIRouter, Depends

from app.api.deps import get_current_user_email
from app.core.database import SessionLocal
from app.schemas.auth import AuthenticatedUserResponse, LoginRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    with SessionLocal() as db:
        return AuthService(db).authenticate(payload)


@router.get("/me", response_model=AuthenticatedUserResponse)
def me(current_user_email: str = Depends(get_current_user_email)) -> AuthenticatedUserResponse:
    with SessionLocal() as db:
        return AuthService(db).get_authenticated_user(current_user_email)
