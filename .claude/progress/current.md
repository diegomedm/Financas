# Estado Atual do Projeto

**Atualizado em:** 2026-06-27
**Agente:** Senior Dev
**Sessão:** Encerramento — documentação de roadmap e próximos passos

## O que foi feito nesta sessão

- Botão 📌 (mês de referência) em todas as 5 abas, dentro do month-nav, com visibility:hidden
- Categorias orçadas (`isCategoriaOnly`) ocultas da lista normal de orçamento
- Saldo restante das categorias entra na projeção (a partir do refMonth)
- Resumo de orçamento: realizado e total de despesas incluem contribuição das categorias
- Estrutura .claude atualizada: architecture.md (v6), backlog, specs arquivadas
- SW v10

## Roadmap priorizado (próximas sessões)

1. **Revisão completa de UX/UI** — antes de qualquer nova feature. Usar Claude Design (quando disponível). Não iniciar sem o usuário confirmar que está pronto para essa etapa.
2. **Onboarding** — fluxo para novo usuário (primeira abertura sem dados)
3. **OFX/QFX importer** — importar extratos do Nubank; uma das últimas features

## Próximo passo esperado

- Na próxima sessão: acionar Discovery Agent para planejar a revisão de UX/UI
- Não implementar nada antes de o usuário confirmar qual item do roadmap quer atacar

## Contexto crítico para não perder

- `isCategoriaOnly:true` + `categoriaKey` = categoria pura (store `budget`)
- `calcCategoriaRealizado(id, gastos[], tx[], cartoes[], month, year)` — síncrona
- Projeção e resumo: saldo restante = max(0, orçado - realizado); meses < refMonth ignorados
- `refMonth/refYear` em localStorage — mês de referência persistido
- SW cache: `financas-v10` — IndexedDB: `financas_pwa_v2` v6 (8 stores)
- Módulos JS: globals → db → utils → pessoas → transactions → cards-modal → cards-render → budget → projection → config → app
- Restrições obrigatórias: sem export/import ES6, sem script type=module, sem nested template literals, sem JSON.stringify em onclick, node --check após todo JS
- Débitos técnicos abertos: DT-001 (cards muito grande), DT-002 (CSS inline), DT-003 (sem testes), DT-005 (saveRecorrenteEdit), DT-006 (cache budgetDone), DT-009 (funções legadas cards-modal), DT-010 (gasto órfão silenciado)
