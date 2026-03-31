from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project_task import ProjectTask
from app.repositories.project_phase_repository import ProjectPhaseRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.project_task_repository import ProjectTaskRepository
from app.schemas.project_task import ProjectTaskCreateRequest, ProjectTaskUpdateRequest

PROJECT_TASK_STATUSES = {"pending", "in_progress", "done", "blocked"}


class ProjectTaskService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.project_repository = ProjectRepository(db)
        self.project_phase_repository = ProjectPhaseRepository(db)
        self.project_task_repository = ProjectTaskRepository(db)

    def list_tasks(self, project_id: int) -> list[ProjectTask]:
        self._get_project_or_404(project_id)
        return self.project_task_repository.list_by_project(project_id)

    def create_task(self, project_id: int, payload: ProjectTaskCreateRequest) -> ProjectTask:
        project = self._get_project_or_404(project_id)
        phase = self._resolve_phase(project.id, payload.project_phase_id)
        task = self.project_task_repository.create(
            project_id=project_id,
            project_phase_id=phase.id if phase else None,
            title=payload.title.strip(),
            description=self._normalize_optional(payload.description),
            status=self._validate_status(payload.status),
            assigned_to_email=self._normalize_optional(payload.assigned_to_email),
            due_date=payload.due_date,
        )
        return self.project_task_repository.save(task)

    def update_task(self, project_id: int, task_id: int, payload: ProjectTaskUpdateRequest) -> ProjectTask:
        project = self._get_project_or_404(project_id)
        task = self.project_task_repository.get_by_id(task_id)
        if task is None or task.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project task not found.")

        if payload.project_phase_id is not None:
            phase = self._resolve_phase(project.id, payload.project_phase_id)
            task.project_phase_id = phase.id if phase else None
        if payload.title is not None:
            task.title = payload.title.strip()
        if payload.description is not None:
            task.description = self._normalize_optional(payload.description)
        if payload.status is not None:
            task.status = self._validate_status(payload.status)
        if payload.assigned_to_email is not None:
            task.assigned_to_email = self._normalize_optional(payload.assigned_to_email)
        if payload.due_date is not None:
            task.due_date = payload.due_date

        return self.project_task_repository.save(task)

    def _get_project_or_404(self, project_id: int):
        project = self.project_repository.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project

    def _resolve_phase(self, project_id: int, phase_id: int | None):
        if phase_id is None:
            return None
        phase = self.project_phase_repository.get_by_id(phase_id)
        if phase is None or phase.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown project phase.")
        return phase

    @staticmethod
    def _validate_status(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in PROJECT_TASK_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown project task status.")
        return normalized

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
