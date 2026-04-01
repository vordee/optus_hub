from app.integrations.bling.service import BlingSyncService


class FakeBlingClient:
    def list_contacts(self, **kwargs):
        return {"module": "contacts", "kwargs": kwargs}

    def list_products(self, **kwargs):
        return {"module": "products", "kwargs": kwargs}

    def list_sales_orders(self, **kwargs):
        return {"module": "sales_orders", "kwargs": kwargs}

    def list_invoices(self, **kwargs):
        return {"module": "invoices", "kwargs": kwargs}


def test_build_hourly_window_uses_isoformat() -> None:
    window = BlingSyncService(client=FakeBlingClient()).build_hourly_window()

    assert "T" in window
    assert window.endswith("-04:00")


def test_run_hourly_read_only_sync_returns_expected_modules() -> None:
    snapshots = BlingSyncService(client=FakeBlingClient()).run_hourly_read_only_sync()

    assert [item.module for item in snapshots] == ["contacts", "products", "sales_orders", "invoices"]
    assert all(item.params["page"] == 1 for item in snapshots)


def test_fetch_read_only_module_uses_since_for_products() -> None:
    snapshot = BlingSyncService(client=FakeBlingClient()).fetch_read_only_module(
        module="products",
        page=2,
        page_size=25,
        since="2026-04-01T10:00:00-04:00",
    )

    assert snapshot.module == "products"
    assert snapshot.params == {
        "page": 2,
        "page_size": 25,
        "since": "2026-04-01T10:00:00-04:00",
    }
    assert snapshot.payload["kwargs"]["updated_from"] == "2026-04-01T10:00:00-04:00"
    assert snapshot.payload["kwargs"]["page"] == 2


def test_fetch_read_only_module_uses_since_for_invoices() -> None:
    snapshot = BlingSyncService(client=FakeBlingClient()).fetch_read_only_module(
        module="invoices",
        since="2026-04-01T10:00:00-04:00",
    )

    assert snapshot.module == "invoices"
    assert snapshot.payload["kwargs"]["issued_from"] == "2026-04-01T10:00:00-04:00"
