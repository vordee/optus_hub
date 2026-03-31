from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.status_history import StatusHistory


class StatusHistoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        entity_type: str,
        entity_id: int,
        from_status: str | None,
        to_status: str,
        changed_by_email: str | None,
        note: str | None = None,
    ) -> StatusHistory:
        entry = StatusHistory(
            entity_type=entity_type,
            entity_id=entity_id,
            from_status=from_status,
            to_status=to_status,
            changed_by_email=changed_by_email,
            note=note,
        )
        self.db.add(entry)
        self.db.flush()
        return entry

    def list_for_entity(self, *, entity_type: str, entity_id: int) -> list[StatusHistory]:
        stmt = (
            select(StatusHistory)
            .where(StatusHistory.entity_type == entity_type, StatusHistory.entity_id == entity_id)
            .order_by(StatusHistory.changed_at.desc(), StatusHistory.id.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def count_for_entity(self, *, entity_type: str, entity_id: int) -> int:
        stmt = select(func.count()).select_from(StatusHistory).where(
            StatusHistory.entity_type == entity_type,
            StatusHistory.entity_id == entity_id,
        )
        return int(self.db.execute(stmt).scalar_one())
