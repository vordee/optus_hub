from __future__ import annotations

from typing import Optional

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.crm_activity import CRMActivity


class CRMActivityRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_entity(self, *, entity_type: str, entity_id: int) -> list[CRMActivity]:
        stmt = (
            select(CRMActivity)
            .options(joinedload(CRMActivity.owner_user))
            .where(CRMActivity.entity_type == entity_type, CRMActivity.entity_id == entity_id)
            .order_by(
                case((CRMActivity.status == "pending", 0), else_=1),
                CRMActivity.due_at.asc().nulls_last(),
                CRMActivity.created_at.desc(),
                CRMActivity.id.desc(),
            )
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def count_overdue_for_entity(self, *, entity_type: str, entity_id: int, reference_time) -> int:
        stmt = (
            select(func.count())
            .select_from(CRMActivity)
            .where(
                CRMActivity.entity_type == entity_type,
                CRMActivity.entity_id == entity_id,
                CRMActivity.status == "pending",
                CRMActivity.due_at.is_not(None),
                CRMActivity.due_at < reference_time,
            )
        )
        return int(self.db.execute(stmt).scalar_one())

    def get_next_for_entity(self, *, entity_type: str, entity_id: int) -> Optional[CRMActivity]:
        stmt = (
            select(CRMActivity)
            .options(joinedload(CRMActivity.owner_user))
            .where(
                CRMActivity.entity_type == entity_type,
                CRMActivity.entity_id == entity_id,
                CRMActivity.status == "pending",
            )
            .order_by(CRMActivity.due_at.asc().nulls_last(), CRMActivity.created_at.asc(), CRMActivity.id.asc())
            .limit(1)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_id(self, activity_id: int) -> Optional[CRMActivity]:
        stmt = select(CRMActivity).options(joinedload(CRMActivity.owner_user)).where(CRMActivity.id == activity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        entity_type: str,
        entity_id: int,
        activity_type: str,
        title: str,
        note: str | None,
        due_at,
        owner_user_id: int | None,
        created_by_email: str | None,
    ) -> CRMActivity:
        activity = CRMActivity(
            entity_type=entity_type,
            entity_id=entity_id,
            activity_type=activity_type,
            title=title,
            note=note,
            due_at=due_at,
            owner_user_id=owner_user_id,
            status="pending",
            created_by_email=created_by_email,
        )
        self.db.add(activity)
        self.db.flush()
        return activity

    def save(self, activity: CRMActivity) -> CRMActivity:
        self.db.commit()
        self.db.refresh(activity)
        return activity
