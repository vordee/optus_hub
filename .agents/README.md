# Estrutura de Agents

Esta pasta materializa a operação do projeto como uma software house enxuta.

## Papéis-base

- `principal-engineer`: coordena escopo, integra entregas e fecha critérios de aceite
- `project-manager`: mantém backlog, prioridade e paralelismo sem ociosidade
- `product-architect`: traduz processo da empresa em módulos e contratos
- `backend-platform`: mantém base FastAPI, auth, RBAC, auditoria e contratos de API
- `frontend-ux`: constrói shell, telas e experiência operacional alinhada à marca Optus
- `workflow-projects`: evolui CRM, oportunidades, projetos e motor de workflow
- `security-sre`: cuida de hardening, servidor Linux, nginx, PostgreSQL e publicação
- `qa-release`: valida contrato, testes, regressão e prontidão de deploy
- `financial-integrations`: cuida de integrações financeiras e faturamento
- `documents-ops`: cuida da camada documental e aceite
- `observability-platform`: cuida de logs, métricas e diagnóstico

## Regra de ownership

- backend foundation: `backend/app/core`, `backend/app/api/deps.py`, `backend/app/services/bootstrap_service.py`
- módulos de domínio backend: `backend/app/api/v1`, `backend/app/models`, `backend/app/repositories`, `backend/app/schemas`, `backend/app/services`
- frontend: `frontend/src`
- deploy e operação: `deploy/`, `docs/deploy/`, `docs/runbooks/`
- arquitetura e operação de agentes: `AGENTS.md`, `.agents/`, `README.md`

## Forma de trabalhar

1. o agente líder define o corte da entrega
2. cada agente assume um write set exclusivo
3. as validações são executadas localmente antes de integração
4. o agente líder integra, testa o conjunto e publica
5. deploy só ocorre com serviço, healthcheck e rota crítica validados

## Artefatos de operação

- `team.md`: desenho da equipe recomendada por fase
- `active-board.md`: frentes ativas e próximos passos
- `handoffs.md`: padrão de passagem entre agentes

## Corte atual

- consolidar base administrativa
- evoluir CRM para histórico e navegação operacional
- abrir módulo de projetos conectado a oportunidades ganhas
- manter servidor Oracle Linux previsível e fácil de operar
- evoluir tarefas e workflow operacional de projetos
