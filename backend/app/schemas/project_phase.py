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
    task_count: int = 0
    pending_task_count: int = 0
    in_progress_task_count: int = 0
    blocked_task_count: int = 0
    done_task_count: int = 0
    duration_days: Optional[int] = None


class ProjectPhaseUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None
