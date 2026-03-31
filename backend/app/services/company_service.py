from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company import Company
from app.repositories.company_repository import CompanyRepository
from app.schemas.company import CompanyCreateRequest, CompanyUpdateRequest


class CompanyService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.company_repository = CompanyRepository(db)

    def list_companies(self) -> list[Company]:
        return self.company_repository.list_all()

    def create_company(self, payload: CompanyCreateRequest) -> Company:
        tax_id = self._normalize_optional(payload.tax_id)
        if tax_id and self.company_repository.get_by_tax_id(tax_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company tax_id already exists.")

        company = self.company_repository.create(
            legal_name=payload.legal_name.strip(),
            trade_name=self._normalize_optional(payload.trade_name),
            tax_id=tax_id,
            is_active=payload.is_active,
        )
        return self.company_repository.save(company)

    def update_company(self, company_id: int, payload: CompanyUpdateRequest) -> Company:
        company = self.company_repository.get_by_id(company_id)
        if company is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")

        if payload.legal_name is not None:
            company.legal_name = payload.legal_name.strip()
        if payload.trade_name is not None:
            company.trade_name = self._normalize_optional(payload.trade_name)
        if payload.tax_id is not None:
            tax_id = self._normalize_optional(payload.tax_id)
            existing = self.company_repository.get_by_tax_id(tax_id) if tax_id else None
            if existing is not None and existing.id != company.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company tax_id already exists.")
            company.tax_id = tax_id
        if payload.is_active is not None:
            company.is_active = payload.is_active

        return self.company_repository.save(company)

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None
