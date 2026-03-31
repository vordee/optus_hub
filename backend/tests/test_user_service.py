from fastapi import HTTPException

from app.schemas.role import RoleCreateRequest, RoleUpdateRequest
from app.schemas.user import UserCreateRequest, UserUpdateRequest
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


def test_update_role_replaces_permissions(db_session) -> None:
    service = RoleService(db_session)
    role = service.create_role(
        RoleCreateRequest(
            name="manager",
            description="Manager role",
            permission_codes=["users:read"],
        )
    )

    updated = service.update_role(
        role.id,
        RoleUpdateRequest(
            description="Updated manager role",
            permission_codes=["users:write", "roles:read"],
        ),
    )

    assert updated.description == "Updated manager role"
    assert sorted(permission.code for permission in updated.permissions) == ["roles:read", "users:write"]


def test_update_role_rejects_unknown_permission(db_session) -> None:
    service = RoleService(db_session)
    role = service.create_role(
        RoleCreateRequest(
            name="manager",
            description="Manager role",
            permission_codes=["users:read"],
        )
    )

    try:
        service.update_role(
            role.id,
            RoleUpdateRequest(
                description="Updated manager role",
                permission_codes=["does:not-exist"],
            ),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected update_role to reject unknown permission.")


def test_update_user_changes_profile_password_and_roles(db_session) -> None:
    role_service = RoleService(db_session)
    user_service = UserService(db_session)
    role_service.create_role(
        RoleCreateRequest(
            name="manager",
            description="Manager role",
            permission_codes=["users:read"],
        )
    )
    role_service.create_role(
        RoleCreateRequest(
            name="viewer",
            description="Viewer role",
            permission_codes=["roles:read"],
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

    updated = user_service.update_user(
        user.id,
        UserUpdateRequest(
            full_name="Updated Manager",
            password="new-secret",
            role_names=["viewer"],
            is_active=False,
            is_superuser=True,
        ),
    )

    assert updated.full_name == "Updated Manager"
    assert updated.is_active is False
    assert updated.is_superuser is True
    assert [role.name for role in updated.roles] == ["viewer"]


def test_update_user_rejects_unknown_role(db_session) -> None:
    user_service = UserService(db_session)
    user = user_service.create_user(
        UserCreateRequest(
            email="manager@example.com",
            full_name="Manager User",
            password="manager-secret",
        )
    )

    try:
        user_service.update_user(
            user.id,
            UserUpdateRequest(role_names=["unknown"]),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected update_user to reject unknown role.")
