from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: int
    created_at: datetime
    action: str
    status: str
    actor_email: Optional[str]
    target_type: Optional[str]
    target_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Optional[dict[str, Any]]
