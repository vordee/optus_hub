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
