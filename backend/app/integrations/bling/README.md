# Bling

Adaptador `read-only` para consulta e reconciliação horária com o ERP.

## Diretriz

- o Bling é fonte externa de consulta, não motor do fluxo principal
- usar webhooks quando existirem e polling horário como reconciliação
- manter escopo inicial somente para leitura

## Escopo inicial

- produtos
- contatos
- pedidos de venda
- notas fiscais

## Arquivos principais

- `client.py`: cliente HTTP/OAuth
- `service.py`: orquestração da consulta horária
- `../../jobs/bling_hourly_sync.py`: job executável
