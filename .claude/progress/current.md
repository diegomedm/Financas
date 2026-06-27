# Estado Atual do Projeto

**Atualizado em:** 2026-06-27
**Agente:** Senior Dev
**Sessão:** Pós-Sprint 5 — melhorias de UX e lógica de categorias orçadas na projeção/resumo

## O que está em andamento

- Sprint 5 entregue e em produção (main)
- Implementadas melhorias pós-sprint:
  - Botão 📌 (mês de referência) em todas as 5 abas, dentro do month-nav, com visibility:hidden para não deslocar layout
  - Categorias orçadas (`isCategoriaOnly`) ocultas da lista normal de orçamento
  - Saldo restante das categorias (orçado - realizado) entra na projeção a partir do refMonth
  - Resumo de orçamento: realizado e total de despesas incluem contribuição das categorias
  - SW v10

## Próximo passo esperado

- Esclarecer item 1 do roadmap (TX avulsas com categoria — comportamento já implementado, usuário quer entender melhor com exemplo prático)
- Itens pendentes do roadmap: OFX/QFX importer (4), Onboarding (5)
- Gráficos do dashboard (3) — verificar se já foi implementado em sessão anterior

## Contexto crítico para não perder

- `isCategoriaOnly:true` + `categoriaKey` identifica uma categoria pura — não aparece na lista de orçamento, aparece só na seção "Categorias Orçadas"
- `calcCategoriaRealizado(id, gastos[], tx[], cartoes[], month, year)` — função síncrona pura, recebe arrays
- Projeção e resumo de orçamento: saldo restante = max(0, orçado - realizado); meses < refMonth ignorados
- `refMonth/refYear` em localStorage — mês de referência persistido; `curMonth/curYear` inicializam a partir dele
- SW cache: `financas-v10`
- Restrições técnicas obrigatórias: sem export/import, sem script type=module, sem nested template literals, sem JSON.stringify em onclick, node --check após todo JS
