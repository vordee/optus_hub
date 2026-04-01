from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import require_permission
from app.integrations.bling.service import BlingSyncService
from app.schemas.integration import BlingModule, BlingReadOnlyResponse

router = APIRouter()


@router.get(
    "/integrations/bling/read-only",
    response_model=BlingReadOnlyResponse,
    dependencies=[Depends(require_permission("audit:read"))],
)
def get_bling_read_only_snapshot(
    module: BlingModule = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    since: Optional[str] = Query(None),
) -> BlingReadOnlyResponse:
    service = BlingSyncService()
    if not service.is_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bling integration is disabled.",
        )

    snapshot = service.fetch_read_only_module(
        module=module,
        page=page,
        page_size=page_size,
        since=since,
    )
    return BlingReadOnlyResponse(
        enabled=True,
        module=snapshot.module,
        params=snapshot.params,
        payload=snapshot.payload,
    )
