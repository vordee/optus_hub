from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project_task import ProjectTask
from app.repositories.project_phase_repository import ProjectPhaseRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.project_task_repository import ProjectTaskRepository
from app.repositories.status_history_repository import StatusHistoryRepository
from app.schemas.project_task import ProjectTaskCreateRequest, ProjectTaskUpdateRequest

PROJECT_TASK_STATUSES = {"pending", "in_progress", "done", "blocked"}
PROJECT_TASK_TRANSITIONS = {
    "pending": {"in_progress", "blocked"},
    "in_progress": {"blocked", "done"},
    "blocked": {"in_progress", "done"},
    "done": set(),
}


class ProjectTaskService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.project_repository = ProjectRepository(db)
        self.project_phase_repository = ProjectPhaseRepository(db)
        self.project_task_repository = ProjectTaskRepository(db)
        self.status_history_repository = StatusHistoryRepository(db)

    def list_tasks(
        self,
        project_id: int,
        *,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ProjectTask], int]:
        self._get_project_or_404(project_id)
        validated_status = self._validate_status_filter(status)
        normalized_query = self._normalize_optional(query)
        items = self.project_task_repository.list_filtered(
            project_id=project_id,
            query=normalized_query,
            status=validated_status,
            page=page,
            page_size=page_size,
        )
        total = self.project_task_repository.count_filtered(
            project_id=project_id,
            query=normalized_query,
            status=validated_status,
        )
        return items, total

    def get_task(self, project_id: int, task_id: int) -> ProjectTask:
        task = self.project_task_repository.get_by_id(task_id)
        if task is None or task.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project task not found.")
        return task

    def create_task(
        self,
        project_id: int,
        payload: ProjectTaskCreateRequest,
        *,
        changed_by_email: str | None = None,
    ) -> ProjectTask:
        project = self._get_project_or_404(project_id)
        phase = self._resolve_phase(project.id, payload.project_phase_id)
        validated_status = self._validate_status(payload.status)
        task = self.project_task_repository.create(
            project_id=project_id,
            project_phase_id=phase.id if phase else None,
            title=payload.title.strip(),
            description=self._normalize_optional(payload.description),
            status=validated_status,
            assigned_to_email=self._normalize_optional(payload.assigned_to_email),
            due_date=payload.due_date,
        )
        self.status_history_repository.create(
            entity_type="project_task",
            entity_id=task.id,
            from_status=None,
            to_status=validated_status,
            changed_by_email=changed_by_email,
            note=phase.key if phase else None,
        )
        return self.project_task_repository.save(task)

    def update_task(
        self,
        project_id: int,
        task_id: int,
        payload: ProjectTaskUpdateRequest,
        *,
        changed_by_email: str | None = None,
    ) -> ProjectTask:
        project = self._get_project_or_404(project_id)
        task = self.get_task(project_id, task_id)

        if payload.project_phase_id is not None:
            phase = self._resolve_phase(project.id, payload.project_phase_id)
            task.project_phase_id = phase.id if phase else None
        if payload.title is not None:
            task.title = payload.title.strip()
        if payload.description is not None:
            task.description = self._normalize_optional(payload.description)
        if payload.status is not None:
            next_status = self._validate_status(payload.status)
            if next_status != task.status:
                previous_status = task.status
                self._validate_task_transition(previous_status, next_status)
                task.status = next_status
                self.status_history_repository.create(
                    entity_type="project_task",
                    entity_id=task.id,
                    from_status=previous_status,
                    to_status=next_status,
                    changed_by_email=changed_by_email,
                    note=task.project_phase.key if task.project_phase else None,
                )
        if payload.assigned_to_email is not None:
            task.assigned_to_email = self._normalize_optional(payload.assigned_to_email)
        if payload.due_date is not None:
            task.due_date = payload.due_date

        return self.project_task_repository.save(task)

    def list_status_history(self, project_id: int, task_id: int):
        self.get_task(project_id, task_id)
        return self.status_history_repository.list_for_entity(entity_type="project_task", entity_id=task_id)

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

    def _validate_status_filter(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        return self._validate_status(normalized)

    @staticmethod
    def _validate_task_transition(previous_status: str, next_status: str) -> None:
        if next_status not in PROJECT_TASK_TRANSITIONS[previous_status]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid project task transition.")

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
