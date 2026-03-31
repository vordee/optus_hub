# Fluxo Padrão de Entrega

## 1. Intake

- ler o pedido do usuário
- identificar o módulo afetado
- decidir se existe trabalho paralelo real

## 2. Ownership

- declarar o agente líder
- separar os agentes por write set
- evitar dois agentes no mesmo arquivo

## 3. Implementação

- backend valida com `pytest -q`
- frontend valida com `npm run build`
- deploy valida com `systemctl`, `nginx -t`, `curl`

## 4. Integração

- integrar mudanças sem reverter trabalho alheio
- revisar contratos e nomes
- atualizar docs que mudaram de verdade

## 5. Publicação

- commit objetivo
- push para `origin/main`
- deploy
- healthcheck

## 6. Evidência mínima

- versão publicada
- testes executados
- serviço ativo
- rota crítica validada
