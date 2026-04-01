from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.project_checklist_item import ProjectChecklistItem


class ProjectChecklistItemRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_filtered(
        self,
        *,
        project_id: int,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[ProjectChecklistItem]:
        stmt = self._build_filtered_stmt(project_id=project_id, query=query, status=status)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        return list(self.db.execute(stmt).scalars().unique().all())

    def count_filtered(self, *, project_id: int, query: str | None = None, status: str | None = None) -> int:
        stmt = select(func.count()).select_from(ProjectChecklistItem).where(ProjectChecklistItem.project_id == project_id)
        if status:
            stmt = stmt.where(ProjectChecklistItem.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(ProjectChecklistItem.title).like(term),
                    func.lower(func.coalesce(ProjectChecklistItem.description, "")).like(term),
                )
            )
        return int(self.db.execute(stmt).scalar_one())

    def get_by_id(self, item_id: int) -> ProjectChecklistItem | None:
        stmt = (
            select(ProjectChecklistItem)
            .options(joinedload(ProjectChecklistItem.project_phase))
            .where(ProjectChecklistItem.id == item_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        project_id: int,
        project_phase_id: int | None,
        title: str,
        description: str | None,
        status: str,
        completed_at,
    ) -> ProjectChecklistItem:
        item = ProjectChecklistItem(
            project_id=project_id,
            project_phase_id=project_phase_id,
            title=title,
            description=description,
            status=status,
            completed_at=completed_at,
        )
        self.db.add(item)
        self.db.flush()
        return item

    def save(self, item: ProjectChecklistItem) -> ProjectChecklistItem:
        self.db.commit()
        self.db.refresh(item)
        return item

    def _build_filtered_stmt(self, *, project_id: int, query: str | None, status: str | None):
        stmt = (
            select(ProjectChecklistItem)
            .options(joinedload(ProjectChecklistItem.project_phase))
            .where(ProjectChecklistItem.project_id == project_id)
            .order_by(ProjectChecklistItem.created_at.desc(), ProjectChecklistItem.id.desc())
        )
        if status:
            stmt = stmt.where(ProjectChecklistItem.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(ProjectChecklistItem.title).like(term),
                    func.lower(func.coalesce(ProjectChecklistItem.description, "")).like(term),
                )
            )
        return stmt
