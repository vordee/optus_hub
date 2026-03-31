# Projetos Flow

Sistema web corporativo para gestão ponta a ponta do processo comercial, técnico, operacional e financeiro, baseado no POP - Processo de Projetos.

## Objetivo

Centralizar o fluxo completo da empresa em um único sistema, com:

- CRM nativo
- workflow por fases e aprovações
- criação automática de projeto após fechamento comercial
- trilha de auditoria
- segurança por padrão
- arquitetura preparada para integração com Bling e Diário de Obra
- execução em Linux sem Docker

## Premissas

- Backend: FastAPI
- Frontend: React + Vite
- Banco: PostgreSQL
- Cache/Filas: Redis
- Reverse Proxy: Nginx
- Execução de serviços: systemd
- Deploy: Linux sem Docker

## Módulos planejados

- Autenticação e segurança
- Usuários, perfis e permissões
- Auditoria
- CRM
- Workflow
- Projetos
- Documentos
- Financeiro
- Integrações
- Indicadores

## Fluxo principal

Lead -> CRM -> Qualificação -> Diagnóstico -> Proposta/POC -> Aprovação -> Fechamento -> Projeto -> Execução -> Testes -> Aceite -> Entrega documental -> Faturamento -> Pós-venda

## Estrutura do monorepo

- `backend/`: API principal
- `frontend/`: interface web
- `deploy/`: arquivos de deploy, nginx e systemd
- `docs/`: documentação técnica e funcional

## Princípios técnicos

- segurança por padrão
- menor privilégio
- auditoria obrigatória
- integrações desacopladas
- regras de negócio no backend
- API externa nunca controla o fluxo principal
- nenhuma etapa crítica avança sem validação

## Roadmap inicial

### Fase 1
- autenticação
- usuários
- perfis
- permissões
- auditoria
- empresas
- contatos
- leads
- oportunidades

### Fase 2
- motor de workflow
- transições
- aprovações
- checklists
- histórico

### Fase 3
- criação automática de projetos
- fases
- tarefas
- marcos
- anexos
- aceite

### Fase 4
- integração com Bling
- integração com Diário de Obra
- fila de sincronização
- retries
- logs de integração

## Requisitos de execução local

- Python 3.12+
- Node.js 22+
- PostgreSQL 15+
- Redis 7+
- Nginx
- Linux com systemd

## Convenções

- variáveis sensíveis em `.env`
- migrations com Alembic
- testes automatizados obrigatórios
- logs estruturados
- commits pequenos e objetivos

## Segurança

- autenticação segura
- RBAC por perfil
- MFA para perfis críticos
- logs de login e alteração
- validação server-side
- upload controlado
- tokens de integração armazenados no servidor
- banco não exposto publicamente

## Integrações planejadas

### Bling
- cadastro/atualização de cliente
- sincronização comercial/financeira
- eventos de faturamento
- atualização de status financeiro

### Diário de Obra
- criação de obra/projeto
- sincronização de etapas
- avanço físico
- ocorrências
- evidências

## Status

Projeto em fase inicial de fundação.
