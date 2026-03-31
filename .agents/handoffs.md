# Handoffs

## Regras

- cada frente precisa declarar owner e write set
- handoff deve citar arquivos, validações e riscos
- o receptor não reabre trabalho já validado sem motivo concreto
- integração final fica com `principal-engineer`

## Modelo curto de handoff

- objetivo do corte
- arquivos alterados
- comandos de validação
- riscos residuais
- próximo passo recomendado

## Handoffs padrão

- `product-architect` -> `backend-platform`
  quando o contrato do domínio estiver claro
- `backend-platform` -> `frontend-ux`
  quando a API estiver estável o suficiente para tela real
- `workflow-projects` -> `qa-release`
  quando o fluxo fim a fim estiver funcional
- `security-sre` -> `principal-engineer`
  quando deploy, health e exposição estiverem validados
