from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StatusHistoryResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    from_status: Optional[str]
    to_status: str
    note: Optional[str]
    changed_by_email: Optional[str]
    changed_at: datetime
