# systemd

## Servicos previstos

- API principal
- worker de fila
- webhook processor se necessario

## Estado atual

- servico ativo: `optus-hub-api`
- usuario de execucao: `optushub`
- restart policy: `always`
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectSystem=full`
- runtime observado: `/opt/optus_hub/backend/.venv/bin/python3.11`

## Pendencias

- worker dedicado quando filas entrarem em uso
- webhook processor separado quando houver necessidade real
- journald e rotacao de logs operacional formalizada

## Observabilidade minima

Nao existe ainda metric exporter ou tracing dedicado no backend. O caminho seguro atual e usar `journalctl` do servico e mediacao de latencia via `curl` nos endpoints criticos.

O backend agora registra uma linha por request com `route` template e `elapsed_ms`, e responde com o header `x-request-time-ms`.

Comandos uteis:

- `journalctl -u optus-hub-api -f`
- `journalctl -u optus-hub-api --since "15 min ago"`
- `curl -s -o /dev/null -w "status=%{http_code} total=%{time_total}\n" http://127.0.0.1:8000/api/v1/health`

## Observacao pratica

Foi observado que o `pip` exposto dentro da venv pode conter shebang antigo. Para manutencao, prefira validar o interpretador primeiro e evite assumir que o launcher `pip` da venv esta saudável sem checagem.
