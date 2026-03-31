from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.project_phase import ProjectPhaseResponse
from app.schemas.status_history import StatusHistoryResponse


class ProjectCreateRequest(BaseModel):
    opportunity_id: Optional[int] = None
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    name: str
    status: str = "planned"
    description: Optional[str] = None
    kickoff_owner_email: Optional[str] = None
    kickoff_target_date: Optional[date] = None
    kickoff_notes: Optional[str] = None


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    kickoff_owner_email: Optional[str] = None
    kickoff_target_date: Optional[date] = None
    kickoff_notes: Optional[str] = None


class ProjectKickoffRequest(BaseModel):
    project_name: Optional[str] = None
    kickoff_owner_email: Optional[str] = None
    kickoff_target_date: Optional[date] = None
    kickoff_notes: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    opportunity_id: Optional[int]
    company_id: Optional[int]
    company_name: Optional[str]
    contact_id: Optional[int]
    contact_name: Optional[str]
    name: str
    status: str
    description: Optional[str]
    kickoff_owner_email: Optional[str]
    kickoff_target_date: Optional[date]
    kickoff_notes: Optional[str]
    created_at: datetime


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int


class ProjectDetailResponse(ProjectResponse):
    phases: list[ProjectPhaseResponse]
    history: list[StatusHistoryResponse]
