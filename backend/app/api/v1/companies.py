from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user_email, require_permission
from app.core.database import SessionLocal
from app.schemas.company import CompanyCreateRequest, CompanyResponse, CompanyUpdateRequest
from app.services.audit_service import AuditService
from app.services.company_service import CompanyService

router = APIRouter()


def serialize_company(company) -> CompanyResponse:
    return CompanyResponse(
        id=company.id,
        legal_name=company.legal_name,
        trade_name=company.trade_name,
        tax_id=company.tax_id,
        is_active=company.is_active,
        created_at=company.created_at,
        contact_count=int(getattr(company, "contact_count", len(company.contacts))),
        lead_count=int(getattr(company, "lead_count", len(company.leads))),
    )


@router.get("/companies", response_model=list[CompanyResponse], dependencies=[Depends(require_permission("companies:read"))])
def list_companies() -> list[CompanyResponse]:
    with SessionLocal() as db:
        return [serialize_company(company) for company in CompanyService(db).list_companies()]


@router.post("/companies", response_model=CompanyResponse, dependencies=[Depends(require_permission("companies:write"))])
def create_company(
    payload: CompanyCreateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> CompanyResponse:
    with SessionLocal() as db:
        company = CompanyService(db).create_company(payload)
        AuditService(db).record_event(
            action="crm.company.create",
            status="success",
            actor_email=current_user_email,
            target_type="company",
            target_id=str(company.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"legal_name": company.legal_name, "tax_id": company.tax_id, "is_active": company.is_active},
        )
        return serialize_company(company)


@router.patch("/companies/{company_id}", response_model=CompanyResponse, dependencies=[Depends(require_permission("companies:write"))])
def update_company(
    company_id: int,
    payload: CompanyUpdateRequest,
    request: Request,
    current_user_email: str = Depends(get_current_user_email),
) -> CompanyResponse:
    with SessionLocal() as db:
        company = CompanyService(db).update_company(company_id, payload)
        AuditService(db).record_event(
            action="crm.company.update",
            status="success",
            actor_email=current_user_email,
            target_type="company",
            target_id=str(company.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={"legal_name": company.legal_name, "tax_id": company.tax_id, "is_active": company.is_active},
        )
        return serialize_company(company)
