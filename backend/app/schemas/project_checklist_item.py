from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.status_history import StatusHistoryResponse


class ProjectChecklistItemCreateRequest(BaseModel):
    project_phase_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str = "pending"


class ProjectChecklistItemUpdateRequest(BaseModel):
    project_phase_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectChecklistItemResponse(BaseModel):
    id: int
    project_id: int
    project_phase_id: Optional[int]
    project_phase_name: Optional[str]
    title: str
    description: Optional[str]
    status: str
    completed_at: Optional[datetime]
    created_at: datetime


class ProjectChecklistItemListResponse(BaseModel):
    items: list[ProjectChecklistItemResponse]
    total: int
    page: int
    page_size: int


class ProjectChecklistItemDetailResponse(ProjectChecklistItemResponse):
    history: list[StatusHistoryResponse]
