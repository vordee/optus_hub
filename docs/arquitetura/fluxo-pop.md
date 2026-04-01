# Fluxo POP

## Fluxo principal

Lead -> CRM -> Qualificacao -> Diagnostico -> Comercial -> Proposta -> Aprovacao -> Fechamento -> Kickoff -> Projeto -> Execucao -> Testes -> Aceite -> Entrega documental -> Faturamento -> Pos-venda

## Regras iniciais

- cada transicao deve ser validada no backend
- eventos sensiveis devem gerar trilha de auditoria
- aprovacoes precisam de actor, data, resultado e justificativa
- integracoes nao devem alterar estados criticos diretamente
- CRM concentra entrada e triagem
- comercial concentra negociacao e fechamento
- kickoff faz a passagem formal para projetos
- projetos absorvem a entrega e as rotinas operacionais

## Ponto de atencao

O motor de workflow ainda nao foi desenhado em detalhe. Antes de implementa-lo, definir estados, eventos, guardas, side effects e rollback operacional.
