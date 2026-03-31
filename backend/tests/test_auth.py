from app.core.security import decode_access_token
from app.schemas.auth import LoginRequest
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
