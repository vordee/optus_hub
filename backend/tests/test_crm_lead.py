import pytest
from pydantic import ValidationError

from app.models.lead import Lead
from app.schemas.lead import LeadCreateRequest, LeadUpdateRequest
from app.services.lead_service import LeadService


def test_create_lead_with_optional_links(db_session) -> None:
    service = LeadService(db_session)

    lead = service.create_lead(
        LeadCreateRequest(
            name="Industrial Prospect",
            status="new",
            source="site",
            summary="Initial qualification pending",
            company_id=10,
            contact_id=20,
        )
    )

    assert lead.name == "Industrial Prospect"
    assert lead.status == "new"
    assert lead.company_id == 10
    assert lead.contact_id == 20


def test_update_lead_changes_status_and_links(db_session) -> None:
    service = LeadService(db_session)
    lead = service.create_lead(
        LeadCreateRequest(
            name="Industrial Prospect",
            status="new",
            source="site",
        )
    )

    updated = service.update_lead(
        lead.id,
        LeadUpdateRequest(
            name="Industrial Prospect Updated",
            status="qualified",
            company_id=11,
            contact_id=21,
        ),
    )

    assert updated.name == "Industrial Prospect Updated"
    assert updated.status == "qualified"
    assert updated.company_id == 11
    assert updated.contact_id == 21


def test_update_lead_rejects_unknown_status(db_session) -> None:
    service = LeadService(db_session)
    lead = service.create_lead(LeadCreateRequest(name="Industrial Prospect"))

    with pytest.raises(ValidationError):
        LeadUpdateRequest(status="invalid-status")

    with pytest.raises(Exception) as exc_info:
        service.update_lead(
            lead.id,
            LeadUpdateRequest.model_construct(status="invalid-status"),
        )

    assert getattr(exc_info.value, "status_code", None) == 400


def test_list_leads_returns_recent_first(db_session) -> None:
    service = LeadService(db_session)
    first = service.create_lead(LeadCreateRequest(name="Lead One"))
    second = service.create_lead(LeadCreateRequest(name="Lead Two"))

    leads = service.list_leads()

    assert [lead.id for lead in leads[:2]] == [second.id, first.id]
    assert all(isinstance(lead, Lead) for lead in leads)
