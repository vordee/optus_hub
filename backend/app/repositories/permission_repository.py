from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission


class PermissionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Permission]:
        stmt = select(Permission).order_by(Permission.code)
        return list(self.db.execute(stmt).scalars().all())

    def get_by_code(self, code: str) -> Permission | None:
        stmt = select(Permission).where(Permission.code == code)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, code: str, description: str) -> Permission:
        permission = Permission(code=code, description=description)
        self.db.add(permission)
        self.db.flush()
        return permission
