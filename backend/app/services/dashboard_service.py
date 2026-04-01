from sqlalchemy import func, select
from sqlalchemy.orm import Session

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
            select(Contact.id, Contact.full_name, Company.legal_name, Contact.created_at)
            .outerjoin(Company, Company.id == Contact.company_id)
            .order_by(Contact.created_at.desc(), Contact.id.desc())
            .limit(3)
        ).all()
        recent_leads = self.db.execute(
            select(Lead.id, Lead.title, Company.legal_name, Lead.status, Lead.created_at)
            .outerjoin(Company, Company.id == Lead.company_id)
            .order_by(Lead.created_at.desc(), Lead.id.desc())
            .limit(3)
        ).all()
        recent_opportunities = self.db.execute(
            select(Opportunity.id, Opportunity.title, Opportunity.status, Opportunity.created_at)
            .order_by(Opportunity.created_at.desc(), Opportunity.id.desc())
            .limit(6)
        ).all()
        recent_projects = self.db.execute(
            select(Project.id, Project.name, Project.status, Project.created_at)
            .order_by(Project.created_at.desc(), Project.id.desc())
            .limit(6)
        ).all()
        recent_audit_events = self.db.execute(
            select(
                AuditEvent.id,
                AuditEvent.created_at,
                AuditEvent.action,
                AuditEvent.status,
                AuditEvent.actor_email,
                AuditEvent.target_type,
                AuditEvent.target_id,
            )
            .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
            .limit(8)
        ).all()

        return DashboardSummaryResponse(
            user_count=user_count,
            active_company_count=active_company_count,
            active_contact_count=active_contact_count,
            lead_count=lead_count,
            won_opportunity_count=won_opportunity_count,
            active_project_count=active_project_count,
            recent_contacts=[
                DashboardRecentContact(
                    id=item[0],
                    full_name=item[1],
                    company_name=item[2],
                    created_at=item[3],
                )
                for item in recent_contacts
            ],
            recent_leads=[
                DashboardRecentLead(
                    id=item[0],
                    title=item[1],
                    company_name=item[2],
                    status=item[3],
                    created_at=item[4],
                )
                for item in recent_leads
            ],
            recent_opportunities=[
                DashboardRecentOpportunity(
                    id=item[0],
                    title=item[1],
                    status=item[2],
                    created_at=item[3],
                )
                for item in recent_opportunities
            ],
            recent_projects=[
                DashboardRecentProject(
                    id=item[0],
                    name=item[1],
                    status=item[2],
                    created_at=item[3],
                )
                for item in recent_projects
            ],
            recent_audit_events=[
                DashboardRecentAuditEvent(
                    id=item[0],
                    created_at=item[1],
                    action=item[2],
                    status=item[3],
                    actor_email=item[4],
                    target_type=item[5],
                    target_id=item[6],
                )
                for item in recent_audit_events
            ],
        )

    def _count_rows(self, model, *conditions) -> int:
        stmt = select(func.count()).select_from(model)
        for condition in conditions:
            stmt = stmt.where(condition)
        return int(self.db.execute(stmt).scalar_one())
