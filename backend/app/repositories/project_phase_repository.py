from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project_phase import ProjectPhase


class ProjectPhaseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_project(self, project_id: int) -> list[ProjectPhase]:
        stmt = (
            select(ProjectPhase)
            .where(ProjectPhase.project_id == project_id)
            .order_by(ProjectPhase.sequence.asc(), ProjectPhase.id.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_by_id(self, phase_id: int) -> ProjectPhase | None:
        stmt = select(ProjectPhase).where(ProjectPhase.id == phase_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        project_id: int,
        key: str,
        name: str,
        sequence: int,
        status: str = "pending",
    ) -> ProjectPhase:
        item = ProjectPhase(
            project_id=project_id,
            key=key,
            name=name,
            sequence=sequence,
            status=status,
        )
        self.db.add(item)
        self.db.flush()
        return item
