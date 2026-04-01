from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.time import local_now
from app.models.project_checklist_item import ProjectChecklistItem
from app.repositories.project_checklist_item_repository import ProjectChecklistItemRepository
from app.repositories.project_phase_repository import ProjectPhaseRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.status_history_repository import StatusHistoryRepository
from app.schemas.project_checklist_item import (
    ProjectChecklistItemCreateRequest,
    ProjectChecklistItemUpdateRequest,
)

PROJECT_CHECKLIST_STATUSES = {"pending", "blocked", "done"}
PROJECT_CHECKLIST_TRANSITIONS = {
    "pending": {"blocked", "done"},
    "blocked": {"done"},
    "done": set(),
}


class ProjectChecklistService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.project_repository = ProjectRepository(db)
        self.project_phase_repository = ProjectPhaseRepository(db)
        self.project_checklist_repository = ProjectChecklistItemRepository(db)
        self.status_history_repository = StatusHistoryRepository(db)

    def list_items(
        self,
        project_id: int,
        *,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ProjectChecklistItem], int]:
        self._get_project_or_404(project_id)
        validated_status = self._validate_status_filter(status)
        normalized_query = self._normalize_optional(query)
        items = self.project_checklist_repository.list_filtered(
            project_id=project_id,
            query=normalized_query,
            status=validated_status,
            page=page,
            page_size=page_size,
        )
        total = self.project_checklist_repository.count_filtered(
            project_id=project_id,
            query=normalized_query,
            status=validated_status,
        )
        return items, total

    def get_item(self, project_id: int, item_id: int) -> ProjectChecklistItem:
        item = self.project_checklist_repository.get_by_id(item_id)
        if item is None or item.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project checklist item not found.")
        return item

    def create_item(
        self,
        project_id: int,
        payload: ProjectChecklistItemCreateRequest,
        *,
        changed_by_email: str | None = None,
    ) -> ProjectChecklistItem:
        project = self._get_project_or_404(project_id)
        phase = self._resolve_phase(project.id, payload.project_phase_id)
        validated_status = self._validate_status(payload.status)
        completed_at = local_now() if validated_status == "done" else None
        item = self.project_checklist_repository.create(
            project_id=project_id,
            project_phase_id=phase.id if phase else None,
            title=payload.title.strip(),
            description=self._normalize_optional(payload.description),
            status=validated_status,
            completed_at=completed_at,
        )
        self.status_history_repository.create(
            entity_type="project_checklist_item",
            entity_id=item.id,
            from_status=None,
            to_status=validated_status,
            changed_by_email=changed_by_email,
            note=phase.key if phase else None,
        )
        return self.project_checklist_repository.save(item)

    def update_item(
        self,
        project_id: int,
        item_id: int,
        payload: ProjectChecklistItemUpdateRequest,
        *,
        changed_by_email: str | None = None,
    ) -> ProjectChecklistItem:
        project = self._get_project_or_404(project_id)
        item = self.get_item(project_id, item_id)
        resolved_phase = item.project_phase

        if payload.project_phase_id is not None:
            resolved_phase = self._resolve_phase(project.id, payload.project_phase_id)
            item.project_phase_id = resolved_phase.id if resolved_phase else None
        if payload.title is not None:
            item.title = payload.title.strip()
        if payload.description is not None:
            item.description = self._normalize_optional(payload.description)
        if payload.status is not None:
            next_status = self._validate_status(payload.status)
            if next_status != item.status:
                previous_status = item.status
                self._validate_transition(previous_status, next_status)
                item.status = next_status
                item.completed_at = local_now() if next_status == "done" else None
                self.status_history_repository.create(
                    entity_type="project_checklist_item",
                    entity_id=item.id,
                    from_status=previous_status,
                    to_status=next_status,
                    changed_by_email=changed_by_email,
                    note=resolved_phase.key if resolved_phase else None,
                )

        return self.project_checklist_repository.save(item)

    def list_status_history(self, project_id: int, item_id: int):
        self.get_item(project_id, item_id)
        return self.status_history_repository.list_for_entity(entity_type="project_checklist_item", entity_id=item_id)

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
        if normalized not in PROJECT_CHECKLIST_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown project checklist status.")
        return normalized

    def _validate_status_filter(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        return self._validate_status(normalized)

    @staticmethod
    def _validate_transition(previous_status: str, next_status: str) -> None:
        if next_status not in PROJECT_CHECKLIST_TRANSITIONS[previous_status]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid project checklist transition.")

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
