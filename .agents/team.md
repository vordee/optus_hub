# Team Map

Equipe-base recomendada para o Optus Hub em modo software house.

## Núcleo de coordenação

- `project-manager`
  dono da fila, prioridade, paralelismo e prevenção de ociosidade
- `principal-engineer`
  dono da integração técnica, qualidade do corte e publicação
- `qa-release`
  dono da validação final, evidências e smoke de produção

## Desenvolvimento de produto

- `backend-platform`
  auth, RBAC, auditoria, contratos de API e fundação FastAPI
- `workflow-projects`
  CRM, oportunidades, projetos, fases, tarefas e workflow operacional
- `frontend-ux`
  shell, telas operacionais, consistência visual e consumo da API real
- `product-architect`
  domínio, limites de módulo, contratos e aderência ao POP

## Operação e segurança

- `security-sre`
  hardening, deploy, nginx, systemd, PostgreSQL e publicação segura

## Expansões recomendadas conforme o sistema crescer

- `financial-integrations`
  financeiro, faturamento, Bling, filas e retries
- `documents-ops`
  documentos, anexos, aceite e trilha documental
- `observability-platform`
  logs, métricas, tracing, alertas e diagnóstico operacional

## Tamanho recomendado por fase

- fundação: `3` a `4` agentes ativos
- CRM + projetos: `5` a `6` agentes ativos
- integrações + financeiro: `6` a `8` agentes ativos

Mais agentes só valem quando houver write sets realmente separados.
