from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.crm_activity import CRMActivityResponse
from app.schemas.status_history import StatusHistoryResponse


class LeadCreateRequest(BaseModel):
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    source: Optional[str] = None
    status: str = "new"


class LeadUpdateRequest(BaseModel):
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None


class LeadResponse(BaseModel):
    id: int
    company_id: Optional[int]
    company_name: Optional[str]
    contact_id: Optional[int]
    contact_name: Optional[str]
    title: str
    description: Optional[str]
    source: Optional[str]
    status: str
    created_at: datetime
    next_activity: Optional[CRMActivityResponse] = None
    overdue_activity_count: int = 0


class LeadListResponse(BaseModel):
    items: list[LeadResponse]
    total: int
    page: int
    page_size: int


class LeadDetailResponse(LeadResponse):
    activities: list[CRMActivityResponse]
    history: list[StatusHistoryResponse]
