# Roadmap CRM Operacional

## Premissas

- o Optus Hub continua sendo a fonte de verdade do fluxo interno
- o ERP continua externo e entra apenas por integracao via API
- a proxima fase nao tenta transformar o produto em ERP
- o foco imediato e fortalecer operacao comercial, handoff e rastreabilidade

## Ordem de prioridade

1. atividades e proximo passo
2. filtros salvos e agrupamento
3. relatorio comercial
4. handoff formal para projeto e integracao externa
5. configuracao de estagios e motivos

## Fase 1: Atividades e Proximo Passo

### Objetivo

Dar memoria operacional real para leads e oportunidades.

### Escopo backend

- criar `crm_activities`
- criar `crm_activity_repository.py`
- criar `crm_activity_service.py`
- expor rotas em `backend/app/api/v1/crm_activities.py`
- incluir `activities`, `next_activity` e `overdue_activity_count` no detalhe de lead e oportunidade

### Escopo frontend

- adicionar resumo de proxima atividade em `LeadsPage.tsx`
- adicionar resumo de proxima atividade em `OpportunitiesPage.tsx`
- permitir criar, concluir e reagendar atividade sem sair do painel lateral

### Escopo banco

Tabela minima:

- `id`
- `entity_type`
- `entity_id`
- `activity_type`
- `title`
- `note`
- `due_at`
- `owner_user_id`
- `status`
- `completed_at`
- `created_at`
- `created_by_email`

Indices minimos:

- `(entity_type, entity_id)`
- `(status, due_at)`
- `(owner_user_id, status, due_at)`

## Fase 2: Filtros Salvos e Agrupamento

### Objetivo

Transformar a busca do CRM em ferramenta de trabalho, nao so campo de texto.

### Escopo backend

- evoluir listagens de leads e oportunidades para filtros compostos
- criar modulo proprio de `saved_views`
- manter listagem transacional separada de persistencia de views

### Escopo frontend

- barra de filtros estruturada em leads e oportunidades
- salvar visao por usuario
- agrupamento por estagio, empresa, origem e responsavel

### Escopo banco

Tabela minima `saved_views`:

- `id`
- `user_id`
- `module`
- `name`
- `filters_json`
- `group_by`
- `sort_by`
- `sort_direction`
- `is_default`
- `created_at`

## Fase 3: Relatorio Comercial

### Objetivo

Separar operacao diaria de leitura analitica do funil.

### Escopo backend

- criar endpoint agregado proprio para relatorio comercial
- cortes por periodo, responsavel, origem e estagio
- metricas iniciais:
  - funil por estagio
  - conversao lead > oportunidade > projeto
  - ganho e perda por periodo
  - aging comercial

### Escopo frontend

- nova pagina de relatorios
- graficos simples e tabela analitica
- exportacao CSV

## Fase 4: Handoff Formal para Projeto e Integracao Externa

### Objetivo

Congelar a passagem da venda para entrega e para sistemas externos.

### Escopo backend

- criar `opportunity_handoffs`
- criar `external_sync_events`
- abrir handoff ao ganhar oportunidade
- associar projeto ao handoff quando houver kickoff
- fazer integracao externa consumir snapshot congelado, nao registro vivo

### Escopo frontend

- wizard ou painel de handoff em oportunidade ganha
- mostrar status de envio externo
- permitir retry manual quando aplicavel

### Escopo banco

Tabela `opportunity_handoffs`:

- `id`
- `opportunity_id`
- `project_id`
- `status`
- `snapshot_json`
- `created_by_email`
- `created_at`
- `updated_at`

Tabela `external_sync_events`:

- `id`
- `handoff_id`
- `provider`
- `direction`
- `operation`
- `status`
- `request_payload_json`
- `response_payload_json`
- `error_message`
- `attempt_number`
- `requested_at`
- `finished_at`

## Fase 5: Configuracao de Estagios e Motivos

### Objetivo

Parar de tratar pipeline como enum fixo no codigo.

### Escopo backend

- criar CRUD de pipelines, estagios e motivos
- permitir ordem configuravel
- amarrar ganho e perda a motivos obrigatorios quando aplicavel

### Escopo frontend

- tela administrativa para pipeline
- reorder de estagios
- configuracao de motivos de perda

## Decisoes de arquitetura

- atividades sao entidade separada de `status_history`
- `saved_views` nao entram dentro de `lead_service` ou `opportunity_service`
- relatorio comercial usa endpoint agregado proprio
- handoff e separado do estado de ERP
- ERP nao ganha modulo interno; integra apenas por API

## Ordem tecnica recomendada

1. atividades
2. saved views
3. agrupamento
4. relatorio
5. handoff
6. configuracao de estagios
