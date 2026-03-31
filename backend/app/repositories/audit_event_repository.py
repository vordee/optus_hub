from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent
from app.models.user import User


class AuditEventRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
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
        event = AuditEvent(
            action=action,
            status=status,
            actor=actor,
            actor_email=actor_email or (actor.email if actor else None),
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def list_recent(self, *, limit: int = 100) -> list[AuditEvent]:
        stmt = select(AuditEvent).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(limit)
        return list(self.db.scalars(stmt))
