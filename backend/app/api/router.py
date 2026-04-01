from fastapi import APIRouter

from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.companies import router as companies_router
from app.api.v1.contacts import router as contacts_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.health import router as health_router
from app.api.v1.leads import router as leads_router
from app.api.v1.opportunities import router as opportunities_router
from app.api.v1.project_checklists import router as project_checklists_router
from app.api.v1.project_phases import router as project_phases_router
from app.api.v1.projects import router as projects_router
from app.api.v1.project_tasks import router as project_tasks_router
from app.api.v1.roles import router as roles_router
from app.api.v1.users import router as users_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="/v1", tags=["health"])
api_router.include_router(auth_router, prefix="/v1/auth", tags=["auth"])
api_router.include_router(dashboard_router, prefix="/v1", tags=["dashboard"])
api_router.include_router(audit_router, prefix="/v1/admin", tags=["audit"])
api_router.include_router(companies_router, prefix="/v1/crm", tags=["companies"])
api_router.include_router(contacts_router, prefix="/v1/crm", tags=["contacts"])
api_router.include_router(leads_router, prefix="/v1/crm", tags=["leads"])
api_router.include_router(opportunities_router, prefix="/v1/crm", tags=["opportunities"])
api_router.include_router(projects_router, prefix="/v1", tags=["projects"])
api_router.include_router(project_phases_router, prefix="/v1", tags=["project_phases"])
api_router.include_router(project_checklists_router, prefix="/v1", tags=["project_checklists"])
api_router.include_router(project_tasks_router, prefix="/v1", tags=["project_tasks"])
api_router.include_router(users_router, prefix="/v1/admin", tags=["users"])
api_router.include_router(roles_router, prefix="/v1/admin", tags=["roles"])
