# Deploy Linux

## Premissa

O sistema deve executar em Linux sem Docker.

## Componentes operacionais

- backend FastAPI
- frontend buildado estaticamente
- PostgreSQL
- Redis
- Nginx
- systemd

## Estado atual

Primeira implantacao validada em Oracle Linux 9.7 no host `10.222.222.33`.

- app root: `/opt/optus_hub`
- frontend servido pelo nginx: `/var/www/optus-hub/frontend`
- releases versionados do frontend: `/var/www/optus-hub/releases`
- backend service: `optus-hub-api`
- nginx publicado em `80/tcp` e `443/tcp`
- PostgreSQL local para o backend
- Node.js observado no host: `v20.20.0`
- npm observado no host: `10.8.2`
- Python observado no host: `3.11.13`
- PostgreSQL client observado no host: `13.23`

## Observacao

Os artefatos em `deploy/` devem continuar refletindo o estado real do host para manter a operacao humana simples.

Leia tambem `docs/deploy/runtime-current-state.md` antes de qualquer mudanca operacional.
