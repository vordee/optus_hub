# QA E2E

Base inicial de testes ponta a ponta com Playwright.

## Variáveis necessárias

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `PLAYWRIGHT_BASE_URL` opcional

## Execução

```bash
npm run test:e2e
```

Para apontar para o servidor publicado:

```bash
PLAYWRIGHT_BASE_URL=https://10.222.222.33 E2E_EMAIL=admin@example.com E2E_PASSWORD='***' npm run test:e2e
```

## Escopo inicial

- login
- navegação principal
- smoke da tela de projetos
