from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.project_task import ProjectTask


class ProjectTaskRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_project(self, project_id: int) -> list[ProjectTask]:
        stmt = (
            select(ProjectTask)
            .options(joinedload(ProjectTask.project_phase))
            .where(ProjectTask.project_id == project_id)
            .order_by(ProjectTask.created_at.desc(), ProjectTask.id.desc())
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def list_filtered(
        self,
        *,
        project_id: int,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[ProjectTask]:
        stmt = self._build_filtered_stmt(project_id=project_id, query=query, status=status)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        return list(self.db.execute(stmt).scalars().unique().all())

    def count_filtered(self, *, project_id: int, query: str | None = None, status: str | None = None) -> int:
        stmt = select(func.count()).select_from(ProjectTask).where(ProjectTask.project_id == project_id)
        if status:
            stmt = stmt.where(ProjectTask.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(ProjectTask.title).like(term),
                    func.lower(func.coalesce(ProjectTask.description, "")).like(term),
                    func.lower(func.coalesce(ProjectTask.assigned_to_email, "")).like(term),
                )
            )
        return int(self.db.execute(stmt).scalar_one())

    def get_by_id(self, task_id: int) -> ProjectTask | None:
        stmt = (
            select(ProjectTask)
            .options(joinedload(ProjectTask.project_phase))
            .where(ProjectTask.id == task_id)
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
        assigned_to_email: str | None,
        due_date,
    ) -> ProjectTask:
        task = ProjectTask(
            project_id=project_id,
            project_phase_id=project_phase_id,
            title=title,
            description=description,
            status=status,
            assigned_to_email=assigned_to_email,
            due_date=due_date,
        )
        self.db.add(task)
        self.db.flush()
        return task

    def save(self, task: ProjectTask) -> ProjectTask:
        self.db.commit()
        self.db.refresh(task)
        return task

    def _build_filtered_stmt(self, *, project_id: int, query: str | None, status: str | None):
        stmt = (
            select(ProjectTask)
            .options(joinedload(ProjectTask.project_phase))
            .where(ProjectTask.project_id == project_id)
            .order_by(ProjectTask.created_at.desc(), ProjectTask.id.desc())
        )
        if status:
            stmt = stmt.where(ProjectTask.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(ProjectTask.title).like(term),
                    func.lower(func.coalesce(ProjectTask.description, "")).like(term),
                    func.lower(func.coalesce(ProjectTask.assigned_to_email, "")).like(term),
                )
            )
        return stmt
