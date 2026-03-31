# Bling Read-only

Base inicial de integracao com o Bling para consulta horaria.

## Objetivo

Consumir dados de referencia do ERP sem deixar o workflow do Optus Hub dependente da API externa.

## Modulos iniciais

- contatos
- produtos
- pedidos de venda
- notas fiscais

## Modo de operacao

- consulta horaria para reconciliacao
- preferir webhook quando o recurso do Bling oferecer eventos
- nao usar o Bling como fonte de verdade de estados criticos

## Configuracao

- `BLING_ENABLED`
- `BLING_API_BASE_URL`
- `BLING_OAUTH_BASE_URL`
- `BLING_CLIENT_ID`
- `BLING_CLIENT_SECRET`
- `BLING_REDIRECT_URI`
- `BLING_ACCESS_TOKEN`
- `BLING_REFRESH_TOKEN`
- `BLING_SYNC_INTERVAL_MINUTES`

## Job inicial

- `python -m app.jobs.bling_hourly_sync`

Esse job executa apenas consulta e imprime um resumo do snapshot obtido.
