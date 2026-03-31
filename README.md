# Optus Hub

Sistema web corporativo para gestão ponta a ponta do processo comercial, técnico, operacional e financeiro, baseado no POP.

## Status

Este repositório está em fase de fundação. A estrutura inicial foi materializada para servir de base de implementação, mas os módulos ainda não estão codificados.

O objetivo desta etapa é deixar claro:

- o que já existe no Git
- como o monorepo está organizado
- quais decisões arquiteturais já foram assumidas
- onde a implementação deve começar

## Objetivo do produto

Centralizar o fluxo completo da empresa em um único sistema, com:

- CRM nativo
- workflow por fases e aprovações
- criação automática de projeto após fechamento comercial
- trilha de auditoria
- segurança por padrão
- integrações desacopladas
- execução em Linux sem Docker

## Stack prevista

- Backend: FastAPI
- Frontend: React + Vite
- Banco: PostgreSQL
- Cache e filas: Redis
- Reverse proxy: Nginx
- Serviços: systemd
- Deploy: Linux sem Docker

## Fluxo principal

Lead -> CRM -> Qualificação -> Diagnóstico -> Proposta -> Aprovação -> Fechamento -> Projeto -> Execução -> Testes -> Aceite -> Entrega documental -> Faturamento -> Pós-venda

## Estrutura do monorepo

- `backend/`: API, domínio, segurança, integrações e jobs
- `frontend/`: interface web
- `deploy/`: nginx, systemd, scripts operacionais e hardening
- `docs/`: documentação técnica, funcional e operacional
- `prompts/`: prompts de trabalho para bootstrap das próximas fases

## Runtime minimo atual

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Node.js 22+

## Organização arquitetural

O backend foi separado em camadas para facilitar o bootstrap:

- `api/`: rotas, dependências e versionamento da API
- `core/`: configuração, banco, segurança transversal, exceções e logging
- `models/`: modelos de persistência
- `schemas/`: contratos de entrada e saída
- `repositories/`: acesso a dados
- `services/`: regras de negócio
- `security/`: RBAC e políticas de autorização
- `workflows/`: motor e definições de fluxo
- `integrations/`: conectores externos desacoplados
- `jobs/`: tarefas assíncronas e processamento de fila

Essa organização é transitória e deve evoluir para uma estrutura mais orientada a domínio conforme os módulos ganharem comportamento real.

## Módulos previstos

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

## Prioridade de implementação

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

## Convenções

- variáveis sensíveis em `.env`
- migrations com Alembic
- testes automatizados obrigatórios
- logs estruturados
- commits pequenos e objetivos
- regras de negócio concentradas no backend
- integrações externas nunca controlam o fluxo principal

## Leitura inicial recomendada

- `docs/arquitetura/visao-geral.md`
- `docs/arquitetura/modulos.md`
- `docs/arquitetura/fluxo-pop.md`
- `docs/arquitetura/integracoes.md`
- `prompts/`

## Operação com agents

O repositório também materializa uma estrutura de agentes para execução paralela com ownership claro:

- `AGENTS.md`
- `.agents/README.md`
- `.agents/roles/`
- `.agents/workflows/`
