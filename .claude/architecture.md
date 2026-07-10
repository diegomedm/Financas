# Visão de Arquitetura — Financas

**Atualizado em:** 2026-07-08
**Status:** Em redesign visual (handoff de design externo, ~7 fases) — núcleo funcional estável. Auditoria de fidelidade visual elemento-a-elemento CONCLUÍDA em todas as 7 telas principais (Dashboard, Lançamentos, Cartões, Projeção, Orçamento, Configurações, Relatório) + auditoria dedicada de animações/microinterações + correção de bugs de scroll/reload reportados após teste em navegador. Pendente: Code Review formal, QA dos itens intocáveis, teste em dispositivo móvel real.

## Visão geral do sistema

PWA single-page de finanças pessoais. Sem backend, sem build tool, sem framework. Todo o estado vive no IndexedDB do navegador. Service Worker provê cache offline-first. Publicado como arquivos estáticos no GitHub Pages.

```
index.html  (entry point + HTML + CSS inline)
sw.js       (Service Worker — cache 'financas-v43')
js/
  globals.js → db.js → utils.js → pessoas.js
  → cards-modal.js → cards-render.js
  → transactions.js → budget.js → projection.js
  → report.js → planning.js
  → theme.js → appearance-ui.js → config.js → micro.js → app.js
```

## Stack tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | HTML5 + CSS3 + ES2020 | Sem framework — zero dependências, zero build |
| Armazenamento | IndexedDB v6 (`financas_pwa_v2`) | Persistência local, suporta objetos complexos |
| Cache in-memory | `_dbCache` em globals.js | Reduz roundtrips ao IndexedDB |
| Offline | Service Worker (sw.js) | Cache-first com network fallback |
| Deploy | GitHub Pages | Gratuito, sem servidor |
| Fontes | DM Sans + DM Mono | Google Fonts |
| Testes visuais (dev) | Playwright (`npx playwright screenshot`) | Screenshot real do preview local para auditoria de fidelidade visual — não faz parte do app em produção |

## Módulos JS (ordem de carregamento obrigatória)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `globals.js` | Constantes, variáveis globais, API de cache, refMonth/refYear, estado de swipe/FAB/hideValues |
| `db.js` | IndexedDB helpers CRUD para todos os stores |
| `utils.js` | Modal, toast (+ flash de cor sincronizado), numpad, validação inline, formatação (`fmt`/`fmtN`, respeitam `hideValues`) |
| `pessoas.js` | CRUD e render de responsáveis; cor por pessoa (6 swatches + color picker livre) |
| `cards-modal.js` | Modais de cartão, gasto, recorrente |
| `cards-render.js` | Render de faturas e cartões — cards colapsáveis, timeline por dia, badge de parcela |
| `transactions.js` | Lançamentos (CRUD, busca, swipe, duplicar, calendário) + Dashboard completo (hero de saldo, entradas/saídas, donut de composição, por responsável, histórico 6 meses) |
| `budget.js` | Orçamento + categorias orçadas + recorrência + resumo (mini-tabela Previsto×Realizado) + detalhe de categoria (sheet) |
| `projection.js` | Projeção mensal (3/6/12m) + projeção dia a dia + horizonte de saldos |
| `report.js` | Relatório mensal — comparação com mês anterior, top 5 gastos, % por categoria, recordes, evolução patrimonial (SVG) |
| `planning.js` | Alertas inteligentes, limite de gasto livre, metas de economia (CRUD em localStorage) |
| `theme.js` | Sistema de tokens de tema — `buildTokens()`/`applyLook()`/`getSavedLook()`, ramps de mood, superfície, capa do saldo (heroStyle), fórmula de accent |
| `appearance-ui.js` | UI de Aparência em Configurações — toggles, seletores de mood/surface/heroStyle, 10 temas prontos (fileira arrastável) |
| `config.js` | Export/import v6, forceRefresh, clear, seção Pessoas/Orçamento em Configurações |
| `micro.js` | Microinterações — pull-to-refresh, flash de cor, empty states ilustrados, tour guiado, splash screen, ripple de tema, micro-bounce do nav, slot machine de dígitos, ícones de categoria |
| `app.js` | PWA init, Service Worker, nav (`showPage`), refMonth/pin de mês, FAB speed dial, `renderAll()` |

**REGRA CRÍTICA:** Usar `<script src>` sequencial — NUNCA `<script type="module">`. Módulos type=module carregam em paralelo e causam `undefined` errors nas funções globais.

## IndexedDB — Schema v6

**Database:** `financas_pwa_v2`

| Store | keyPath | Índices | Uso |
|-------|---------|---------|-----|
| `tx` | id (autoincrement) | `ym` | Lançamentos financeiros; campo `categoriaId` opcional |
| `budget` | id (autoincrement) | — | Itens de orçamento; `isCategoriaOnly:true` + `categoriaKey` para categorias puras; `icon` opcional (grid de 20 emojis) |
| `budgetDone` | key (string) | — | Marcações: `budgetId_YYYYMM` ou `cartao_ID_YYYYMM` |
| `pessoas` | id (autoincrement) | — | Responsáveis; `color` livre (não mais limitado às 6 swatches) |
| `cartoes` | id (autoincrement) | — | Cartões de crédito |
| `gastos` | id (autoincrement) | `cartaoId` | Gastos de cartão; campo `categoriaId` opcional |
| `recorrentes` | id (autoincrement) | `cartaoId` | Cobranças fixas mensais |
| `categoriasCartao` | id (autoincrement) | — | Legado Sprint 4b — não usar (store preservada para compat) |

