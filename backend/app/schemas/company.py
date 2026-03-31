from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CompanyCreateRequest(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    tax_id: Optional[str] = None
    is_active: bool = True


class CompanyUpdateRequest(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    tax_id: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyResponse(BaseModel):
    id: int
    legal_name: str
    trade_name: Optional[str]
    tax_id: Optional[str]
    is_active: bool
    created_at: datetime
    contact_count: int
    lead_count: int
