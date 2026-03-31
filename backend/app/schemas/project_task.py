from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ProjectTaskCreateRequest(BaseModel):
    project_phase_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str = "pending"
    assigned_to_email: Optional[str] = None
    due_date: Optional[date] = None


class ProjectTaskUpdateRequest(BaseModel):
    project_phase_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_email: Optional[str] = None
    due_date: Optional[date] = None


class ProjectTaskResponse(BaseModel):
    id: int
    project_id: int
    project_phase_id: Optional[int]
    project_phase_name: Optional[str]
    title: str
    description: Optional[str]
    status: str
    assigned_to_email: Optional[str]
    due_date: Optional[date]
    created_at: datetime
