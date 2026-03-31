from app.api.v1.health import healthcheck


def test_healthcheck_returns_database_status() -> None:
    assert healthcheck() == {"status": "ok", "database": "up"}
