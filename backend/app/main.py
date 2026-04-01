import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from sqlalchemy import inspect, text

import app.models  # noqa: F401
from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.services.bootstrap_service import BootstrapService

logger = logging.getLogger("optus_hub.api")
SLOW_REQUEST_THRESHOLD_MS = 500.0


def ensure_runtime_schema() -> None:
    inspector = inspect(engine)
    if "projects" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("projects")}
    statements = []
    if "kickoff_owner_email" not in existing_columns:
        statements.append("ALTER TABLE projects ADD COLUMN kickoff_owner_email VARCHAR(255)")
    if "kickoff_target_date" not in existing_columns:
        statements.append("ALTER TABLE projects ADD COLUMN kickoff_target_date DATE")
    if "kickoff_notes" not in existing_columns:
        statements.append("ALTER TABLE projects ADD COLUMN kickoff_notes TEXT")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema()
    with SessionLocal() as db:
        BootstrapService(db).ensure_foundation_data()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    @app.middleware("http")
    async def request_timing_middleware(request: Request, call_next) -> Response:
        started_at = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = (time.perf_counter() - started_at) * 1000
            route = request.scope.get("route")
            route_path = getattr(route, "path", request.url.path)
            logger.exception(
                "request_failed method=%s route=%s elapsed_ms=%.2f",
                request.method,
                route_path,
                elapsed_ms,
            )
            raise

        elapsed_ms = (time.perf_counter() - started_at) * 1000
        route = request.scope.get("route")
        route_path = getattr(route, "path", request.url.path)
        log_message = (
            "request_completed method=%s route=%s status_code=%s elapsed_ms=%.2f"
            % (request.method, route_path, response.status_code, elapsed_ms)
        )
        if elapsed_ms >= SLOW_REQUEST_THRESHOLD_MS:
            logger.warning(log_message)
        else:
            logger.info(log_message)
        response.headers["x-request-time-ms"] = f"{elapsed_ms:.2f}"
        return response

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
