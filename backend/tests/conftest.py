import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-with-32-characters"
os.environ["BOOTSTRAP_ADMIN_EMAIL"] = "admin@example.com"
os.environ["BOOTSTRAP_ADMIN_PASSWORD"] = "super-secret"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

import app.models  # noqa: F401
from app.core.database import Base, SessionLocal, engine
from app.services.bootstrap_service import BootstrapService


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        BootstrapService(session).ensure_foundation_data()


@pytest.fixture
def db_session():
    with SessionLocal() as session:
        yield session
