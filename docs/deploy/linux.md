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
- backend service: `optus-hub-api`
- nginx publicado em `80/tcp` e `443/tcp`
- PostgreSQL local para o backend

## Observacao

Os artefatos em `deploy/` devem continuar refletindo o estado real do host para manter a operacao humana simples.
