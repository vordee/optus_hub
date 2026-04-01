from fastapi import HTTPException
from app.schemas.project import ProjectCreateRequest
from app.schemas.project_checklist_item import (
    ProjectChecklistItemCreateRequest,
    ProjectChecklistItemUpdateRequest,
)
from app.services.project_service import ProjectService
from app.services.project_checklist_service import ProjectChecklistService


def test_create_update_and_list_project_checklist_items(db_session) -> None:
    project = ProjectService(db_session).create_project(
        ProjectCreateRequest(name="Projeto base", status="planned"),
        changed_by_email="admin@example.com",
    )
    service = ProjectChecklistService(db_session)
    phase = ProjectService(db_session).list_phases(project.id)[0]

    created = service.create_item(
        project.id,
        ProjectChecklistItemCreateRequest(
            project_phase_id=phase.id,
            title="Confirmar aceite operacional",
            description="Validar documentos e handoff",
            status="pending",
        ),
        changed_by_email="ops@example.com",
    )
    updated = service.update_item(
        project.id,
        created.id,
        ProjectChecklistItemUpdateRequest(status="done"),
        changed_by_email="ops@example.com",
    )
    items, total = service.list_items(project.id, query="aceite", status="done", page=1, page_size=10)

    assert updated.status == "done"
    assert updated.completed_at is not None
    assert total == 1
    assert len(items) == 1
    assert items[0].title == "Confirmar aceite operacional"
    assert items[0].project_phase_id == phase.id
    history = service.list_status_history(project.id, created.id)
    assert len(history) == 2
    assert history[0].from_status == "pending"
    assert history[0].to_status == "done"
    assert history[0].changed_by_email == "ops@example.com"
    assert history[1].from_status is None
    assert history[1].to_status == "pending"


def test_project_checklist_rejects_invalid_transition(db_session) -> None:
    project = ProjectService(db_session).create_project(ProjectCreateRequest(name="Projeto base", status="planned"))
    service = ProjectChecklistService(db_session)
    phase = ProjectService(db_session).list_phases(project.id)[0]
    item = service.create_item(
        project.id,
        ProjectChecklistItemCreateRequest(project_phase_id=phase.id, title="Aceite documental"),
    )
    service.update_item(
        project.id,
        item.id,
        ProjectChecklistItemUpdateRequest(status="done"),
        changed_by_email="ops@example.com",
    )

    try:
        service.update_item(
            project.id,
            item.id,
            ProjectChecklistItemUpdateRequest(status="pending"),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected invalid checklist transition to be rejected.")
