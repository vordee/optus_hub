from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.role import Role
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = (
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .where(User.email == email)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_id(self, user_id: int) -> Optional[User]:
        stmt = (
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .where(User.id == user_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[User]:
        stmt = select(User).options(selectinload(User.roles).selectinload(Role.permissions)).order_by(User.id)
        return list(self.db.execute(stmt).scalars().unique().all())

    def list_superusers(self) -> list[User]:
        stmt = (
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .where(User.is_superuser.is_(True))
            .order_by(User.id)
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def create(
        self,
        email: str,
        full_name: str,
        hashed_password: str,
        is_active: bool = True,
        is_superuser: bool = False,
    ) -> User:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            is_active=is_active,
            is_superuser=is_superuser,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def save(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user
