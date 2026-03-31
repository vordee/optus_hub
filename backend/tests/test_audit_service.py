from app.models.audit_event import AuditEvent
from app.schemas.auth import LoginRequest
from app.schemas.role import RoleCreateRequest
from app.schemas.user import UserCreateRequest
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService
from app.services.role_service import RoleService
from app.services.user_service import UserService


def test_authenticate_records_successful_login_audit_event(db_session) -> None:
    service = AuthService(db_session)

    service.authenticate(
        LoginRequest(email="admin@example.com", password="super-secret"),
        ip_address="127.0.0.1",
        user_agent="pytest",
    )

    events = AuditService(db_session).list_events(limit=10)
    assert events[0].action == "auth.login"
    assert events[0].status == "success"
    assert events[0].actor_email == "admin@example.com"
    assert events[0].ip_address == "127.0.0.1"


def test_authenticate_records_failed_login_audit_event(db_session) -> None:
    service = AuthService(db_session)

    try:
        service.authenticate(
            LoginRequest(email="admin@example.com", password="wrong-password"),
            ip_address="127.0.0.1",
            user_agent="pytest",
        )
    except Exception:
        pass

    events = AuditService(db_session).list_events(limit=10)
    assert events[0].action == "auth.login"
    assert events[0].status == "failure"
    assert events[0].actor_email == "admin@example.com"
    assert events[0].details == {"reason": "invalid_credentials"}


def test_manual_admin_actions_are_listed_in_recent_order(db_session) -> None:
    role = RoleService(db_session).create_role(
        RoleCreateRequest(
            name="manager",
            description="Manager role",
            permission_codes=["users:read"],
        )
    )
    user = UserService(db_session).create_user(
        UserCreateRequest(
            email="manager@example.com",
            full_name="Manager User",
            password="manager-secret",
            role_names=["manager"],
        )
    )
    audit_service = AuditService(db_session)
    audit_service.record_event(
        action="admin.role.create",
        status="success",
        actor_email="admin@example.com",
        target_type="role",
        target_id=str(role.id),
    )
    audit_service.record_event(
        action="admin.user.create",
        status="success",
        actor_email="admin@example.com",
        target_type="user",
        target_id=str(user.id),
    )

    events = audit_service.list_events(limit=2)

    assert [event.action for event in events] == ["admin.user.create", "admin.role.create"]
    assert all(isinstance(event, AuditEvent) for event in events)
