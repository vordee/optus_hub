from app.core.security import decode_access_token
from app.core.security import verify_password
from app.schemas.auth import ChangePasswordRequest, LoginRequest
from app.services.auth_service import AuthService


def test_authenticate_returns_bearer_token(db_session) -> None:
    service = AuthService(db_session)

    response = service.authenticate(
        LoginRequest(email="admin@example.com", password="super-secret")
    )

    assert response.token_type == "bearer"
    assert response.access_token


def test_authenticate_token_contains_subject(db_session) -> None:
    service = AuthService(db_session)

    response = service.authenticate(
        LoginRequest(email="admin@example.com", password="super-secret")
    )
    payload = decode_access_token(response.access_token)

    assert payload["sub"] == "admin@example.com"


def test_authenticate_rejects_invalid_password(db_session) -> None:
    service = AuthService(db_session)
    service.authenticate(LoginRequest(email="admin@example.com", password="super-secret"))

    try:
        service.authenticate(LoginRequest(email="admin@example.com", password="wrong-password"))
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 401
    else:
        raise AssertionError("Expected authentication to fail for invalid password.")


def test_admin_user_has_admin_role_and_permissions(db_session) -> None:
    service = AuthService(db_session)

    user = service.get_authenticated_user("admin@example.com")

    assert "admin" in user.roles
    assert "audit:read" in user.permissions
    assert "users:read" in user.permissions
    assert "roles:write" in user.permissions


def test_change_password_updates_hash(db_session) -> None:
    service = AuthService(db_session)

    service.change_password(
        "admin@example.com",
        ChangePasswordRequest(current_password="super-secret", new_password="new-secret"),
        ip_address="127.0.0.1",
        user_agent="pytest",
    )

    user = service.user_repository.get_by_email("admin@example.com")
    assert user is not None
    assert verify_password("new-secret", user.hashed_password)


def test_change_password_rejects_invalid_current_password(db_session) -> None:
    service = AuthService(db_session)

    try:
        service.change_password(
            "admin@example.com",
            ChangePasswordRequest(current_password="wrong-password", new_password="new-secret"),
            ip_address="127.0.0.1",
            user_agent="pytest",
        )
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 400
    else:
        raise AssertionError("Expected change_password to fail with invalid current password.")
