from fastapi import HTTPException

from app.schemas.project import ProjectCreateRequest
from app.schemas.project_task import ProjectTaskCreateRequest, ProjectTaskUpdateRequest
from app.services.project_service import ProjectService
from app.services.project_task_service import ProjectTaskService


def test_create_update_and_list_project_tasks(db_session) -> None:
    project = ProjectService(db_session).create_project(
        ProjectCreateRequest(name="Projeto base", status="planned"),
        changed_by_email="admin@example.com",
    )
    service = ProjectTaskService(db_session)
    phase = ProjectService(db_session).list_phases(project.id)[0]

    created = service.create_task(
        project.id,
        ProjectTaskCreateRequest(
            project_phase_id=phase.id,
            title="Validar infraestrutura",
            description="Conferir nginx e runtime",
            status="pending",
            assigned_to_email="ops@optus.com",
        ),
    )
    updated = service.update_task(
        project.id,
        created.id,
        ProjectTaskUpdateRequest(status="in_progress", due_date=created.due_date),
    )
    items = service.list_tasks(project.id)

    assert updated.status == "in_progress"
    assert len(items) == 1
    assert items[0].title == "Validar infraestrutura"
    assert items[0].project_phase_id == phase.id


def test_project_task_rejects_unknown_status(db_session) -> None:
    project = ProjectService(db_session).create_project(ProjectCreateRequest(name="Projeto base", status="planned"))
    service = ProjectTaskService(db_session)

    try:
        service.create_task(
            project.id,
            ProjectTaskCreateRequest(title="Tarefa inválida", status="blocked-by-user"),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected invalid project task status to be rejected.")


def test_project_task_rejects_wrong_project(db_session) -> None:
    service = ProjectTaskService(db_session)

    try:
        service.update_task(
            999,
            1,
            ProjectTaskUpdateRequest(status="done"),
        )
    except HTTPException as exc:
        assert exc.status_code == 404
    else:
        raise AssertionError("Expected missing project to be rejected.")


def test_project_task_rejects_unknown_phase(db_session) -> None:
    project = ProjectService(db_session).create_project(ProjectCreateRequest(name="Projeto base", status="planned"))
    service = ProjectTaskService(db_session)

    try:
        service.create_task(
            project.id,
            ProjectTaskCreateRequest(title="Tarefa inválida", project_phase_id=999),
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected unknown project phase to be rejected.")
