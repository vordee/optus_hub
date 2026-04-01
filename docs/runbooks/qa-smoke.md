# QA Smoke

Este runbook descreve a validação mínima de release para o Optus Hub.

## Objetivo

Garantir que login, navegação e os módulos CRM mais usados continuam respondendo no frontend publicado.

## Pré-requisitos

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `PLAYWRIGHT_BASE_URL` apontando para o ambiente alvo, se diferente de `https://10.222.222.33`
- navegador Chromium do Playwright com dependências do sistema instaladas no host

## Comando

```bash
cd frontend
npm run test:e2e
```

Se o Chromium falhar ao iniciar por biblioteca ausente, a causa é do host de execução e não do spec. Nesse caso, valide o runner com as dependências do navegador instaladas ou execute o smoke em um ambiente preparado para Playwright.

## Escopo mínimo

- autenticação
- `Empresas`
- `Leads`
- `Projetos`

## Critério de aceite

- o smoke precisa abrir o app, autenticar e alcançar as telas principais sem falha de carregamento
- se houver dados, o teste deve conseguir abrir pelo menos um registro em cada módulo coberto
