from fastapi import HTTPException, status
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.user_repository = UserRepository(db)

    def authenticate(self, payload: LoginRequest) -> TokenResponse:
        user = self._get_or_create_bootstrap_admin(payload.email)

        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        return TokenResponse(access_token=create_access_token(user.email))

    def decode_access_token(self, token: str) -> dict:
        try:
            return decode_access_token(token)
        except InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            ) from exc

    def _get_or_create_bootstrap_admin(self, email: str) -> User:
        user = self.user_repository.get_by_email(email)
        if user is not None:
            return user

        if email != self.settings.bootstrap_admin_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        return self.user_repository.create_bootstrap_admin(
            email=self.settings.bootstrap_admin_email,
            hashed_password=hash_password(self.settings.bootstrap_admin_password),
        )
