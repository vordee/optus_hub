from __future__ import annotations

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project


class ProjectRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Project]:
        stmt = (
            select(Project)
            .options(joinedload(Project.company), joinedload(Project.contact))
            .order_by(Project.created_at.desc(), Project.id.desc())
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def list_filtered(
        self,
        *,
        query: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[Project]:
        stmt = self._build_filtered_stmt(query=query, status=status)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        return list(self.db.execute(stmt).scalars().unique().all())

    def count_filtered(self, *, query: str | None = None, status: str | None = None) -> int:
        stmt = select(func.count()).select_from(Project)
        if status:
            stmt = stmt.where(Project.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Project.name).like(term),
                    func.lower(func.coalesce(Project.description, "")).like(term),
                )
            )
        return int(self.db.execute(stmt).scalar_one())

    def get_by_id(self, project_id: int) -> Optional[Project]:
        stmt = (
            select(Project)
            .options(joinedload(Project.company), joinedload(Project.contact))
            .where(Project.id == project_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_detail_by_id(self, project_id: int) -> Optional[Project]:
        stmt = (
            select(Project)
            .options(
                joinedload(Project.company),
                joinedload(Project.contact),
                joinedload(Project.phases),
            )
            .where(Project.id == project_id)
        )
        return self.db.execute(stmt).scalars().unique().one_or_none()

    def get_by_opportunity_id(self, opportunity_id: int) -> Optional[Project]:
        stmt = select(Project).where(Project.opportunity_id == opportunity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        opportunity_id: int | None,
        company_id: int | None,
        contact_id: int | None,
        name: str,
        status: str,
        description: str | None,
        kickoff_owner_email: str | None,
        kickoff_target_date,
        kickoff_notes: str | None,
    ) -> Project:
        project = Project(
            opportunity_id=opportunity_id,
            company_id=company_id,
            contact_id=contact_id,
            name=name,
            status=status,
            description=description,
            kickoff_owner_email=kickoff_owner_email,
            kickoff_target_date=kickoff_target_date,
            kickoff_notes=kickoff_notes,
        )
        self.db.add(project)
        self.db.flush()
        return project

    def save(self, project: Project) -> Project:
        self.db.commit()
        self.db.refresh(project)
        return project

    def _build_filtered_stmt(self, *, query: str | None, status: str | None):
        stmt = (
            select(Project)
            .options(joinedload(Project.company), joinedload(Project.contact))
            .order_by(Project.created_at.desc(), Project.id.desc())
        )
        if status:
            stmt = stmt.where(Project.status == status)
        if query:
            term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Project.name).like(term),
                    func.lower(func.coalesce(Project.description, "")).like(term),
                )
            )
        return stmt
