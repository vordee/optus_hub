from typing import Optional

from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent
from app.models.user import User
from app.repositories.audit_event_repository import AuditEventRepository


class AuditService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.audit_repository = AuditEventRepository(db)

    def record_event(
        self,
        *,
        action: str,
        status: str,
        actor: Optional[User] = None,
        actor_email: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> AuditEvent:
        return self.audit_repository.create(
            action=action,
            status=status,
            actor=actor,
            actor_email=actor_email,
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )

    def list_events(self, *, limit: int = 100) -> list[AuditEvent]:
        return self.audit_repository.list_recent(limit=limit)
