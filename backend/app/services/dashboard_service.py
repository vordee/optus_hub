from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.audit_event import AuditEvent
from app.models.company import Company
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.project import Project
from app.models.user import User
from app.schemas.dashboard import (
    DashboardRecentAuditEvent,
    DashboardRecentContact,
    DashboardRecentLead,
    DashboardRecentOpportunity,
    DashboardRecentProject,
    DashboardSummaryResponse,
)


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_summary(self) -> DashboardSummaryResponse:
        user_count = self._count_rows(User)
        active_company_count = self._count_rows(Company, Company.is_active.is_(True))
        active_contact_count = self._count_rows(Contact, Contact.is_active.is_(True))
        lead_count = self._count_rows(Lead)
        won_opportunity_count = self._count_rows(Opportunity, Opportunity.status == "won")
        active_project_count = self._count_rows(Project, Project.status == "active")

        recent_contacts = self.db.execute(
            select(Contact)
            .options(joinedload(Contact.company))
            .order_by(Contact.created_at.desc(), Contact.id.desc())
            .limit(3)
        ).scalars().unique().all()
        recent_leads = self.db.execute(
            select(Lead)
            .options(joinedload(Lead.company))
            .order_by(Lead.created_at.desc(), Lead.id.desc())
            .limit(3)
        ).scalars().unique().all()
        recent_opportunities = self.db.execute(
            select(Opportunity)
            .order_by(Opportunity.created_at.desc(), Opportunity.id.desc())
            .limit(6)
        ).scalars().all()
        recent_projects = self.db.execute(
            select(Project)
            .order_by(Project.created_at.desc(), Project.id.desc())
            .limit(6)
        ).scalars().all()
        recent_audit_events = self.db.execute(
            select(AuditEvent)
            .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
            .limit(8)
        ).scalars().all()

        return DashboardSummaryResponse(
            user_count=user_count,
            active_company_count=active_company_count,
            active_contact_count=active_contact_count,
            lead_count=lead_count,
            won_opportunity_count=won_opportunity_count,
            active_project_count=active_project_count,
            recent_contacts=[
                DashboardRecentContact(
                    id=item.id,
                    full_name=item.full_name,
                    company_name=item.company.legal_name if item.company else None,
                    created_at=item.created_at,
                )
                for item in recent_contacts
            ],
            recent_leads=[
                DashboardRecentLead(
                    id=item.id,
                    title=item.title,
                    company_name=item.company.legal_name if item.company else None,
                    status=item.status,
                    created_at=item.created_at,
                )
                for item in recent_leads
            ],
            recent_opportunities=[
                DashboardRecentOpportunity(
                    id=item.id,
                    title=item.title,
                    status=item.status,
                    created_at=item.created_at,
                )
                for item in recent_opportunities
            ],
            recent_projects=[
                DashboardRecentProject(
                    id=item.id,
                    name=item.name,
                    status=item.status,
                    created_at=item.created_at,
                )
                for item in recent_projects
            ],
            recent_audit_events=[
                DashboardRecentAuditEvent(
                    id=item.id,
                    created_at=item.created_at,
                    action=item.action,
                    status=item.status,
                    actor_email=item.actor_email,
                    target_type=item.target_type,
                    target_id=item.target_id,
                )
                for item in recent_audit_events
            ],
        )

    def _count_rows(self, model, *conditions) -> int:
        stmt = select(func.count()).select_from(model)
        for condition in conditions:
            stmt = stmt.where(condition)
        return int(self.db.execute(stmt).scalar_one())
