from pydantic import BaseModel


class RoleCreateRequest(BaseModel):
    name: str
    description: str
    permission_codes: list[str] = []


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str
    permissions: list[str]
