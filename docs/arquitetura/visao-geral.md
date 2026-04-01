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

O repositorio contem a fundacao estrutural e documental. A implementacao funcional dos modulos ainda nao comecou.
