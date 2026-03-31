from __future__ import annotations

import json

from app.integrations.bling.service import BlingSyncService


def main() -> int:
    service = BlingSyncService()
    if not service.is_enabled():
        print("Bling hourly sync skipped: integration disabled.")
        return 0

    snapshots = service.run_hourly_read_only_sync()
    summary = [
        {
            "module": item.module,
            "params": item.params,
            "keys": sorted(item.payload.keys()),
        }
        for item in snapshots
    ]
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
