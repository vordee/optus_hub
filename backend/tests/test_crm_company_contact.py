from fastapi import HTTPException

from app.schemas.company import CompanyCreateRequest, CompanyUpdateRequest
from app.schemas.contact import ContactCreateRequest, ContactUpdateRequest
from app.services.company_service import CompanyService
from app.services.contact_service import ContactService


def test_create_and_update_company(db_session) -> None:
    service = CompanyService(db_session)

    company = service.create_company(
        CompanyCreateRequest(
            legal_name="Optus Tecnologia LTDA",
            trade_name="Optus",
            tax_id="12345678000199",
        )
    )

    updated = service.update_company(
        company.id,
        CompanyUpdateRequest(
            trade_name="Optus Hub",
            is_active=False,
        ),
    )

    assert updated.legal_name == "Optus Tecnologia LTDA"
    assert updated.trade_name == "Optus Hub"
    assert updated.is_active is False


def test_company_rejects_duplicated_tax_id(db_session) -> None:
    service = CompanyService(db_session)
    service.create_company(
        CompanyCreateRequest(
            legal_name="Empresa A",
            tax_id="12345678000199",
        )
    )

    try:
        service.create_company(
            CompanyCreateRequest(
                legal_name="Empresa B",
                tax_id="12345678000199",
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 409
    else:
        raise AssertionError("Expected duplicate tax_id to be rejected.")


def test_create_and_update_contact_with_company(db_session) -> None:
    company = CompanyService(db_session).create_company(
        CompanyCreateRequest(
            legal_name="Optus Tecnologia LTDA",
            tax_id="12345678000199",
        )
    )
    service = ContactService(db_session)

    contact = service.create_contact(
        ContactCreateRequest(
            company_id=company.id,
            full_name="Maria Silva",
            email="maria@example.com",
            phone="65999999999",
            position="Compras",
        )
    )

    updated = service.update_contact(
        contact.id,
        ContactUpdateRequest(
            position="Diretoria",
            is_active=False,
        ),
    )

    assert updated.company_id == company.id
    assert updated.position == "Diretoria"
    assert updated.is_active is False


def test_contact_rejects_unknown_company(db_session) -> None:
    service = ContactService(db_session)

    try:
        service.create_contact(
            ContactCreateRequest(
                company_id=999,
                full_name="Contato Invalido",
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected unknown company to be rejected.")
