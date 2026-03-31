from fastapi import HTTPException, status
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthenticatedUserResponse, LoginRequest, TokenResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repository = UserRepository(db)

    def authenticate(self, payload: LoginRequest) -> TokenResponse:
        user = self.user_repository.get_by_email(payload.email)
        if user is None or not user.is_active or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        return TokenResponse(access_token=create_access_token(user.email))

    def get_authenticated_user(self, email: str) -> AuthenticatedUserResponse:
        user = self.user_repository.get_by_email(email)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user is unavailable.",
            )

        return AuthenticatedUserResponse(
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            roles=sorted(role.name for role in user.roles),
            permissions=sorted({permission.code for role in user.roles for permission in role.permissions}),
        )

    def decode_access_token(self, token: str) -> dict:
        try:
            return decode_access_token(token)
        except InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            ) from exc
