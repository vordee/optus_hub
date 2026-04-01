# Visao Geral

## Objetivo

Optus Hub centraliza o fluxo operacional em um unico sistema, conectando CRM, comercial, kickoff, projetos e as frentes futuras em uma sequencia unica de uso.

## Diretrizes

- seguranca por padrao
- menor privilegio
- auditoria obrigatoria
- regras de negocio no backend
- integracoes desacopladas
- nenhuma etapa critica avanca sem validacao
- CRM organiza entrada, qualifica e encaminha a oportunidade
- comercial conduz proposta, aprovacao e fechamento
- kickoff marca a passagem da venda para a entrega
- projetos executam o combinado e absorvem o trabalho operacional
- proximas frentes entram depois do fluxo principal estabilizado

## Macrocomponentes

- backend FastAPI para regras, API e integracoes
- frontend React para operacao web
- PostgreSQL como fonte primaria de verdade
- Redis para fila, cache e processamento assincrono
- Nginx e systemd para execucao em Linux

## Estado atual

O repositorio ja contem implementacao funcional em producao para autenticacao, CRM, kickoff, projetos e integracao read-only inicial com Bling.

O proximo foco arquitetural e fortalecer o CRM operacional com:

- atividades e proximo passo
- filtros salvos e agrupamento
- relatorio comercial
- handoff formal entre oportunidade ganha, projeto e integracao externa

O ERP permanece externo e entra apenas por API.
