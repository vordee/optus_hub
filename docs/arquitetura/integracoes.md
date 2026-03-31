# Integracoes

## Principios

- integracoes sao adaptadores, nao a fonte de verdade do fluxo
- chamadas externas devem ser idempotentes quando possivel
- retries precisam de politica explicita
- logs e rastreabilidade sao obrigatorios

## Integracoes previstas

### Bling

- cadastro e atualizacao de cliente
- sincronizacao comercial e financeira
- recebimento de eventos de faturamento

### Diario de Obra

- criacao de projeto ou obra
- sincronizacao de etapas
- ocorrencias e evidencias

## Antes de codificar

Definir contratos de payload, filas, chaves de idempotencia, tratamento de erro e reconciliacao manual.
