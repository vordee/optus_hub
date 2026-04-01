# Optus Hub Agent Operating Model

Este repositório usa uma estrutura de agentes inspirada em software house, com ownership claro por frente e validação obrigatória antes de merge e deploy.

## Princípios

- um agente líder coordena prioridade, corte de entrega e integração final
- cada agente trabalha em um escopo de arquivos definido
- mudanças de backend, frontend e operação devem ser paralelas apenas quando o write set for distinto
- nenhum agente publica deploy sem validação local e checagem do servidor
- documentação operacional faz parte da entrega

## Estrutura

- `/.agents/README.md`: visão geral da operação
- `/.agents/roles/`: papéis, responsabilidade e limites
- `/.agents/workflows/`: fluxo padrão de execução por fase
- `/docs/deploy/runtime-current-state.md`: topologia real do servidor, versões, diretórios e deploy vigente

## Regra prática

Antes de começar uma frente nova, escolha o agente dono, declare o escopo de arquivos e só então execute.

Para qualquer frente que toque deploy, nginx, systemd, SSH ou publicacao do frontend, leia antes:

- `/docs/deploy/runtime-current-state.md`
- `/docs/deploy/nginx.md`
- `/docs/deploy/systemd.md`
