from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role_names: list[str] = []
    is_active: bool = True
    is_superuser: bool = False


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role_names: Optional[list[str]] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    is_superuser: bool
    roles: list[str]
    permissions: list[str]
