from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.core.database import SessionLocal
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get(
    "/dashboard/summary",
    response_model=DashboardSummaryResponse,
    dependencies=[Depends(require_permission("audit:read"))],
)
def get_dashboard_summary() -> DashboardSummaryResponse:
    with SessionLocal() as db:
        return DashboardService(db).get_summary()
