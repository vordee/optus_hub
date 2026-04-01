from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.saved_view import SavedView


class SavedViewRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_module(self, *, module: str) -> list[SavedView]:
        stmt = (
            select(SavedView)
            .where(SavedView.module == module)
            .order_by(SavedView.is_default.desc(), SavedView.name.asc(), SavedView.id.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_by_id(self, view_id: int) -> Optional[SavedView]:
        stmt = select(SavedView).where(SavedView.id == view_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        module: str,
        name: str,
        filters_json: dict,
        group_by: str | None,
        sort_by: str | None,
        sort_direction: str,
        is_default: bool,
        created_by_email: str | None,
    ) -> SavedView:
        view = SavedView(
            module=module,
            name=name,
            filters_json=filters_json,
            group_by=group_by,
            sort_by=sort_by,
            sort_direction=sort_direction,
            is_default=is_default,
            created_by_email=created_by_email,
            updated_by_email=created_by_email,
        )
        self.db.add(view)
        self.db.flush()
        return view

    def save(self, view: SavedView) -> SavedView:
        self.db.commit()
        self.db.refresh(view)
        return view

    def delete(self, view: SavedView) -> None:
        self.db.delete(view)
        self.db.commit()