**Metas de economia NÃO estão no IndexedDB** — persistidas em `localStorage['financas-goals']` (array JSON). Decisão deliberada: dados pequenos/não-transacionais, evita bump de versão do schema.

## Cache em Memória

```
_dbCache = { 'tx': [...], 'budget': [...], ... }

Regras:
- Leitura: *All() → _cacheRead(store) primeiro
- Escrita: *Add/*Put/*Del → invalidateCache(store) automático
- Import/clear: invalidateAllCache() obrigatório
- Transação direta no IndexedDB: chamar invalidateCache() manualmente
```

## Export/Import v6

Ordem crítica das 10 etapas de import (violação causa IDs quebrados):
1. Pessoas → 2. TX → 3. Budget (1º passe) → 4. Budget (2º passe: remapeia `delayedFromId`)
5. Cartões → 6. Gastos → 7. TX (2º passe: remapeia `fromCartao`) → 8. Recorrentes
9. BudgetDone (detecta `cartao_` prefix → remapeia cartaoId) → 10. lastUpdateHistory

## Sistema de tema/aparência (redesign)

- **Tokens:** `buildTokens(theme, mood, surface, accent, oled, heroStyle)` em `theme.js` — função pura, compõe `:root`/`body.light` dinamicamente via `applyLook()`, aplicando no `<body>` (não `<html>` — CSS estático de `body.light` tem prioridade de cascata sobre custom properties setadas no `<html>`, causava bug de tema claro não aplicar mood/surface/OLED).
- **Persistência:** `localStorage['financas-look']` (JSON completo: theme/mood/surface/accent/oled/autoTheme/heroStyle), com fallback para a chave legada `localStorage['theme']` (compatibilidade com instalações anteriores ao redesign).
- **10 temas prontos:** array `THEME_PRESETS` em `appearance-ui.js`, aplicados via `applyThemePreset()`; fileira arrastável com lógica de drag-sem-capturar-clique (threshold 6px).
- **Capa do saldo (heroStyle):** 4 estilos (Gradiente/Sólido/Mesh/Aurora), fórmulas de gradiente em `buildTokens()`. No tema claro, opacidades/bordas são reforçadas (`heroAlphaBg`/`heroAlphaBorder`/`heroDest`) em relação ao protótipo original — o protótipo nunca foi validado fora do tema escuro e o gradiente ficava com contraste insuficiente contra fundo branco.
- **Ripple de tema:** `fireThemeRipple()` (`micro.js`) integrada em `toggleTheme()` (app.js), `onAutoThemeToggle()` e `applyThemePreset()` (appearance-ui.js). Só dispara nessas três ações — `toggleOled`/`setMood`/`setSurface`/`setHeroStyle`/`setAccent` não disparam ripple (fiel ao protótipo).
- **Cor de destaque (accent):** seletor de 6 swatches em Configurações → Aparência (`onAccentSelect`), aplica `look.accent` em tempo real. Ordem dos controles em Aparência: Temas prontos → Tema escuro → Tema automático → Modo OLED → Cor de destaque → Tom das cores → Estilo de superfície → Capa do saldo (ordem exata do protótipo).

## Dashboard (reescrito fielmente ao protótipo)

Estrutura real, na ordem em que aparece (ver `index.html` `#page-dash` e `renderDash()` em `transactions.js`):
1. Header: saudação dinâmica + "Finanças" + pill de mês com pin embutido (ícone de pin só aparece quando o mês navegado ≠ mês de referência) + engrenagem de Configurações
2. Filtro de pessoa
3. Alertas inteligentes (`planning.js`, até 3 simultâneos)
4. Hero de saldo — `renderHeroSaldoCard()`: badge de variação vs. mês anterior, dígitos slot-machine, sparkline SVG (saldo acumulado dia a dia), botão de ocultar valores. **É uma `<div role="button">`, não `<button>`** — precisa aninhar um `<button>` filho (ocultar valores); `<button>` dentro de `<button>` é HTML inválido e o navegador fecha o pai prematuramente, quebrando o layout.
5. Card Entradas/Saídas (barra dupla verde/vermelho)
6. Limite de gasto livre (`planning.js`, condicional a `limiteVariavel > 0`)
7. Composição das despesas — donut CSS puro (`conic-gradient`), não Chart.js
8. Por responsável — barra de progresso individual por pessoa (teto de normalização fixo: 11200)
9. Metas de economia (`planning.js`)
10. Receita vs Saída — 6 meses, barras CSS puro (`animation:barGrow`), não Chart.js
11. Link "Relatório do mês"
12. Barra de última atualização

