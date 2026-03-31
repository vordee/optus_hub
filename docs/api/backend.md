# Backend

## Responsabilidades

- expor API HTTP
- aplicar autenticacao e autorizacao
- validar transicoes do processo
- persistir dados no PostgreSQL
- publicar ou consumir jobs assincronos

## Estrutura inicial

- `app/api`: borda HTTP
- `app/core`: infraestrutura compartilhada
- `app/services`: regra de negocio
- `app/repositories`: acesso a dados
- `app/integrations`: adaptadores externos

## Proxima etapa

Implementar primeiro o bootstrap do app, configuracao, banco, autenticacao e modulos basicos do CRM.
