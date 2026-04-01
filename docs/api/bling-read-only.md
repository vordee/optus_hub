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

## Endpoint inicial

- `GET /api/v1/integrations/bling/read-only`

Query params:

- `module`: `contacts`, `products`, `sales_orders`, `invoices`
- `page`: padrao `1`
- `page_size`: padrao `100`, maximo `200`
- `since`: cursor temporal opcional em formato ISO-8601

Comportamento:

- autenticado
- somente leitura
- retorna `503` quando `BLING_ENABLED=false`
- usa `since` como `dataAlteracaoInicial` para contatos, produtos e pedidos
- usa `since` como `dataEmissaoInicial` para notas fiscais
