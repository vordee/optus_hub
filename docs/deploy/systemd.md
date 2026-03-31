# systemd

## Servicos previstos

- API principal
- worker de fila
- webhook processor se necessario

## Estado atual

- servico ativo: `optus-hub-api`
- usuario de execucao: `optushub`
- restart policy: `always`

## Pendencias

- worker dedicado quando filas entrarem em uso
- webhook processor separado quando houver necessidade real
- journald e rotacao de logs operacional formalizada
