#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/opt/optus_hub"
SERVICE_NAME="optus-hub-api"

install -d "$APP_ROOT"
rsync -av --delete --exclude '.git' --exclude 'backend/.venv' ./ "$APP_ROOT"/

chown -R optushub:optushub "$APP_ROOT"
systemctl restart "$SERVICE_NAME"
systemctl --no-pager --full status "$SERVICE_NAME"
