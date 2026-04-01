from fastapi import HTTPException

from app.schemas.project import ProjectCreateRequest
from app.schemas.project_phase import ProjectPhaseUpdateRequest
from app.schemas.project_task import ProjectTaskCreateRequest
from app.services.project_phase_service import ProjectPhaseService
from app.services.project_service import ProjectService
from app.services.project_task_service import ProjectTaskService


def test_project_phase_metrics_reflect_task_distribution(db_session) -> None:
    project_service = ProjectService(db_session)
    project = project_service.create_project(ProjectCreateRequest(name="Projeto base", status="planned"))
    phase = project_service.list_phases(project.id)[0]
    task_service = ProjectTaskService(db_session)

    task_service.create_task(
        project.id,
        ProjectTaskCreateRequest(project_phase_id=phase.id, title="Tarefa 1", status="pending"),
    )
    task_service.create_task(
        project.id,
        ProjectTaskCreateRequest(project_phase_id=phase.id, title="Tarefa 2", status="done"),
    )

    metrics = ProjectPhaseService(db_session).list_phase_metrics(project.id)

    assert metrics[phase.id].task_count == 2
    assert metrics[phase.id].pending_task_count == 1
    assert metrics[phase.id].done_task_count == 1


def test_project_phase_update_keeps_notes_and_timestamps(db_session) -> None:
    service = ProjectService(db_session)
    project = service.create_project(ProjectCreateRequest(name="Projeto fase", status="planned"))
    phase = service.list_phases(project.id)[0]

    started = service.update_phase(
        project.id,
        phase.id,
        ProjectPhaseUpdateRequest(status="in_progress", notes="  Execucao iniciada  "),
        changed_by_email="ops@example.com",
    )
    completed = service.update_phase(
        project.id,
        phase.id,
        ProjectPhaseUpdateRequest(status="completed", notes="Execucao concluida"),
        changed_by_email="ops@example.com",
    )

    assert started.started_at is not None
    assert completed.completed_at is not None
    assert completed.notes == "Execucao concluida"
    assert ProjectPhaseService.build_metrics_for_phase(completed).duration_days is not None


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