`chart.min.js` ficou órfão nessa reescrita — nenhum `new Chart(...)` restante no código.

## Swipe-to-action (Lançamentos e Orçamento)

Gesto de arrastar item para a esquerda revela botões Editar/Excluir (threshold 42px abrir/fechar, 8px para diferenciar tap de drag — fórmulas extraídas literalmente do protótipo). Estado global: `swipeOpen{}`/`swipeClosing{}` (`globals.js`), funções genéricas `swipeDown/swipeMove/swipeUp/closeSwipe/closeSwipeGraceful` (`transactions.js`), reutilizadas por `budget.js`.

**Patch cirúrgico por item (não re-renderiza a lista inteira):** abrir/fechar um swipe chama `patchTxCard(id)`/`patchBudgetCard(id)` em vez de `renderTx()`/`renderBudget()` completos. Cada módulo mantém um cache do último array renderizado (`_txListCache`, `_budgetListCache`+`_budgetListCtx`) e localiza o wrapper do item pelo `id` estável (`id="tx{N}-wrap"`/`id="budget{N}-wrap"`) para substituir só aquele nó via `outerHTML`, com `animation:none` no elemento novo (evita replay de `listItemIn`). Sem esse cache, cada swipe reconstruía o `innerHTML` da lista inteira, reiniciando a animação de entrada em todos os itens simultaneamente — bug relatado como "a lista parece recarregar toda vez que dá swipe".

## Padrões arquiteturais adotados

- **Escopo global obrigatório** — todas as funções em `window.*` via `<script src>` sequencial
- **Cache read-through** — cada `*All()` verifica `_dbCache` antes do IndexedDB
- **Invalidação automática** — todo `*Add/*Put/*Del` chama `invalidateCache(store)`
- **Sem inline JSON em onclick** — usar IDs: `onclick="editItem(${item.id})"`
- **Template literals sem aninhamento** — usar `.join('')` em arrays renderizados
- **Fórmulas de design extraídas literalmente** do protótipo `.dc.html` antes de implementar (evita reinventar cores/timings/easings) — ver `.claude/discovery/extracted-specs-fase*.md`

## Restrições técnicas críticas

1. `<script type="module">` PROIBIDO — carrega paralelo, quebra escopo global
2. `JSON.stringify` em atributos onclick PROIBIDO — crash em mobile
3. `dueMonthOffset` cálculo: `rawDue = curMonth + offset; dueYear = curYear + Math.floor(rawDue/12); dueMonth = (rawDue%12+12)%12`
4. `getFaturaMonth(date, cartaoObj)` — NUNCA passar o gasto como 2º argumento
5. `showBudgetEditById(id)` — NUNCA passar enrichedItem para edição de budget
6. Cache em transação direta: chamar `invalidateCache(store)` manualmente
7. **Nunca aninhar `<button>` dentro de `<button>`** — usar `<div role="button" tabindex="0">` como container quando precisar de controles filhos clicáveis (ex.: hero de saldo)
8. **Tokens de tema aplicados no `<body>`, não `<html>`** — ver seção Sistema de tema/aparência
9. **Overlays controlados por `.classList.add('on'/'open')` nunca podem ter `display:none` inline no HTML** — o inline vence a regra CSS `.classe.on{display:...}` mesmo com a classe aplicada, deixando o elemento invisível para sempre. Definir `display:none` dentro da própria regra CSS base (`#id{display:none;...}`), nunca via atributo `style` no HTML. Bug real encontrado em `#tour-overlay` e `#theme-ripple-overlay`/`#flash-overlay` (ripple de tema e flash de conclusão de toast nunca apareciam).

## Decisões arquiteturais vigentes

- PWA offline-first sem backend (dados privados no dispositivo)
- Vanilla JS sem framework — simplicidade > escalabilidade
- IndexedDB como único storage para dados principais (exceto metas de economia, em localStorage)
- Export/Import v6 como mecanismo de backup — sem sincronização cloud
- Testes visuais via screenshot real (Playwright, ambiente de dev) em vez de assumir fidelidade pela leitura de código — auditoria puramente estática já deixou passar bugs de renderização (ex.: `<button>` aninhado) que só apareceram com o navegador renderizando de verdade

## Débitos técnicos conhecidos

- ~~`chart.min.js` órfão~~ — RESOLVIDO: arquivo deletado, sem referências em `index.html`/`sw.js`
- Auditoria visual elemento-a-elemento concluída em todas as 7 telas principais (Dashboard, Lançamentos, Cartões, Projeção, Orçamento, Configurações, Relatório) — nenhuma pendência de auditoria visual restante.
- Nenhuma das mudanças do redesign visual passou por Code Review ou QA formal ainda — ver `.claude/progress/current.md`
- Feature "Metas de economia" (`planning.js`) tem CRUD completo mas nunca foi auditada visualmente contra o protótipo com o mesmo rigor das demais telas
- ~~Modal de gasto de cartão sem seletor visual de cartão~~ — RESOLVIDO: `renderGastoCartaoPicker()` implementado em `cards-modal.js` (com validação de cartão órfão em `saveGasto`/`saveGastoEdit`)
