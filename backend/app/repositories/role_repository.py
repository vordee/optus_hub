from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.permission import Permission
from app.models.role import Role


class RoleRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Role]:
        stmt = select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
        return list(self.db.execute(stmt).scalars().unique().all())

    def get_by_name(self, name: str) -> Role | None:
        stmt = select(Role).options(selectinload(Role.permissions)).where(Role.name == name)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, name: str, description: str) -> Role:
        role = Role(name=name, description=description)
        self.db.add(role)
        self.db.flush()
        return role
