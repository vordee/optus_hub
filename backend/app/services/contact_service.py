from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.repositories.company_repository import CompanyRepository
from app.repositories.contact_repository import ContactRepository
from app.schemas.contact import ContactCreateRequest, ContactUpdateRequest


class ContactService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.contact_repository = ContactRepository(db)
        self.company_repository = CompanyRepository(db)

    def list_contacts(self) -> list[Contact]:
        return self.contact_repository.list_all()

    def create_contact(self, payload: ContactCreateRequest) -> Contact:
        company_id = self._resolve_company_id(payload.company_id)
        contact = self.contact_repository.create(
            company_id=company_id,
            full_name=payload.full_name.strip(),
            email=self._normalize_optional(payload.email),
            phone=self._normalize_optional(payload.phone),
            position=self._normalize_optional(payload.position),
            is_active=payload.is_active,
        )
        return self.contact_repository.save(contact)

    def update_contact(self, contact_id: int, payload: ContactUpdateRequest) -> Contact:
        contact = self.contact_repository.get_by_id(contact_id)
        if contact is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found.")

        if payload.company_id is not None:
            contact.company_id = self._resolve_company_id(payload.company_id)
        if payload.full_name is not None:
            contact.full_name = payload.full_name.strip()
        if payload.email is not None:
            contact.email = self._normalize_optional(payload.email)
        if payload.phone is not None:
            contact.phone = self._normalize_optional(payload.phone)
        if payload.position is not None:
            contact.position = self._normalize_optional(payload.position)
        if payload.is_active is not None:
            contact.is_active = payload.is_active

        return self.contact_repository.save(contact)

    def _resolve_company_id(self, company_id: int | None) -> int | None:
        if company_id is None:
            return None
        company = self.company_repository.get_by_id(company_id)
        if company is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown company.")
        return company.id

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
