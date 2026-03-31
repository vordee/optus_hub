from fastapi import APIRouter, Depends

from app.api.deps import get_current_user_email
from app.core.database import SessionLocal
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    with SessionLocal() as db:
        auth_service = AuthService(db)
        return auth_service.authenticate(payload)


@router.get("/me")
def me(current_user_email: str = Depends(get_current_user_email)) -> dict[str, str]:
    return {"email": current_user_email}
