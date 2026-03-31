# Visao Geral

## Objetivo

Optus Hub centraliza o ciclo comercial, operacional e financeiro em um unico sistema.

## Diretrizes

- seguranca por padrao
- menor privilegio
- auditoria obrigatoria
- regras de negocio no backend
- integracoes desacopladas
- nenhuma etapa critica avanca sem validacao

## Macrocomponentes

- backend FastAPI para regras, API e integracoes
- frontend React para operacao web
- PostgreSQL como fonte primaria de verdade
- Redis para fila, cache e processamento assincrono
- Nginx e systemd para execucao em Linux

## Estado atual

O repositorio contem a fundacao estrutural e documental. A implementacao funcional dos modulos ainda nao comecou.
