from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProjectPhaseResponse(BaseModel):
    id: int
    project_id: int
    key: str
    name: str
    sequence: int
    status: str
    notes: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime


class ProjectPhaseUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None
