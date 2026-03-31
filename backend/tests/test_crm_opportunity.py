from fastapi import HTTPException

from app.schemas.company import CompanyCreateRequest
from app.schemas.contact import ContactCreateRequest
from app.schemas.lead import LeadCreateRequest
from app.schemas.opportunity import OpportunityCreateRequest, OpportunityUpdateRequest
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
