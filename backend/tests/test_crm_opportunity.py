from fastapi import HTTPException

from app.schemas.company import CompanyCreateRequest
from app.schemas.contact import ContactCreateRequest
from app.schemas.lead import LeadCreateRequest
from app.schemas.opportunity import OpportunityCreateRequest, OpportunityTransitionRequest, OpportunityUpdateRequest
from app.services.company_service import CompanyService
from app.services.contact_service import ContactService
from app.services.lead_service import LeadService
from app.services.opportunity_service import OpportunityService


def test_create_opportunity_from_lead_infers_links(db_session) -> None:
    company = CompanyService(db_session).create_company(
        CompanyCreateRequest(legal_name="Optus Tecnologia LTDA", tax_id="12345678000199")
    )
    contact = ContactService(db_session).create_contact(
        ContactCreateRequest(company_id=company.id, full_name="Maria Silva")
    )
    lead = LeadService(db_session).create_lead(
        LeadCreateRequest(contact_id=contact.id, title="Lead base", status="qualified")
    )
    service = OpportunityService(db_session)

    opportunity = service.create_opportunity(
        OpportunityCreateRequest(
            lead_id=lead.id,
            title="Oportunidade principal",
            status="open",
            amount=12500,
        )
    )

    assert opportunity.lead_id == lead.id
    assert opportunity.company_id == company.id
    assert opportunity.contact_id == contact.id
    assert float(opportunity.amount) == 12500


def test_update_opportunity_status_and_amount(db_session) -> None:
    service = OpportunityService(db_session)
    opportunity = service.create_opportunity(
        OpportunityCreateRequest(title="Oportunidade inicial", status="open", amount=1000)
    )

    updated = service.update_opportunity(
        opportunity.id,
        OpportunityUpdateRequest(status="proposal", amount=1500, title="Oportunidade proposta"),
    )

    assert updated.status == "proposal"
    assert updated.title == "Oportunidade proposta"
    assert float(updated.amount) == 1500
    history = service.list_status_history(opportunity.id)
    assert history[0].from_status == "open"
    assert history[0].to_status == "proposal"


def test_detail_helpers_reuse_loaded_opportunity(db_session) -> None:
    service = OpportunityService(db_session)
    opportunity = service.create_opportunity(
        OpportunityCreateRequest(title="Oportunidade inicial", status="open", amount=1000)
    )

    def fail_if_called(*args, **kwargs):
        raise AssertionError("get_opportunity should not be called when the opportunity is already loaded.")

    service.get_opportunity = fail_if_called  # type: ignore[method-assign]

    next_statuses = service.list_next_statuses(opportunity.id, opportunity=opportunity)
    history = service.list_status_history(opportunity.id, opportunity=opportunity)

    assert next_statuses == ["lost", "proposal"]
    assert len(history) == 1
    assert history[0].to_status == "open"


def test_opportunity_rejects_mismatched_lead_and_company(db_session) -> None:
    company_a = CompanyService(db_session).create_company(
        CompanyCreateRequest(legal_name="Empresa A", tax_id="12345678000199")
    )
    company_b = CompanyService(db_session).create_company(
        CompanyCreateRequest(legal_name="Empresa B", tax_id="99999999000199")
    )
    contact = ContactService(db_session).create_contact(
        ContactCreateRequest(company_id=company_a.id, full_name="Maria Silva")
    )
    lead = LeadService(db_session).create_lead(
        LeadCreateRequest(contact_id=contact.id, title="Lead base", status="qualified")
    )
    service = OpportunityService(db_session)

    try:
        service.create_opportunity(
            OpportunityCreateRequest(
                lead_id=lead.id,
                company_id=company_b.id,
                title="Oportunidade invalida",
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected opportunity with mismatched lead/company to be rejected.")


def test_opportunity_rejects_unknown_status(db_session) -> None:
    service = OpportunityService(db_session)

    try:
        service.create_opportunity(
            OpportunityCreateRequest(title="Oportunidade invalida", status="archived")
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected unknown opportunity status to be rejected.")


def test_list_opportunities_filters_and_paginates(db_session) -> None:
    service = OpportunityService(db_session)
    service.create_opportunity(OpportunityCreateRequest(title="Primeira oportunidade", status="open"))
    service.create_opportunity(OpportunityCreateRequest(title="Segunda oportunidade", status="proposal"))

    items, total = service.list_opportunities(query="segunda", status="proposal", page=1, page_size=10)

    assert total == 1
    assert len(items) == 1
    assert items[0].title == "Segunda oportunidade"


def test_opportunity_transition_requires_amount_for_proposal(db_session) -> None:
    service = OpportunityService(db_session)
    opportunity = service.create_opportunity(
        OpportunityCreateRequest(title="Sem valor", status="open")
    )

    try:
        service.transition_opportunity(
            opportunity.id,
            OpportunityTransitionRequest(to_status="proposal"),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected proposal transition without amount to be rejected.")


def test_opportunity_transition_requires_reason_for_lost(db_session) -> None:
    service = OpportunityService(db_session)
    opportunity = service.create_opportunity(
        OpportunityCreateRequest(title="Perdida", status="open", amount=1000)
    )

    try:
        service.transition_opportunity(
            opportunity.id,
            OpportunityTransitionRequest(to_status="lost"),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected lost transition without note to be rejected.")


def test_opportunity_transition_updates_history(db_session) -> None:
    service = OpportunityService(db_session)
    opportunity = service.create_opportunity(
        OpportunityCreateRequest(title="Fluxo guiado", status="open", amount=5000)
    )

    transitioned = service.transition_opportunity(
        opportunity.id,
        OpportunityTransitionRequest(to_status="proposal", note="Proposta enviada"),
        changed_by_email="sales@optus.com",
    )

    assert transitioned.status == "proposal"
    history = service.list_status_history(opportunity.id)
    assert history[0].from_status == "open"
    assert history[0].to_status == "proposal"
    assert history[0].note == "Proposta enviada"
