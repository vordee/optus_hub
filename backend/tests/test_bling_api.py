from fastapi import HTTPException


def test_bling_read_only_endpoint_returns_snapshot(monkeypatch) -> None:
    from app.api.v1 import integrations as integrations_api

    class FakeService:
        def is_enabled(self) -> bool:
            return True

        def fetch_read_only_module(self, *, module: str, page: int, page_size: int, since):
            assert module == "products"
            assert page == 2
            assert page_size == 50
            assert since == "2026-04-01T10:00:00-04:00"
            return type(
                "Snapshot",
                (),
                {
                    "module": "products",
                    "params": {"page": 2, "page_size": 50, "since": since},
                    "payload": {"data": [{"id": 1, "nome": "Produto teste"}]},
                },
            )()

    monkeypatch.setattr(integrations_api, "BlingSyncService", FakeService)

    response = integrations_api.get_bling_read_only_snapshot(
        module="products",
        page=2,
        page_size=50,
        since="2026-04-01T10:00:00-04:00",
    )

    assert response.model_dump() == {
        "enabled": True,
        "module": "products",
        "params": {"page": 2, "page_size": 50, "since": "2026-04-01T10:00:00-04:00"},
        "payload": {"data": [{"id": 1, "nome": "Produto teste"}]},
    }


def test_bling_read_only_endpoint_returns_503_when_disabled(monkeypatch) -> None:
    from app.api.v1 import integrations as integrations_api

    class FakeService:
        def is_enabled(self) -> bool:
            return False

    monkeypatch.setattr(integrations_api, "BlingSyncService", FakeService)

    try:
        integrations_api.get_bling_read_only_snapshot(module="contacts")
    except HTTPException as exc:
        assert exc.status_code == 503
        assert exc.detail == "Bling integration is disabled."
    else:
        raise AssertionError("Expected disabled integration to raise HTTPException.")
