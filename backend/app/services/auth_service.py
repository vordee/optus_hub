from __future__ import annotations

from fastapi import HTTPException, status
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, verify_password
from app.core.security import hash_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthenticatedUserResponse, ChangePasswordRequest, LoginRequest, TokenResponse
from app.services.audit_service import AuditService


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repository = UserRepository(db)
        self.audit_service = AuditService(db)

    def authenticate(
        self,
        payload: LoginRequest,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        user = self.user_repository.get_by_email(payload.email)
        if user is None or not user.is_active or not verify_password(payload.password, user.hashed_password):
            self.audit_service.record_event(
                action="auth.login",
                status="failure",
                actor_email=payload.email,
                target_type="user",
                ip_address=ip_address,
                user_agent=user_agent,
                details={"reason": "invalid_credentials"},
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        self.audit_service.record_event(
            action="auth.login",
            status="success",
            actor=user,
            target_type="user",
            target_id=str(user.id),
            ip_address=ip_address,
            user_agent=user_agent,
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

    def change_password(
        self,
        email: str,
        payload: ChangePasswordRequest,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> None:
        user = self.user_repository.get_by_email(email)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user is unavailable.",
            )

        if not verify_password(payload.current_password, user.hashed_password):
            self.audit_service.record_event(
                action="auth.change_password",
                status="failure",
                actor=user,
                target_type="user",
                target_id=str(user.id),
                ip_address=ip_address,
                user_agent=user_agent,
                details={"reason": "invalid_current_password"},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is invalid.",
            )

        user.hashed_password = hash_password(payload.new_password)
        self.user_repository.save(user)
        self.audit_service.record_event(
            action="auth.change_password",
            status="success",
            actor=user,
            target_type="user",
            target_id=str(user.id),
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def decode_access_token(self, token: str) -> dict:
        try:
            return decode_access_token(token)
        except InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            ) from exc
