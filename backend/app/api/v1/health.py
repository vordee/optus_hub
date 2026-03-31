from fastapi import APIRouter

from app.core.database import SessionLocal, check_database_connection

router = APIRouter()


@router.get("/health")
def healthcheck() -> dict[str, str]:
    with SessionLocal() as db:
        database_status = "up" if check_database_connection(db) else "down"
    overall_status = "ok" if database_status == "up" else "degraded"
    return {"status": overall_status, "database": database_status}
