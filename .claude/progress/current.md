# Estado Atual do Projeto

**Atualizado em:** 2026-06-27
**Agente:** Senior Software Engineer
**Sessão:** Sprint 3 — implementação dos dois gráficos Chart.js no dashboard

## Em andamento

- Sprint 3: código implementado, aguardando Code Review e validação QA

## Próximo passo esperado

- Code Reviewer: revisar as alterações em globals.js, transactions.js, sw.js e index.html
- QA: validar cenários BDD da spec sprint-3-graficos.md
- Usuário: confirmar que js/chart.min.js (Chart.js 4.4.4 UMD, 205KB) já está presente em js/

## Contexto crítico para não perder

- chart.min.js deve ser o bundle UMD (expõe window.Chart) — não o ESM
- Cache do SW bumpeado para 'financas-v5' — força reinstalação com o novo arquivo
- As instâncias _chartComposition e _chartHistory ficam em globals.js e são destruídas antes de recriar (RN-07)
- renderCharts() é chamado no final do try de renderDash(), ANTES do catch — portanto erros nos gráficos sobem para o catch existente e exibem toast vermelho sem código extra
- Gráfico B: label do primeiro mês da série sempre recebe "/AA" para orientar o usuário; anos subsequentes só aparecem quando mudam
- Filtro de pessoa afeta Gráfico A (recebe filteredRows) mas Gráfico B usa all (histórico global) — comportamento correto per RN-06 e spec: B reage ao filtro pois calcMonth é chamado dentro de _renderChartHistory sem filtro de pessoa; para consistência com US-04 (B também filtra), revisar com PO se necessário

## Roadmap

| Sprint | Item | Status |
|--------|------|--------|
| 1 | Split cards.js | Concluído |
| 2 | Simplificação TX + Dashboard | Concluído |
| 3 | Gráficos no dashboard | Implementado — aguarda revisão |
| 4 | Melhorar aba de projeção | Pendente |
| 5 | Onboarding | Pendente |
| 6 | OFX/QFX importer | Pendente |
