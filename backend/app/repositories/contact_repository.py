from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.contact import Contact


class ContactRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Contact]:
        stmt = select(Contact).options(joinedload(Contact.company)).order_by(Contact.full_name, Contact.id)
        return list(self.db.execute(stmt).scalars().unique().all())

    def get_by_id(self, contact_id: int) -> Optional[Contact]:
        stmt = select(Contact).options(joinedload(Contact.company)).where(Contact.id == contact_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(
        self,
        *,
        company_id: int | None,
        full_name: str,
        email: str | None,
        phone: str | None,
        position: str | None,
        is_active: bool,
    ) -> Contact:
        contact = Contact(
            company_id=company_id,
            full_name=full_name,
            email=email,
            phone=phone,
            position=position,
            is_active=is_active,
        )
        self.db.add(contact)
        self.db.flush()
        return contact

    def save(self, contact: Contact) -> Contact:
        self.db.commit()
        self.db.refresh(contact)
        return contact
