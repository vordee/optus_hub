from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

LeadStatus = Literal["new", "qualified", "won", "lost"]


class LeadCreateRequest(BaseModel):
    name: str
    status: LeadStatus = "new"
    source: Optional[str] = None
    summary: Optional[str] = None
    notes: Optional[str] = None
    company_id: Optional[int] = None
    contact_id: Optional[int] = None


class LeadUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[str] = None
    summary: Optional[str] = None
    notes: Optional[str] = None
    company_id: Optional[int] = None
    contact_id: Optional[int] = None


class LeadResponse(BaseModel):
    id: int
    name: str
    status: LeadStatus
    source: Optional[str]
    summary: Optional[str]
    notes: Optional[str]
    company_id: Optional[int]
    contact_id: Optional[int]
    created_at: datetime
    updated_at: datetime
