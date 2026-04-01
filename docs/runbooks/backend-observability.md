# Backend Observability

Runbook curto para medir latencia de `leads` e `opportunities` no backend atual, usando a observabilidade ja existente.

## Objetivo

- confirmar que a rota responde
- medir latencia bruta por endpoint
- correlacionar resposta lenta com `journalctl`
- separar gargalo de consulta, serializacao ou dependencia externa

## Como medir

1. Use um token ou sessao valida do ambiente.

2. Meça a lista de leads:

   ```bash
   curl -s -o /dev/null -D - \
     -w "status=%{http_code} connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\n" \
     -H "Authorization: Bearer $TOKEN" \
     "http://127.0.0.1:8000/api/v1/crm/leads?page=1&page_size=20"
   ```

3. Meça a lista de opportunities:

   ```bash
   curl -s -o /dev/null -D - \
     -w "status=%{http_code} connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\n" \
     -H "Authorization: Bearer $TOKEN" \
     "http://127.0.0.1:8000/api/v1/crm/opportunities?page=1&page_size=20"
   ```

4. Para detalhar uma entidade lenta, repita com o `id` correspondente:

   - `GET /api/v1/crm/leads/{lead_id}`
   - `GET /api/v1/crm/opportunities/{opportunity_id}`

5. Leia o tempo retornado pela propria aplicacao no header `x-request-time-ms`.

6. Correlacione com os logs do servico:

   ```bash
   journalctl -u optus-hub-api --since "15 min ago" | rg "request_(completed|failed).*route=/api/v1/crm/(leads|opportunities)"
   ```

## Sinais de gargalo

- `total` alto no `curl` e `x-request-time-ms` alto no mesmo request indica custo real no backend.
- `ttfb` alto com `total` alto costuma apontar para query lenta ou serializacao pesada.
- `request_failed` recorrente indica erro funcional ou dependencia indisponivel.
- `request_completed` acima de `500ms` ja passa do limiar que o backend marca como `warning` no log.
- Se `list` fica lento e `detail` nao, suspeite de filtro, ordenacao ou paginacao.
- Se `detail` tambem fica lento, suspeite de joins, acesso a relacoes ou carga geral do banco.

## Leituras uteis

- `GET /api/v1/crm/leads` e `GET /api/v1/crm/opportunities` para medir comportamento agregado.
- `GET /api/v1/crm/leads/{lead_id}` e `GET /api/v1/crm/opportunities/{opportunity_id}` para isolar uma entidade.
- `journalctl -u optus-hub-api -f` para acompanhar reproducoes em tempo real.

