# Active Board

Repriorização atual: foco imediato em performance percebida de `dashboard` e em `projects`.

## Em andamento

- `frontend-ux`
  reduzir tempo de percepção no dashboard, melhorar loading states, empty states e consistência visual de `projects`
- `workflow-projects`
  fechar a experiência de `projects` como corte operacional do funil até a entrega
- `observability-platform`
  medir latência percebida, tempo de carregamento e pontos de fricção no frontend
- `qa-release`
  validar navegação crítica do dashboard e do módulo `projects` após cada integração

## Dependências

- `backend-platform`
  manter contrato atual de dashboard, listagens e `projects` estável para não quebrar o frontend
- `product-architect`
  confirmar quais indicadores do dashboard representam valor real e quais são apenas ruído
- `principal-engineer`
  integrar sem misturar cortes de performance com mudanças funcionais maiores

## Riscos

1. dashboard virar apenas melhoria cosmética sem reduzir fricção real
2. `projects` ganhar tela bonita antes de ter fluxo confiável de criação e transição
3. contratos de API mudarem durante o ajuste visual e gerarem retrabalho no frontend
4. observabilidade atrasar e deixar a percepção de lentidão sem dado objetivo

## Ordem de integração

1. estabilizar contratos de `dashboard` e `projects`
2. publicar melhoria de loading/empty states no frontend
3. validar smoke funcional no ambiente publicado
4. medir impacto de percepção e ajustar pontos mais lentos

## Próximo corte recomendado

- `dashboard` com foco em leitura rápida de status e indicadores úteis
- `projects` com fluxo curto de criação, vínculo e acompanhamento
- depois disso, ampliar apenas o que impactar diretamente percepção e operação

## Regra de atualização

- atualizar este quadro ao abrir ou fechar uma frente relevante
- não manter mais de poucos itens ativos por vez
- qualquer item sem owner volta para `project-manager`
