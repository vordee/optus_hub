from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.time import local_now
from app.repositories.crm_activity_repository import CRMActivityRepository
from app.repositories.lead_repository import LeadRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.repositories.user_repository import UserRepository
from app.schemas.crm_activity import CRMActivityCreateRequest, CRMActivityUpdateRequest

ACTIVITY_ENTITY_TYPES = {"lead", "opportunity"}
ACTIVITY_TYPES = {"call", "email", "meeting", "task", "follow_up"}
ACTIVITY_STATUSES = {"pending", "done", "canceled"}


class CRMActivityService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.activity_repository = CRMActivityRepository(db)
        self.lead_repository = LeadRepository(db)
        self.opportunity_repository = OpportunityRepository(db)
        self.user_repository = UserRepository(db)

    def list_for_entity(self, *, entity_type: str, entity_id: int):
        self._ensure_entity_exists(entity_type=entity_type, entity_id=entity_id)
        return self.activity_repository.list_for_entity(entity_type=entity_type, entity_id=entity_id)

    def get_next_for_entity(self, *, entity_type: str, entity_id: int):
        self._ensure_entity_exists(entity_type=entity_type, entity_id=entity_id)
        return self.activity_repository.get_next_for_entity(entity_type=entity_type, entity_id=entity_id)

    def count_overdue_for_entity(self, *, entity_type: str, entity_id: int) -> int:
        self._ensure_entity_exists(entity_type=entity_type, entity_id=entity_id)
        return self.activity_repository.count_overdue_for_entity(
            entity_type=entity_type,
            entity_id=entity_id,
            reference_time=local_now(),
        )

    def create_activity(self, payload: CRMActivityCreateRequest, *, created_by_email: str | None = None):
        entity_type = self._validate_entity_type(payload.entity_type)
        self._ensure_entity_exists(entity_type=entity_type, entity_id=payload.entity_id)
        owner_user_id = self._validate_owner_user_id(payload.owner_user_id)
        activity_type = self._validate_activity_type(payload.activity_type)
        activity = self.activity_repository.create(
            entity_type=entity_type,
            entity_id=payload.entity_id,
            activity_type=activity_type,
            title=self._normalize_required(payload.title),
            note=self._normalize_optional(payload.note),
            due_at=payload.due_at,
            owner_user_id=owner_user_id,
            created_by_email=created_by_email,
        )
        return self.activity_repository.save(activity)

    def update_activity(self, activity_id: int, payload: CRMActivityUpdateRequest):
        activity = self.activity_repository.get_by_id(activity_id)
        if activity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")

        if payload.activity_type is not None:
            activity.activity_type = self._validate_activity_type(payload.activity_type)
        if payload.title is not None:
            activity.title = self._normalize_required(payload.title)
        if payload.note is not None:
            activity.note = self._normalize_optional(payload.note)
        if payload.due_at is not None or payload.due_at is None:
            activity.due_at = payload.due_at
        if payload.owner_user_id is not None:
            activity.owner_user_id = self._validate_owner_user_id(payload.owner_user_id)
        if payload.status is not None:
            activity.status = self._validate_status(payload.status)
            activity.completed_at = local_now() if activity.status == "done" else None

        return self.activity_repository.save(activity)

    def complete_activity(self, activity_id: int):
        return self.update_activity(activity_id, CRMActivityUpdateRequest(status="done"))

    def _ensure_entity_exists(self, *, entity_type: str, entity_id: int) -> None:
        if entity_type == "lead":
            entity = self.lead_repository.get_by_id(entity_id)
        else:
            entity = self.opportunity_repository.get_by_id(entity_id)
        if entity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CRM entity not found.")

    @staticmethod
    def _validate_entity_type(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ACTIVITY_ENTITY_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown CRM entity type.")
        return normalized

    @staticmethod
    def _validate_activity_type(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ACTIVITY_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown activity type.")
        return normalized

    @staticmethod
    def _validate_status(value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ACTIVITY_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown activity status.")
        return normalized

    def _validate_owner_user_id(self, value: int | None) -> int | None:
        if value is None:
            return None
        user = self.user_repository.get_by_id(value)
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown activity owner.")
        return user.id

    @staticmethod
    def _normalize_required(value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activity title is required.")
        return normalized

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
