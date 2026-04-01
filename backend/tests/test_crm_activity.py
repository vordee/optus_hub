from datetime import timedelta

from app.core.time import local_now
from app.schemas.crm_activity import CRMActivityCreateRequest, CRMActivityUpdateRequest
from app.schemas.lead import LeadCreateRequest
from app.schemas.opportunity import OpportunityCreateRequest
from app.services.crm_activity_service import CRMActivityService
from app.services.lead_service import LeadService
from app.services.opportunity_service import OpportunityService


def test_create_and_complete_lead_activity(db_session) -> None:
    lead = LeadService(db_session).create_lead(LeadCreateRequest(title="Lead com atividade"))
    service = CRMActivityService(db_session)

    activity = service.create_activity(
        CRMActivityCreateRequest(
            entity_type="lead",
            entity_id=lead.id,
            activity_type="follow_up",
            title="Ligar para cliente",
        ),
        created_by_email="admin@example.com",
    )

    assert activity.entity_type == "lead"
    assert activity.status == "pending"
    assert activity.created_by_email == "admin@example.com"

    completed = service.complete_activity(activity.id)

    assert completed.status == "done"
    assert completed.completed_at is not None


def test_next_and_overdue_activity_for_opportunity(db_session) -> None:
    opportunity = OpportunityService(db_session).create_opportunity(
        OpportunityCreateRequest(title="Oportunidade com atividade", amount=1000)
    )
    service = CRMActivityService(db_session)

    overdue = service.create_activity(
        CRMActivityCreateRequest(
            entity_type="opportunity",
            entity_id=opportunity.id,
            activity_type="call",
            title="Cobrar retorno",
            due_at=local_now() - timedelta(days=1),
        )
    )
    upcoming = service.create_activity(
        CRMActivityCreateRequest(
            entity_type="opportunity",
            entity_id=opportunity.id,
            activity_type="meeting",
            title="Reuniao de proposta",
            due_at=local_now() + timedelta(days=1),
        )
    )

    next_activity = service.get_next_for_entity(entity_type="opportunity", entity_id=opportunity.id)
    overdue_count = service.count_overdue_for_entity(entity_type="opportunity", entity_id=opportunity.id)

    assert next_activity is not None
    assert next_activity.id == overdue.id
    assert overdue_count == 1
    assert upcoming.id != next_activity.id


def test_update_activity_reschedules_and_cancels(db_session) -> None:
    lead = LeadService(db_session).create_lead(LeadCreateRequest(title="Lead base"))
    service = CRMActivityService(db_session)
    activity = service.create_activity(
        CRMActivityCreateRequest(
            entity_type="lead",
            entity_id=lead.id,
            activity_type="task",
            title="Enviar proposta",
        )
    )

    updated = service.update_activity(
        activity.id,
        CRMActivityUpdateRequest(
            due_at=local_now() + timedelta(days=2),
            status="canceled",
            note="Cliente pausou negociacao",
        ),
    )

    assert updated.status == "canceled"
    assert updated.note == "Cliente pausou negociacao"
    assert updated.due_at is not None
