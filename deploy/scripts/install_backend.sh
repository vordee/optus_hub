#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/opt/optus_hub"
BACKEND_ROOT="$APP_ROOT/backend"
SERVICE_NAME="optus-hub-api"

dnf install -y python3 python3-pip

if ! id -u optushub >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$APP_ROOT" --shell /sbin/nologin optushub
fi

mkdir -p "$APP_ROOT"
chown -R optushub:optushub "$APP_ROOT"

cd "$BACKEND_ROOT"
python3 -m venv .venv
.venv/bin/pip install -r requirements/base.txt

if [[ -f .env ]]; then
  chown root:optushub .env
  chmod 640 .env
fi

systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
