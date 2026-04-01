from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.time import local_now
from app.models.project import Project
from app.models.project_phase import ProjectPhase
from app.models.project_task import ProjectTask
from app.repositories.project_phase_repository import ProjectPhaseRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.status_history_repository import StatusHistoryRepository
from app.schemas.project_phase import ProjectPhaseUpdateRequest

PROJECT_PHASE_STATUSES = {"pending", "in_progress", "blocked", "completed"}
DEFAULT_PROJECT_PHASES = [
    ("execution", "Execução"),
    ("tests", "Testes"),
    ("acceptance", "Aceite"),
    ("documentation", "Entrega documental"),
    ("billing", "Faturamento"),
    ("post_sale", "Pos-venda"),
]
PROJECT_PHASE_TRANSITIONS = {
    "pending": {"in_progress", "blocked"},
    "in_progress": {"blocked", "completed"},
    "blocked": {"in_progress"},
    "completed": set(),
}


@dataclass(frozen=True)
class ProjectPhaseMetrics:
    task_count: int = 0
    pending_task_count: int = 0
    in_progress_task_count: int = 0
    blocked_task_count: int = 0
    done_task_count: int = 0
    duration_days: int | None = None


class ProjectPhaseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.project_repository = ProjectRepository(db)
        self.project_phase_repository = ProjectPhaseRepository(db)
        self.status_history_repository = StatusHistoryRepository(db)

    def list_phases(self, project_id: int) -> list[ProjectPhase]:
        self._get_project_or_404(project_id)
        return self.project_phase_repository.list_for_project(project_id)

    def list_phase_metrics(self, project_id: int) -> dict[int, ProjectPhaseMetrics]:
        self._get_project_or_404(project_id)
        stmt = (
            select(
                ProjectTask.project_phase_id,
                ProjectTask.status,
                func.count().label("total"),
            )
            .join(ProjectPhase, ProjectTask.project_phase_id == ProjectPhase.id)
            .where(ProjectPhase.project_id == project_id)
            .group_by(ProjectTask.project_phase_id, ProjectTask.status)
        )
        metrics: dict[int, ProjectPhaseMetrics] = {}
        for phase_id, status, total in self.db.execute(stmt):
            current = metrics.get(
                phase_id,
                ProjectPhaseMetrics(),
            )
            metrics[phase_id] = ProjectPhaseMetrics(
                task_count=current.task_count + int(total),
                pending_task_count=current.pending_task_count + (int(total) if status == "pending" else 0),
                in_progress_task_count=current.in_progress_task_count + (int(total) if status == "in_progress" else 0),
                blocked_task_count=current.blocked_task_count + (int(total) if status == "blocked" else 0),
                done_task_count=current.done_task_count + (int(total) if status == "done" else 0),
                duration_days=current.duration_days,
            )
        return metrics

    def ensure_default_phases(self, project: Project) -> None:
        existing_items = self.project_phase_repository.list_for_project(project.id)
        if existing_items:
            return
        for sequence, (key, name) in enumerate(DEFAULT_PROJECT_PHASES, start=1):
            self.project_phase_repository.create(
                project_id=project.id,
                key=key,
                name=name,
                sequence=sequence,
                status="pending",
            )

    def update_phase(
        self,
        project_id: int,
        phase_id: int,
        payload: ProjectPhaseUpdateRequest,
        *,
        changed_by_email: str | None = None,
    ) -> ProjectPhase:
        project = self._get_project_or_404(project_id)
        phase = self.project_phase_repository.get_by_id(phase_id)
        if phase is None or phase.project_id != project.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project phase not found.")

        next_status = self._validate_phase_status(payload.status)
        if next_status != phase.status and next_status not in PROJECT_PHASE_TRANSITIONS[phase.status]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid project phase transition.")

        previous_status = phase.status
        phase.status = next_status
        phase.notes = self._normalize_optional(payload.notes)
        if next_status == "in_progress" and phase.started_at is None:
            phase.started_at = local_now()
        if next_status == "completed":
            if phase.started_at is None:
                phase.started_at = local_now()
            phase.completed_at = local_now()
        else:
            phase.completed_at = None

        self.status_history_repository.create(
            entity_type="project_phase",
            entity_id=phase.id,
            from_status=previous_status,
            to_status=next_status,
            changed_by_email=changed_by_email,
            note=phase.key,
        )
        self._sync_project_status_from_phases(project, changed_by_email=changed_by_email)
        self.db.commit()
        self.db.refresh(phase)
        return phase

    @staticmethod
    def build_metrics_for_phase(phase: ProjectPhase, metrics: ProjectPhaseMetrics | None = None) -> ProjectPhaseMetrics:
        current = metrics or ProjectPhaseMetrics()
        duration_days = current.duration_days
        if phase.started_at is not None:
            ended_at = phase.completed_at or (local_now() if phase.status == "in_progress" else None)
            if ended_at is not None:
                duration_days = max((ended_at - phase.started_at).days, 0)
        return ProjectPhaseMetrics(
            task_count=current.task_count,
            pending_task_count=current.pending_task_count,
            in_progress_task_count=current.in_progress_task_count,
            blocked_task_count=current.blocked_task_count,
            done_task_count=current.done_task_count,
            duration_days=duration_days,
        )

    def _get_project_or_404(self, project_id: int) -> Project:
        project = self.project_repository.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project

    @staticmethod
    def _validate_phase_status(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in PROJECT_PHASE_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown project phase status.")
        return normalized

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    def _sync_project_status_from_phases(self, project: Project, *, changed_by_email: str | None = None) -> None:
        phases = self.project_phase_repository.list_for_project(project.id)
        if not phases:
            return

        previous_status = project.status
        phase_statuses = {item.status for item in phases}
        if all(item.status == "completed" for item in phases):
            project.status = "completed"
        elif "blocked" in phase_statuses:
            project.status = "on_hold"
        elif "in_progress" in phase_statuses:
            project.status = "active"
        else:
            project.status = "planned"

        if previous_status != project.status:
            self.status_history_repository.create(
                entity_type="project",
                entity_id=project.id,
                from_status=previous_status,
                to_status=project.status,
                changed_by_email=changed_by_email,
                note="project status synced from phases",
            )
