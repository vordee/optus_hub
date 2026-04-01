from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class SavedViewCreateRequest(BaseModel):
    module: str
    name: str
    filters_json: dict[str, Any] = Field(default_factory=dict)
    group_by: Optional[str] = None
    sort_by: Optional[str] = None
    sort_direction: str = "desc"
    is_default: bool = False


class SavedViewUpdateRequest(BaseModel):
    module: Optional[str] = None
    name: Optional[str] = None
    filters_json: Optional[dict[str, Any]] = None
    group_by: Optional[str] = None
    sort_by: Optional[str] = None
    sort_direction: Optional[str] = None
    is_default: Optional[bool] = None


class SavedViewResponse(BaseModel):
    id: int
    module: str
    name: str
    filters_json: dict[str, Any]
    group_by: Optional[str]
    sort_by: Optional[str]
    sort_direction: str
    is_default: bool
    created_by_email: Optional[str]
    updated_by_email: Optional[str]
    created_at: datetime
    updated_at: datetime
