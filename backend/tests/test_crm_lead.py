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
