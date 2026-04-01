from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DashboardRecentContact(BaseModel):
    id: int
    full_name: str
    company_name: Optional[str]
    created_at: datetime


class DashboardRecentLead(BaseModel):
    id: int
    title: str
    company_name: Optional[str]
    status: str
    created_at: datetime


class DashboardRecentOpportunity(BaseModel):
    id: int
    title: str
    status: str
    created_at: datetime


class DashboardRecentProject(BaseModel):
    id: int
    name: str
    status: str
    created_at: datetime


class DashboardRecentAuditEvent(BaseModel):
    id: int
    created_at: datetime
    action: str
    status: str
    actor_email: Optional[str]
    target_type: Optional[str]
    target_id: Optional[str]


class DashboardSummaryResponse(BaseModel):
    user_count: int
    active_company_count: int
    active_contact_count: int
    lead_count: int
    won_opportunity_count: int
    active_project_count: int
    recent_contacts: list[DashboardRecentContact]
    recent_leads: list[DashboardRecentLead]
    recent_opportunities: list[DashboardRecentOpportunity]
    recent_projects: list[DashboardRecentProject]
    recent_audit_events: list[DashboardRecentAuditEvent]
