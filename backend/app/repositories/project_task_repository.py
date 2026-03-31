from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.project_task import ProjectTask


class ProjectTaskRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_project(self, project_id: int) -> list[ProjectTask]:
        stmt = (
            select(ProjectTask)
            .options(joinedload(ProjectTask.project), joinedload(ProjectTask.project_phase))
            .where(ProjectTask.project_id == project_id)
            .order_by(ProjectTask.created_at.desc(), ProjectTask.id.desc())
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def get_by_id(self, task_id: int) -> ProjectTask | None:
        stmt = (
            select(ProjectTask)
            .options(joinedload(ProjectTask.project), joinedload(ProjectTask.project_phase))
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
