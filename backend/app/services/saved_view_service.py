from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.saved_view import SavedView
from app.repositories.saved_view_repository import SavedViewRepository
from app.schemas.saved_view import SavedViewCreateRequest, SavedViewUpdateRequest

SAVED_VIEW_MODULES = {"leads", "opportunities"}
SAVED_VIEW_SORT_DIRECTIONS = {"asc", "desc"}
SAVED_VIEW_GROUP_BY = {
    "leads": {"status", "source", "company", "contact"},
    "opportunities": {"status", "company", "contact", "lead"},
}
SAVED_VIEW_FILTER_KEYS = {
    "leads": {"query", "status", "company_id", "contact_id", "source"},
    "opportunities": {"query", "status", "company_id", "contact_id", "lead_id"},
}
SAVED_VIEW_SORT_FIELDS = {
    "leads": {"created_at", "title", "status", "source", "company_name", "contact_name"},
    "opportunities": {"created_at", "title", "status", "amount", "company_name", "contact_name", "lead_id"},
}


class SavedViewService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SavedViewRepository(db)

    def list_views(self, module: str | None = None) -> list[SavedView]:
        if module is None:
            return sorted(
                self.repository.list_by_module(module="leads") + self.repository.list_by_module(module="opportunities"),
                key=lambda item: (item.module, not item.is_default, item.name.lower(), item.id),
            )
        normalized_module = self._validate_module(module)
        return self.repository.list_by_module(module=normalized_module)

    def get_view(self, view_id: int, *, module: str | None = None) -> SavedView:
        view = self.repository.get_by_id(view_id)
        if view is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved view not found.")
        if module is not None and view.module != self._validate_module(module):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Saved view module mismatch.")
        return view

    def create_view(self, payload: SavedViewCreateRequest, *, created_by_email: str | None = None) -> SavedView:
        module = self._validate_module(payload.module)
        normalized = self._normalize_definition(
            module=module,
            name=payload.name,
            filters_json=payload.filters_json,
            group_by=payload.group_by,
            sort_by=payload.sort_by,
            sort_direction=payload.sort_direction,
            is_default=payload.is_default,
        )
        view = self.repository.create(
            module=module,
            name=normalized["name"],
            filters_json=normalized["filters_json"],
            group_by=normalized["group_by"],
            sort_by=normalized["sort_by"],
            sort_direction=normalized["sort_direction"],
            is_default=normalized["is_default"],
            created_by_email=created_by_email,
        )
        if view.is_default:
            self._clear_other_defaults(module=module, excluded_view_id=view.id)
        return self.repository.save(view)

    def update_view(
        self,
        view_id: int,
        payload: SavedViewUpdateRequest,
        *,
        updated_by_email: str | None = None,
    ) -> SavedView:
        view = self.get_view(view_id)
        next_module = self._validate_module(payload.module) if payload.module is not None else view.module
        next_name = payload.name if payload.name is not None else view.name
        next_filters = payload.filters_json if payload.filters_json is not None else view.filters_json
        next_group_by = payload.group_by if payload.group_by is not None else view.group_by
        next_sort_by = payload.sort_by if payload.sort_by is not None else view.sort_by
        next_sort_direction = payload.sort_direction if payload.sort_direction is not None else view.sort_direction
        next_is_default = payload.is_default if payload.is_default is not None else view.is_default

        normalized = self._normalize_definition(
            module=next_module,
            name=next_name,
            filters_json=next_filters,
            group_by=next_group_by,
            sort_by=next_sort_by,
            sort_direction=next_sort_direction,
            is_default=next_is_default,
        )
        if next_module != view.module:
            view.module = next_module
        view.name = normalized["name"]
        view.filters_json = normalized["filters_json"]
        view.group_by = normalized["group_by"]
        view.sort_by = normalized["sort_by"]
        view.sort_direction = normalized["sort_direction"]
        view.is_default = normalized["is_default"]
        view.updated_by_email = updated_by_email
        if view.is_default:
            self._clear_other_defaults(module=view.module, excluded_view_id=view.id)
        return self.repository.save(view)

    def delete_view(self, view_id: int) -> None:
        view = self.get_view(view_id)
        self.repository.delete(view)

    def _clear_other_defaults(self, *, module: str, excluded_view_id: int | None) -> None:
        for view in self.repository.list_by_module(module=module):
            if excluded_view_id is not None and view.id == excluded_view_id:
                continue
            if view.is_default:
                view.is_default = False
                self.db.flush()

    def _normalize_definition(
        self,
        *,
        module: str,
        name: str,
        filters_json: dict,
        group_by: str | None,
        sort_by: str | None,
        sort_direction: str,
        is_default: bool,
    ) -> dict[str, object]:
        normalized_name = self._normalize_required(name, "Saved view name is required.")
        normalized_group_by = self._normalize_optional(group_by)
        normalized_sort_by = self._normalize_optional(sort_by)
        normalized_sort_direction = sort_direction.strip().lower()
        if normalized_sort_direction not in SAVED_VIEW_SORT_DIRECTIONS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sort direction.")
        if normalized_group_by is not None and normalized_group_by not in SAVED_VIEW_GROUP_BY[module]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid group by field.")
        if normalized_sort_by is not None and normalized_sort_by not in SAVED_VIEW_SORT_FIELDS[module]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sort field.")
        normalized_filters = self._normalize_filters(module=module, filters_json=filters_json)
        return {
            "name": normalized_name,
            "filters_json": normalized_filters,
            "group_by": normalized_group_by,
            "sort_by": normalized_sort_by,
            "sort_direction": normalized_sort_direction,
            "is_default": bool(is_default),
        }

    def _normalize_filters(self, *, module: str, filters_json: dict) -> dict:
        if not isinstance(filters_json, dict):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="filters_json must be an object.")
        allowed_keys = SAVED_VIEW_FILTER_KEYS[module]
        normalized: dict[str, object] = {}
        for key, value in filters_json.items():
            if key not in allowed_keys:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported filter field: {key}.")
            if key in {"query", "status", "source"}:
                text = self._normalize_optional(value if value is None else str(value))
                if text is not None:
                    normalized[key] = text
                continue
            normalized[key] = self._normalize_positive_int(value, field_name=key)
        return normalized

    @staticmethod
    def _validate_module(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in SAVED_VIEW_MODULES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown saved view module.")
        return normalized

    @staticmethod
    def _normalize_required(value: str, error_message: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_message)
        return normalized

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @staticmethod
    def _normalize_positive_int(value, *, field_name: str) -> int:
        try:
            normalized = int(value)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid value for {field_name}.") from exc
        if normalized < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid value for {field_name}.")
        return normalized
