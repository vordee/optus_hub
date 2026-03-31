from app.schemas.role import RoleCreateRequest
from app.schemas.user import UserCreateRequest
from app.services.role_service import RoleService
from app.services.user_service import UserService


def test_create_role_with_permissions(db_session) -> None:
    service = RoleService(db_session)

    role = service.create_role(
        RoleCreateRequest(
            name="manager",
            description="Manager role",
            permission_codes=["users:read"],
        )
    )

    assert role.name == "manager"
    assert sorted(permission.code for permission in role.permissions) == ["users:read"]


def test_create_user_with_role(db_session) -> None:
    role_service = RoleService(db_session)
    user_service = UserService(db_session)
    role_service.create_role(
        RoleCreateRequest(
            name="manager",
            description="Manager role",
            permission_codes=["users:read"],
        )
    )

    user = user_service.create_user(
        UserCreateRequest(
            email="manager@example.com",
            full_name="Manager User",
            password="manager-secret",
            role_names=["manager"],
        )
    )

    assert user.email == "manager@example.com"
    assert [role.name for role in user.roles] == ["manager"]
