#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-/var/backups/optus_hub}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

install -d "$BACKUP_DIR"
su - postgres -c "pg_dump -Fc optus_hub" > "$BACKUP_DIR/optus_hub-$TIMESTAMP.dump"
