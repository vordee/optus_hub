from fastapi import HTTPException

from app.schemas.company import CompanyCreateRequest
from app.schemas.contact import ContactCreateRequest
from app.schemas.lead import LeadCreateRequest
from app.schemas.opportunity import OpportunityCreateRequest, OpportunityUpdateRequest
from app.schemas.project import ProjectCreateRequest, ProjectUpdateRequest
from app.schemas.project_phase import ProjectPhaseUpdateRequest
from app.services.company_service import CompanyService
from app.services.contact_service import ContactService
from app.services.lead_service import LeadService
from app.services.opportunity_service import OpportunityService
from app.services.project_service import ProjectService


def test_create_and_update_project(db_session) -> None:
    service = ProjectService(db_session)

    project = service.create_project(
        ProjectCreateRequest(name="Projeto inicial", status="planned"),
        changed_by_email="admin@example.com",
    )
    updated = service.update_project(
        project.id,
        ProjectUpdateRequest(name="Projeto em andamento", status="active"),
        changed_by_email="ops@example.com",
    )

    assert updated.name == "Projeto em andamento"
    assert updated.status == "active"
    history = service.list_status_history(project.id)
    assert len(history) == 2
    assert history[0].from_status == "planned"
    assert history[0].to_status == "active"
    assert history[0].changed_by_email == "ops@example.com"
    assert history[1].from_status is None
    assert history[1].to_status == "planned"
    phases = service.list_phases(project.id)
    assert len(phases) == 6
    assert phases[0].key == "execution"
    assert all(item.status == "pending" for item in phases)


def test_create_project_from_won_opportunity(db_session) -> None:
    company = CompanyService(db_session).create_company(
        CompanyCreateRequest(legal_name="Optus Tecnologia LTDA", tax_id="12345678000199")
    )
    contact = ContactService(db_session).create_contact(
        ContactCreateRequest(company_id=company.id, full_name="Maria Silva")
    )
    lead = LeadService(db_session).create_lead(
        LeadCreateRequest(contact_id=contact.id, title="Lead base", status="qualified")
    )
    opportunity_service = OpportunityService(db_session)
    opportunity = opportunity_service.create_opportunity(
        OpportunityCreateRequest(lead_id=lead.id, title="Oportunidade vencedora", status="open")
    )
    opportunity_service.update_opportunity(
        opportunity.id,
        OpportunityUpdateRequest(status="won"),
    )

    project = ProjectService(db_session).create_from_opportunity(opportunity.id, changed_by_email="admin@example.com")

    assert project.opportunity_id == opportunity.id
    assert project.company_id == company.id
    assert project.contact_id == contact.id
    assert project.status == "planned"
    history = ProjectService(db_session).list_status_history(project.id)
    assert len(history) == 1
    assert history[0].from_status is None
    assert history[0].to_status == "planned"
    phases = ProjectService(db_session).list_phases(project.id)
    assert len(phases) == 6
    assert history[0].changed_by_email == "admin@example.com"


def test_create_project_from_non_won_opportunity_rejects(db_session) -> None:
    opportunity = OpportunityService(db_session).create_opportunity(
        OpportunityCreateRequest(title="Oportunidade aberta", status="open")
    )

    try:
        ProjectService(db_session).create_from_opportunity(opportunity.id)
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected non-won opportunity to be rejected.")


def test_create_project_rejects_duplicate_opportunity(db_session) -> None:
    opportunity = OpportunityService(db_session).create_opportunity(
        OpportunityCreateRequest(title="Oportunidade vencedora", status="won")
    )
    service = ProjectService(db_session)
    service.create_project(
        ProjectCreateRequest(
            opportunity_id=opportunity.id,
            name="Projeto base",
            status="planned",
        )
    )

    try:
        service.create_project(
            ProjectCreateRequest(
                opportunity_id=opportunity.id,
                name="Projeto duplicado",
                status="planned",
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 409
    else:
        raise AssertionError("Expected duplicate project for opportunity to be rejected.")


def test_list_projects_filters_and_paginates(db_session) -> None:
    service = ProjectService(db_session)
    service.create_project(ProjectCreateRequest(name="Primeiro projeto", status="planned"))
    service.create_project(ProjectCreateRequest(name="Segundo projeto", status="active"))

    items, total = service.list_projects(query="segundo", status="active", page=1, page_size=10)

    assert total == 1
    assert len(items) == 1
    assert items[0].name == "Segundo projeto"


def test_update_project_phase_syncs_project_status(db_session) -> None:
    service = ProjectService(db_session)
    project = service.create_project(
        ProjectCreateRequest(name="Projeto workflow", status="planned"),
        changed_by_email="admin@example.com",
    )
    phases = service.list_phases(project.id)

    updated = service.update_phase(
        project.id,
        phases[0].id,
        ProjectPhaseUpdateRequest(status="in_progress", notes="Execucao iniciada"),
        changed_by_email="ops@example.com",
    )

    assert updated.status == "in_progress"
    assert updated.started_at is not None
    refreshed = service.get_project(project.id)
    assert refreshed.status == "active"
    history = service.list_status_history(project.id)
    assert history[0].to_status == "active"


def test_project_phase_rejects_invalid_transition(db_session) -> None:
    service = ProjectService(db_session)
    project = service.create_project(ProjectCreateRequest(name="Projeto invalido", status="planned"))
    phase = service.list_phases(project.id)[0]

    try:
        service.update_phase(
            project.id,
            phase.id,
            ProjectPhaseUpdateRequest(status="completed"),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected invalid phase transition to be rejected.")
