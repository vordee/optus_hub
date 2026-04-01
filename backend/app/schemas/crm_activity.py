from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CRMActivityCreateRequest(BaseModel):
    entity_type: str
    entity_id: int
    activity_type: str = "follow_up"
    title: str
    note: Optional[str] = None
    due_at: Optional[datetime] = None
    owner_user_id: Optional[int] = None


class CRMActivityUpdateRequest(BaseModel):
    activity_type: Optional[str] = None
    title: Optional[str] = None
    note: Optional[str] = None
    due_at: Optional[datetime] = None
    owner_user_id: Optional[int] = None
    status: Optional[str] = None


class CRMActivityResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    activity_type: str
    title: str
    note: Optional[str]
    due_at: Optional[datetime]
    owner_user_id: Optional[int]
    owner_user_email: Optional[str]
    owner_user_name: Optional[str]
    status: str
    completed_at: Optional[datetime]
    created_at: datetime
    created_by_email: Optional[str]
