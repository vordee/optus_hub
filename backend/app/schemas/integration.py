from __future__ import annotations

from typing import Dict, Literal, Union

from pydantic import BaseModel


BlingModule = Literal["contacts", "products", "sales_orders", "invoices"]


class BlingReadOnlyResponse(BaseModel):
    enabled: bool
    module: BlingModule
    params: Dict[str, Union[str, int]]
    payload: dict
