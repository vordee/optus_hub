from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class ContactCreateRequest(BaseModel):
    company_id: Optional[int] = None
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    is_active: bool = True


class ContactUpdateRequest(BaseModel):
    company_id: Optional[int] = None
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    is_active: Optional[bool] = None


class ContactResponse(BaseModel):
    id: int
    company_id: Optional[int]
    company_name: Optional[str]
    full_name: str
    email: Optional[EmailStr]
    phone: Optional[str]
    position: Optional[str]
    is_active: bool
    created_at: datetime
