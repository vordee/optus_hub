from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo


APP_TIMEZONE = ZoneInfo("America/Cuiaba")


def local_now() -> datetime:
    return datetime.now(APP_TIMEZONE).replace(tzinfo=None)
