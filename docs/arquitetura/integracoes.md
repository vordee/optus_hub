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
- consulta horaria `read-only` para produtos, contatos, pedidos de venda e notas fiscais
- webhooks como mecanismo preferencial quando o recurso suportar eventos
- polling horario apenas para reconciliacao e conferencia

### Diario de Obra

- criacao de projeto ou obra
- sincronizacao de etapas
- ocorrencias e evidencias

## Antes de codificar

Definir contratos de payload, filas, chaves de idempotencia, tratamento de erro e reconciliacao manual.

## Diretriz adotada agora

- o Optus Hub continua sendo a fonte de verdade do fluxo interno
- o Bling entra primeiro como consulta externa e reconciliacao
- o primeiro corte de integracao deve evitar escrita automatica no ERP
