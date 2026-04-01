from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.repositories.permission_repository import PermissionRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository

DEFAULT_PERMISSIONS = {
    "audit:read": "Listar eventos de auditoria.",
    "companies:read": "Listar empresas.",
    "companies:write": "Criar e gerenciar empresas.",
    "contacts:read": "Listar contatos.",
    "contacts:write": "Criar e gerenciar contatos.",
    "leads:read": "Listar leads.",
    "leads:write": "Criar e gerenciar leads.",
    "opportunities:read": "Listar oportunidades.",
    "opportunities:write": "Criar e gerenciar oportunidades.",
    "projects:read": "Listar projetos.",
    "projects:write": "Criar e gerenciar projetos.",
    "project_checklists:read": "Listar checklist de projetos.",
    "project_checklists:write": "Criar e gerenciar checklist de projetos.",
    "project_tasks:read": "Listar tarefas de projeto.",
    "project_tasks:write": "Criar e gerenciar tarefas de projeto.",
    "users:read": "Listar usuários.",
    "users:write": "Criar e gerenciar usuários.",
    "roles:read": "Listar papéis.",
    "roles:write": "Criar e gerenciar papéis.",
}


class BootstrapService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.user_repository = UserRepository(db)
        self.role_repository = RoleRepository(db)
        self.permission_repository = PermissionRepository(db)

    def ensure_foundation_data(self) -> None:
        permissions = self._ensure_permissions()
        admin_role = self._ensure_admin_role(permissions)
        self._ensure_superusers_have_admin_role(admin_role)
        self._ensure_admin_user(admin_role)
        self.db.commit()

    def _ensure_permissions(self) -> list:
        items = []
        for code, description in DEFAULT_PERMISSIONS.items():
            permission = self.permission_repository.get_by_code(code)
            if permission is None:
                permission = self.permission_repository.create(code=code, description=description)
            elif permission.description != description:
                permission.description = description
            items.append(permission)
        return items

    def _ensure_admin_role(self, permissions):
        role = self.role_repository.get_by_name("admin")
        if role is None:
            role = self.role_repository.create(name="admin", description="Administrador do sistema.")
        role.permissions = permissions
        return role

    def _ensure_admin_user(self, admin_role) -> None:
        if self._bootstrap_seed_disabled():
            return

        user = self.user_repository.get_by_email(self.settings.bootstrap_admin_email)
        if user is None:
            user = self.user_repository.create(
                email=self.settings.bootstrap_admin_email,
                full_name="System Administrator",
                hashed_password=hash_password(self.settings.bootstrap_admin_password),
                is_active=True,
                is_superuser=True,
            )
        if admin_role not in user.roles:
            user.roles.append(admin_role)

    def _bootstrap_seed_disabled(self) -> bool:
        email = self.settings.bootstrap_admin_email.strip().lower()
        return email.endswith(".invalid")

    def _ensure_superusers_have_admin_role(self, admin_role) -> None:
        for user in self.user_repository.list_superusers():
            if admin_role not in user.roles:
                user.roles.append(admin_role)
