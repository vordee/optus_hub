# Deploy

Artefatos versionados para operar o Optus Hub em Oracle Linux sem Docker.

## Estado atual de referencia

- backend executando com `systemd`
- `uvicorn` preso a `127.0.0.1:8000`
- `nginx` publicado em `0.0.0.0:80`
- PostgreSQL local em `127.0.0.1:5432`
- firewall liberando apenas `ssh` e `http`

## Pastas

- `nginx/`: reverse proxy publicado
- `systemd/`: unit files persistentes
- `scripts/`: scripts de instalacao e operacao
- `hardening/`: decisoes e checklists de seguranca
