from fastapi import HTTPException

from app.schemas.saved_view import SavedViewCreateRequest, SavedViewUpdateRequest
from app.services.saved_view_service import SavedViewService


def test_saved_view_crud_and_default_management(db_session) -> None:
    service = SavedViewService(db_session)

    first = service.create_view(
        SavedViewCreateRequest(
            module="leads",
            name="Leads novos",
            filters_json={"status": "new"},
            sort_by="created_at",
            sort_direction="desc",
            is_default=True,
        )
    )
    second = service.create_view(
        SavedViewCreateRequest(
            module="leads",
            name="Leads por nome",
            filters_json={"query": "lead"},
            sort_by="title",
            sort_direction="asc",
            is_default=True,
        )
    )

    assert service.get_view(first.id).is_default is False
    assert service.get_view(second.id).is_default is True

    updated = service.update_view(
        second.id,
        SavedViewUpdateRequest(
            name="Leads por título",
            sort_by="title",
            sort_direction="asc",
            is_default=False,
        ),
    )

    assert updated.name == "Leads por título"
    assert updated.is_default is False

    service.delete_view(first.id)

    try:
        service.get_view(first.id)
    except HTTPException as exc:
        assert exc.status_code == 404
    else:
        raise AssertionError("Expected deleted saved view to be missing.")


def test_saved_view_rejects_invalid_definition(db_session) -> None:
    service = SavedViewService(db_session)

    try:
        service.create_view(
            SavedViewCreateRequest(
                module="leads",
                name="Inválida",
                filters_json={"unsupported": "value"},
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected unsupported filter field to be rejected.")

    try:
        service.create_view(
            SavedViewCreateRequest(
                module="leads",
                name="Inválida",
                filters_json={},
                sort_by="amount",
            )
        )
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("Expected invalid sort field to be rejected.")
