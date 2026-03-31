from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreateRequest


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repository = UserRepository(db)
        self.role_repository = RoleRepository(db)

    def list_users(self) -> list[User]:
        return self.user_repository.list_all()

    def create_user(self, payload: UserCreateRequest) -> User:
        if self.user_repository.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists.")

        user = self.user_repository.create(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
            is_active=payload.is_active,
            is_superuser=payload.is_superuser,
        )

        for role_name in payload.role_names:
            role = self.role_repository.get_by_name(role_name)
            if role is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown role: {role_name}",
                )
            user.roles.append(role)

        return self.user_repository.save(user)
