from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.company import Company


class CompanyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[Company]:
        stmt = (
            select(Company)
            .options(selectinload(Company.contacts), selectinload(Company.leads))
            .order_by(Company.legal_name, Company.id)
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def get_by_id(self, company_id: int) -> Optional[Company]:
        stmt = (
            select(Company)
            .options(selectinload(Company.contacts), selectinload(Company.leads))
            .where(Company.id == company_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_tax_id(self, tax_id: str) -> Optional[Company]:
        stmt = (
            select(Company)
            .options(selectinload(Company.contacts), selectinload(Company.leads))
            .where(Company.tax_id == tax_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, *, legal_name: str, trade_name: str | None, tax_id: str | None, is_active: bool) -> Company:
        company = Company(legal_name=legal_name, trade_name=trade_name, tax_id=tax_id, is_active=is_active)
        self.db.add(company)
        self.db.flush()
        return company

    def save(self, company: Company) -> Company:
        self.db.commit()
        self.db.refresh(company)
        return company
