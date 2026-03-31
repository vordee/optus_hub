from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.status_history import StatusHistoryResponse


class OpportunityCreateRequest(BaseModel):
    lead_id: Optional[int] = None
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str = "open"
    amount: Optional[float] = Field(default=None, ge=0)


class OpportunityUpdateRequest(BaseModel):
    lead_id: Optional[int] = None
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)


class OpportunityTransitionRequest(BaseModel):
    to_status: str
    note: Optional[str] = None


class OpportunityResponse(BaseModel):
    id: int
    lead_id: Optional[int]
    company_id: Optional[int]
    company_name: Optional[str]
    contact_id: Optional[int]
    contact_name: Optional[str]
    title: str
    description: Optional[str]
    status: str
    amount: Optional[float]
    created_at: datetime


class OpportunityProjectSummary(BaseModel):
    id: int
    name: str
    status: str


class OpportunityListResponse(BaseModel):
    items: list[OpportunityResponse]
    total: int
    page: int
    page_size: int


class OpportunityDetailResponse(OpportunityResponse):
    next_statuses: list[str]
    history: list[StatusHistoryResponse]
    linked_project: Optional[OpportunityProjectSummary] = None
    can_open_project: bool = False
