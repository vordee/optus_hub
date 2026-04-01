from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from app.core.config import get_settings
from app.core.time import APP_TIMEZONE, local_now
from app.integrations.bling.client import BlingClient
from app.schemas.integration import BlingModule


@dataclass
class BlingSyncSnapshot:
    module: str
    params: dict[str, str | int]
    payload: dict


class BlingSyncService:
    def __init__(self, client: BlingClient | None = None) -> None:
        self.settings = get_settings()
        self.client = client or BlingClient()

    def is_enabled(self) -> bool:
        return self.settings.bling_enabled

    def build_hourly_window(self) -> str:
        reference = local_now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        return reference.replace(tzinfo=APP_TIMEZONE).isoformat(timespec="seconds")

    def fetch_read_only_module(
        self,
        *,
        module: BlingModule,
        page: int = 1,
        page_size: int = 100,
        since: str | None = None,
    ) -> BlingSyncSnapshot:
        if module == "contacts":
            payload = self.client.list_contacts(page=page, page_size=page_size, updated_from=since)
        elif module == "products":
            payload = self.client.list_products(page=page, page_size=page_size, updated_from=since)
        elif module == "sales_orders":
            payload = self.client.list_sales_orders(page=page, page_size=page_size, updated_from=since)
        else:
            payload = self.client.list_invoices(page=page, page_size=page_size, issued_from=since)

        return BlingSyncSnapshot(
            module=module,
            params={"page": page, "page_size": page_size, "since": since or ""},
            payload=payload,
        )

    def run_hourly_read_only_sync(self) -> list[BlingSyncSnapshot]:
        updated_from = self.build_hourly_window()
        return [
            BlingSyncSnapshot(
                module="contacts",
                params={"page": 1, "page_size": 100, "updated_from": updated_from},
                payload=self.client.list_contacts(page=1, page_size=100, updated_from=updated_from),
            ),
            BlingSyncSnapshot(
                module="products",
                params={"page": 1, "page_size": 100, "updated_from": updated_from},
                payload=self.client.list_products(page=1, page_size=100, updated_from=updated_from),
            ),
            BlingSyncSnapshot(
                module="sales_orders",
                params={"page": 1, "page_size": 100, "updated_from": updated_from},
                payload=self.client.list_sales_orders(page=1, page_size=100, updated_from=updated_from),
            ),
            BlingSyncSnapshot(
                module="invoices",
                params={"page": 1, "page_size": 100, "issued_from": updated_from},
                payload=self.client.list_invoices(page=1, page_size=100, issued_from=updated_from),
            ),
        ]
