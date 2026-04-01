from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.time import local_now
from app.models.project import Project
from app.models.project_phase import ProjectPhase
from app.repositories.company_repository import CompanyRepository
from app.repositories.contact_repository import ContactRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.project_phase_repository import ProjectPhaseRepository
from app.repositories.status_history_repository import StatusHistoryRepository
from app.schemas.project import ProjectCreateRequest, ProjectUpdateRequest
from app.schemas.project_phase import ProjectPhaseUpdateRequest

PROJECT_STATUSES = {"planned", "active", "on_hold", "completed"}
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


class ProjectService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.project_repository = ProjectRepository(db)
        self.project_phase_repository = ProjectPhaseRepository(db)
        self.status_history_repository = StatusHistoryRepository(db)
        self.opportunity_repository = OpportunityRepository(db)
        self.company_repository = CompanyRepository(db)
        self.contact_repository = ContactRepository(db)

    def list_projects(
        self,
        *,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Project], int]:
        validated_status = self._validate_status_filter(status)
        normalized_query = self._normalize_optional(query)
        items = self.project_repository.list_filtered(
            query=normalized_query,
            status=validated_status,
            page=page,
            page_size=page_size,
        )
        total = self.project_repository.count_filtered(query=normalized_query, status=validated_status)
        return items, total

    def get_project(self, project_id: int) -> Project:
        project = self.project_repository.get_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project

    def get_project_detail(self, project_id: int) -> Project:
        project = self.project_repository.get_detail_by_id(project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project

    def get_by_opportunity_id(self, opportunity_id: int) -> Project | None:
        return self.project_repository.get_by_opportunity_id(opportunity_id)

    def create_project(self, payload: ProjectCreateRequest, *, changed_by_email: str | None = None) -> Project:
        opportunity_id, company_id, contact_id = self._resolve_relationships(
            payload.opportunity_id,
            payload.company_id,
            payload.contact_id,
        )
        if opportunity_id is not None and self.project_repository.get_by_opportunity_id(opportunity_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Project already exists for this opportunity.",
            )
        validated_status = self._validate_status(payload.status)
        project = self.project_repository.create(
            opportunity_id=opportunity_id,
            company_id=company_id,
            contact_id=contact_id,
            name=payload.name.strip(),
            status=validated_status,
            description=self._normalize_optional(payload.description),
            kickoff_owner_email=self._normalize_optional(payload.kickoff_owner_email),
            kickoff_target_date=payload.kickoff_target_date,
            kickoff_notes=self._normalize_optional(payload.kickoff_notes),
        )
        self.status_history_repository.create(
            entity_type="project",
            entity_id=project.id,
            from_status=None,
            to_status=validated_status,
            changed_by_email=changed_by_email,
            note="project created",
        )
        self._ensure_default_phases(project)
        return self.project_repository.save(project)

    def update_project(
        self,
        project_id: int,
        payload: ProjectUpdateRequest,
        *,
        changed_by_email: str | None = None,
    ) -> Project:
        project = self.get_project(project_id)

        if payload.name is not None:
            project.name = payload.name.strip()
        if payload.status is not None:
            next_status = self._validate_status(payload.status)
            if next_status != project.status:
                previous_status = project.status
                project.status = next_status
                self.status_history_repository.create(
                    entity_type="project",
                    entity_id=project.id,
                    from_status=previous_status,
                    to_status=next_status,
                    changed_by_email=changed_by_email,
                    note="project status updated",
                )
        if payload.description is not None:
            project.description = self._normalize_optional(payload.description)
        if payload.kickoff_owner_email is not None:
            project.kickoff_owner_email = self._normalize_optional(payload.kickoff_owner_email)
        if payload.kickoff_target_date is not None:
            project.kickoff_target_date = payload.kickoff_target_date
        if payload.kickoff_notes is not None:
            project.kickoff_notes = self._normalize_optional(payload.kickoff_notes)

        return self.project_repository.save(project)

    def create_from_opportunity(
        self,
        opportunity_id: int,
        *,
        changed_by_email: str | None = None,
        project_name: str | None = None,
        kickoff_owner_email: str | None = None,
        kickoff_target_date=None,
        kickoff_notes: str | None = None,
    ) -> Project:
        opportunity = self.opportunity_repository.get_by_id(opportunity_id)
        if opportunity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")
        if opportunity.status != "won":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only won opportunities can open projects.")
        if self.project_repository.get_by_opportunity_id(opportunity.id) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project already exists for this opportunity.")

        project = self.project_repository.create(
            opportunity_id=opportunity.id,
            company_id=opportunity.company_id,
            contact_id=opportunity.contact_id,
            name=self._normalize_optional(project_name) or opportunity.title,
            status="planned",
            description=opportunity.description,
            kickoff_owner_email=self._normalize_optional(kickoff_owner_email),
            kickoff_target_date=kickoff_target_date,
            kickoff_notes=self._normalize_optional(kickoff_notes),
        )
        self.status_history_repository.create(
            entity_type="project",
            entity_id=project.id,
            from_status=None,
            to_status="planned",
            changed_by_email=changed_by_email,
            note=self._build_kickoff_note(
                opportunity.id,
                kickoff_owner_email=self._normalize_optional(kickoff_owner_email),
                kickoff_target_date=kickoff_target_date.isoformat() if kickoff_target_date else None,
                kickoff_notes=self._normalize_optional(kickoff_notes),
            ),
        )
        self._ensure_default_phases(project)
        return self.project_repository.save(project)

    @staticmethod
    def _build_kickoff_note(
        opportunity_id: int,
        *,
        kickoff_owner_email: str | None,
        kickoff_target_date: str | None,
        kickoff_notes: str | None,
    ) -> str:
        parts = [f"kickoff opened from opportunity {opportunity_id}"]
        if kickoff_owner_email:
            parts.append(f"owner={kickoff_owner_email}")
        if kickoff_target_date:
            parts.append(f"target={kickoff_target_date}")
        if kickoff_notes:
            parts.append(f"note={kickoff_notes}")
        return " | ".join(parts)

    def list_status_history(self, project_id: int):
        self.get_project(project_id)
        return self.status_history_repository.list_for_entity(entity_type="project", entity_id=project_id)

    def list_phases(self, project_id: int) -> list[ProjectPhase]:
        self.get_project(project_id)
        return self.project_phase_repository.list_for_project(project_id)

    def update_phase(
        self,
        project_id: int,
        phase_id: int,
        payload: ProjectPhaseUpdateRequest,
        *,
        changed_by_email: str | None = None,
    ) -> ProjectPhase:
        project = self.get_project(project_id)
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

    def _resolve_relationships(
        self,
        opportunity_id: int | None,
        company_id: int | None,
        contact_id: int | None,
    ) -> tuple[int | None, int | None, int | None]:
        opportunity = self.opportunity_repository.get_by_id(opportunity_id) if opportunity_id is not None else None
        if opportunity_id is not None and opportunity is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown opportunity.")

        company = self.company_repository.get_by_id(company_id) if company_id is not None else None
        if company_id is not None and company is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown company.")

        contact = self.contact_repository.get_by_id(contact_id) if contact_id is not None else None
        if contact_id is not None and contact is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown contact.")

        resolved_opportunity_id = opportunity.id if opportunity is not None else None
        resolved_company_id = company.id if company is not None else None
        resolved_contact_id = contact.id if contact is not None else None

        if opportunity is not None:
            if resolved_company_id is not None and opportunity.company_id is not None and resolved_company_id != opportunity.company_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Opportunity does not belong to the informed company.")
            if resolved_contact_id is not None and opportunity.contact_id is not None and resolved_contact_id != opportunity.contact_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Opportunity does not belong to the informed contact.")
            if opportunity.company_id is not None:
                resolved_company_id = opportunity.company_id
            if opportunity.contact_id is not None:
                resolved_contact_id = opportunity.contact_id

        if contact is not None and contact.company_id is not None:
            if resolved_company_id is not None and resolved_company_id != contact.company_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact does not belong to the informed company.")
            resolved_company_id = contact.company_id

        return resolved_opportunity_id, resolved_company_id, resolved_contact_id

    @staticmethod
    def _validate_status(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in PROJECT_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown project status.")
        return normalized

    @staticmethod
    def _validate_phase_status(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in PROJECT_PHASE_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown project phase status.")
        return normalized

    def _validate_status_filter(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        return self._validate_status(normalized)

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    def _ensure_default_phases(self, project: Project) -> None:
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

    def _sync_project_status_from_phases(
        self,
        project: Project,
        *,
        changed_by_email: str | None = None,
    ) -> None:
        phases = self.project_phase_repository.list_for_project(project.id)
        if not phases:
            return

        previous_status = project.status
        next_status = previous_status
        phase_statuses = {item.status for item in phases}
        if all(item.status == "completed" for item in phases):
            next_status = "completed"
        elif "blocked" in phase_statuses:
            next_status = "on_hold"
        elif "in_progress" in phase_statuses:
            next_status = "active"
        else:
            next_status = "planned"

        if next_status != previous_status:
            project.status = next_status
            self.status_history_repository.create(
                entity_type="project",
                entity_id=project.id,
                from_status=previous_status,
                to_status=next_status,
                changed_by_email=changed_by_email,
                note="project status synced from phases",
            )
