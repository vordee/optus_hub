from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import get_settings


class BlingClientError(Exception):
    pass


@dataclass
class BlingTokenBundle:
    access_token: str
    refresh_token: str | None
    token_type: str
    expires_in: int | None


class BlingClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    def list_contacts(self, *, page: int = 1, page_size: int = 100, updated_from: str | None = None) -> dict[str, Any]:
        return self._get(
            "/contatos",
            {
                "pagina": page,
                "limite": page_size,
                "dataAlteracaoInicial": updated_from,
            },
        )

    def list_products(self, *, page: int = 1, page_size: int = 100, updated_from: str | None = None) -> dict[str, Any]:
        return self._get(
            "/produtos",
            {
                "pagina": page,
                "limite": page_size,
                "dataAlteracaoInicial": updated_from,
            },
        )

    def list_sales_orders(self, *, page: int = 1, page_size: int = 100, updated_from: str | None = None) -> dict[str, Any]:
        return self._get(
            "/pedidos/vendas",
            {
                "pagina": page,
                "limite": page_size,
                "dataAlteracaoInicial": updated_from,
            },
        )

    def list_invoices(self, *, page: int = 1, page_size: int = 100, issued_from: str | None = None) -> dict[str, Any]:
        return self._get(
            "/nfes",
            {
                "pagina": page,
                "limite": page_size,
                "dataEmissaoInicial": issued_from,
            },
        )

    def refresh_access_token(self) -> BlingTokenBundle:
        refresh_token = self.settings.bling_refresh_token.strip()
        if not refresh_token:
            raise BlingClientError("Missing BLING_REFRESH_TOKEN.")

        body = urlencode(
            {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            }
        ).encode("utf-8")
        headers = {
            "Authorization": f"Basic {self._basic_auth_value()}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "enable-jwt": "1",
        }
        payload = self._request("POST", f"{self.settings.bling_oauth_base_url}/oauth/token", headers=headers, data=body)
        return BlingTokenBundle(
            access_token=payload["access_token"],
            refresh_token=payload.get("refresh_token"),
            token_type=payload.get("token_type", "Bearer"),
            expires_in=payload.get("expires_in"),
        )

    def _get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        token = self.settings.bling_access_token.strip()
        if not token:
            raise BlingClientError("Missing BLING_ACCESS_TOKEN.")

        clean_params = {key: value for key, value in params.items() if value not in (None, "")}
        query = f"?{urlencode(clean_params)}" if clean_params else ""
        return self._request(
            "GET",
            f"{self.settings.bling_api_base_url}{path}{query}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "enable-jwt": "1",
            },
        )

    def _request(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str],
        data: bytes | None = None,
    ) -> dict[str, Any]:
        request = Request(url=url, headers=headers, method=method, data=data)
        try:
            with urlopen(request, timeout=30) as response:
                content = response.read().decode("utf-8")
        except Exception as exc:
            raise BlingClientError(str(exc)) from exc

        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise BlingClientError("Invalid JSON returned by Bling.") from exc

    def _basic_auth_value(self) -> str:
        client_id = self.settings.bling_client_id.strip()
        client_secret = self.settings.bling_client_secret.strip()
        if not client_id or not client_secret:
            raise BlingClientError("Missing BLING_CLIENT_ID or BLING_CLIENT_SECRET.")
        raw = f"{client_id}:{client_secret}".encode("utf-8")
        return base64.b64encode(raw).decode("ascii")
