from app.schemas.project import ProjectCreateRequest
from app.schemas.project_task import ProjectTaskCreateRequest, ProjectTaskUpdateRequest
from app.services.audit_service import AuditService
from app.services.company_service import CompanyService
from app.services.contact_service import ContactService
from app.services.dashboard_service import DashboardService
from app.services.lead_service import LeadService
from app.services.opportunity_service import OpportunityService
from app.services.project_service import ProjectService
from app.services.project_task_service import ProjectTaskService
from app.schemas.company import CompanyCreateRequest
from app.schemas.contact import ContactCreateRequest
from app.schemas.lead import LeadCreateRequest
from app.schemas.opportunity import OpportunityCreateRequest


def test_dashboard_summary_aggregates_recent_operational_data(db_session) -> None:
    company = CompanyService(db_session).create_company(
        CompanyCreateRequest(legal_name="Optus Cliente", trade_name="Cliente", tax_id="123", is_active=True)
    )
    contact = ContactService(db_session).create_contact(
        ContactCreateRequest(company_id=company.id, full_name="Maria Silva", email="maria@example.com", is_active=True)
    )
    lead = LeadService(db_session).create_lead(
        LeadCreateRequest(
            company_id=company.id,
            contact_id=contact.id,
            title="Implantar hub",
            source="site",
            status="new",
        ),
        changed_by_email="admin@example.com",
    )
    opportunity = OpportunityService(db_session).create_opportunity(
        OpportunityCreateRequest(
            lead_id=lead.id,
            company_id=company.id,
            contact_id=contact.id,
            title="Projeto implantação",
            status="open",
            amount=1500,
        ),
        changed_by_email="admin@example.com",
    )
    OpportunityService(db_session).transition_opportunity(
        opportunity.id,
        payload=type("TransitionPayload", (), {"to_status": "proposal", "note": None})(),
        changed_by_email="admin@example.com",
    )
    OpportunityService(db_session).transition_opportunity(
        opportunity.id,
        payload=type("TransitionPayload", (), {"to_status": "won", "note": None})(),
        changed_by_email="admin@example.com",
    )
    project = ProjectService(db_session).create_from_opportunity(opportunity.id, changed_by_email="admin@example.com")
    phase = ProjectService(db_session).list_phases(project.id)[0]
    task = ProjectTaskService(db_session).create_task(
        project.id,
        ProjectTaskCreateRequest(project_phase_id=phase.id, title="Kickoff inicial"),
        changed_by_email="admin@example.com",
    )
    ProjectTaskService(db_session).update_task(
        project.id,
        task.id,
        ProjectTaskUpdateRequest(status="in_progress"),
        changed_by_email="admin@example.com",
    )
    AuditService(db_session).record_event(
        action="custom.dashboard.check",
        status="success",
        actor_email="admin@example.com",
        target_type="project",
        target_id=str(project.id),
    )

    summary = DashboardService(db_session).get_summary()

    assert summary.user_count >= 1
    assert summary.active_company_count == 1
    assert summary.active_contact_count == 1
    assert summary.lead_count == 1
    assert summary.won_opportunity_count == 1
    assert summary.recent_contacts[0].full_name == "Maria Silva"
    assert summary.recent_leads[0].title == "Implantar hub"
    assert summary.recent_opportunities[0].title == "Projeto implantação"
    assert summary.recent_projects[0].name == project.name
    assert summary.recent_audit_events[0].action == "custom.dashboard.check"
