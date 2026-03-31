from datetime import datetime
from typing import Optional

from pydantic import BaseModel


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
