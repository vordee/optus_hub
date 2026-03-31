from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.role import Role
from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository
from app.schemas.role import RoleCreateRequest


class RoleService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.role_repository = RoleRepository(db)
        self.permission_repository = PermissionRepository(db)

    def list_roles(self) -> list[Role]:
        return self.role_repository.list_all()

    def list_permissions(self):
        return self.permission_repository.list_all()

    def create_role(self, payload: RoleCreateRequest) -> Role:
        if self.role_repository.get_by_name(payload.name):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role already exists.")

        role = self.role_repository.create(name=payload.name, description=payload.description)
        for permission_code in payload.permission_codes:
            permission = self.permission_repository.get_by_code(permission_code)
            if permission is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown permission: {permission_code}",
                )
            role.permissions.append(permission)

        self.db.commit()
        self.db.refresh(role)
        return role
