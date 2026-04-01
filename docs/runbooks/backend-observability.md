# Backend Observability

Runbook curto para medir disponibilidade e latencia do backend atual sem adicionar stack nova.

## Objetivo

- confirmar que o servico responde
- medir latencia bruta de endpoints
- coletar contexto de falhas no journald
- separar gargalos por rota sem instrumentar cada service manualmente

## Verificacao rapida

1. Validar saude do backend:

   - `curl -fsS http://127.0.0.1:8000/api/v1/health`

2. Medir tempo total de resposta:

   - `curl -s -o /dev/null -w "status=%{http_code} connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\n" http://127.0.0.1:8000/api/v1/health`

3. Observar a rota observada pelo backend:

   - `journalctl -u optus-hub-api --since "15 min ago" | rg "request_completed.*route=/api/v1/projects|request_completed.*route=/api/v1/projects/.*/tasks|request_completed.*route=/api/v1/opportunities"`

4. Observar erros recentes do servico:

   - `journalctl -u optus-hub-api --since "15 min ago"`

5. Acompanhar comportamento durante reproducoes:

   - `journalctl -u optus-hub-api -f`

## Leitura

- `status` diferente de `200` indica erro funcional ou dependencia indisponivel.
- `elapsed_ms` no log e `x-request-time-ms` na resposta ajudam a comparar o custo de uma rota especifica.
- `total` crescendo sem erro costuma apontar para consulta lenta ou espera em backend.
- Falhas recorrentes no `journalctl` devem ser correlacionadas com horario exato da requisicao e mudancas recentes no deploy.

## Rotas mais uteis para perf

- `GET /api/v1/projects` e `GET /api/v1/projects/{project_id}`
- `GET /api/v1/projects/{project_id}/tasks`
- `GET /api/v1/opportunities` e `GET /api/v1/opportunities/{opportunity_id}`
- `GET /api/v1/crm/companies` e `GET /api/v1/crm/contacts`
