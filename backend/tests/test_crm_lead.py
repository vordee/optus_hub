from fastapi import HTTPException

from app.schemas.company import CompanyCreateRequest
from app.schemas.contact import ContactCreateRequest
from app.schemas.lead import LeadCreateRequest, LeadUpdateRequest
from app.services.company_service import CompanyService
from app.services.contact_service import ContactService
from app.services.lead_service import LeadService


def test_create_lead_infers_company_from_contact(db_session) -> None:
    company = CompanyService(db_session).create_company(
        CompanyCreateRequest(
            legal_name="Optus Tecnologia LTDA",
            tax_id="12345678000199",
        )
    )
    contact = ContactService(db_session).create_contact(
        ContactCreateRequest(
            company_id=company.id,
            full_name="Maria Silva",
            email="maria@example.com",
        )
    )
    service = LeadService(db_session)

    lead = service.create_lead(
        LeadCreateRequest(
            contact_id=contact.id,
            title="Projeto de redes corporativas",
            source="site",
        )
    )

    assert lead.contact_id == contact.id
    assert lead.company_id == company.id
    assert lead.status == "new"


def test_update_lead_status_and_title(db_session) -> None:
    service = LeadService(db_session)
    lead = service.create_lead(
        LeadCreateRequest(
            title="Lead inicial",
            status="new",
        )
    )

    updated = service.update_lead(
        lead.id,
        LeadUpdateRequest(
            title="Lead qualificado",
            status="qualified",
        ),
    )

    assert updated.title == "Lead qualificado"
    assert updated.status == "qualified"
    history = service.list_status_history(lead.id)
    assert history[0].from_status == "new"
    assert history[0].to_status == "qualified"


def test_list_status_history_reuses_loaded_lead(db_session) -> None:
    service = LeadService(db_session)
    lead = service.create_lead(
        LeadCreateRequest(
            title="Lead inicial",
            status="new",
        )
    )

    def fail_if_called(*args, **kwargs):
        raise AssertionError("get_lead should not be called when the lead is already loaded.")

    service.get_lead = fail_if_called  # type: ignore[method-assign]

    history = service.list_status_history(lead.id, lead=lead)

    assert len(history) == 1
    assert history[0].to_status == "new"


def test_lead_rejects_mismatched_company_and_contact(db_session) -> None:
    company_a = CompanyService(db_session).create_company(
        CompanyCreateRequest(
            legal_name="Empresa A",
            tax_id="12345678000199",
        )
    )
    company_b = CompanyService(db_session).create_company(
        CompanyCreateRequest(
            legal_name="Empresa B",
            tax_id="99999999000199",
        )
    )
    contact = ContactService(db_session).create_contact(
        ContactCreateRequest(
            company_id=company_a.id,
            full_name="Maria Silva",
        )
    )
    service = LeadService(db_session)

    try:
        service.create_lead(
            LeadCreateRequest(
                company_id=company_b.id,
                contact_id=contact.id,
                title="Lead invalido",
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected lead with mismatched company/contact to be rejected.")


def test_lead_rejects_unknown_status(db_session) -> None:
    service = LeadService(db_session)

    try:
        service.create_lead(
            LeadCreateRequest(
                title="Lead invalido",
                status="archived",
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected unknown lead status to be rejected.")


def test_list_leads_filters_and_paginates(db_session) -> None:
    service = LeadService(db_session)
    service.create_lead(LeadCreateRequest(title="Primeiro lead", status="new"))
    service.create_lead(LeadCreateRequest(title="Segundo lead", status="qualified"))

    items, total = service.list_leads(query="segundo", status="qualified", page=1, page_size=10)

    assert total == 1
    assert len(items) == 1
    assert items[0].title == "Segundo lead"


def test_lead_activity_helpers_return_next_and_overdue(db_session) -> None:
    from datetime import timedelta

    from app.core.time import local_now
    from app.schemas.crm_activity import CRMActivityCreateRequest
    from app.services.crm_activity_service import CRMActivityService

    service = LeadService(db_session)
    lead = service.create_lead(LeadCreateRequest(title="Lead com agenda", status="new"))
    CRMActivityService(db_session).create_activity(
        CRMActivityCreateRequest(
            entity_type="lead",
            entity_id=lead.id,
            title="Contato inicial",
            due_at=local_now() - timedelta(hours=1),
        )
    )

    next_activity = service.get_next_activity(lead.id, lead=lead)
    overdue_count = service.count_overdue_activities(lead.id, lead=lead)
    activities = service.list_activities(lead.id, lead=lead)

    assert next_activity is not None
    assert next_activity.title == "Contato inicial"
    assert overdue_count == 1
    assert len(activities) == 1
