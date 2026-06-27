# Visão de Arquitetura — Financas

**Atualizado em:** 2026-06-27
**Status:** Estável — sem mudanças estruturais previstas

## Visão geral do sistema

PWA single-page de finanças pessoais. Sem backend, sem build tool, sem framework. Todo o estado vive no IndexedDB do navegador. Service Worker provê cache offline-first. Publicado como arquivos estáticos no GitHub Pages.

```
index.html  (entry point + HTML + CSS inline ~2k linhas)
sw.js       (Service Worker — cache 'financas-v10')
js/
  globals.js → db.js → utils.js → pessoas.js
  → transactions.js → cards-modal.js → cards-render.js → budget.js
  → projection.js → config.js → app.js
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

## Módulos JS (ordem de carregamento obrigatória)

| Arquivo | Linhas | Responsabilidade |
|---------|--------|-----------------|
| `globals.js` | ~18 | Constantes, variáveis globais, API de cache, refMonth/refYear |
| `db.js` | ~130 | IndexedDB helpers CRUD para todos os stores |
| `utils.js` | ~146 | Modal, toast, numpad, validação inline, formatação |
| `pessoas.js` | ~195 | CRUD e render de responsáveis |
| `transactions.js` | ~700 | Lançamentos + dashboard + select categoria |
| `cards-modal.js` | ~700 | Modais de cartão, gasto, recorrente (split de cards.js) |
| `cards-render.js` | ~400 | Render de faturas e cartões (split de cards.js) |
| `budget.js` | ~1.000 | Orçamento + categorias orçadas + recorrência + resumo |
| `projection.js` | ~160 | Projeção de fluxo de caixa + categorias |
| `config.js` | ~215 | Export/import v6, temas, forceRefresh, clear |
| `app.js` | ~112 | PWA init, Service Worker, nav, refMonth, renderAll() |

**REGRA CRÍTICA:** Usar `<script src>` sequencial — NUNCA `<script type="module">`. Módulos type=module carregam em paralelo e causam `undefined` errors nas funções globais.

## IndexedDB — Schema v6

**Database:** `financas_pwa_v2`

| Store | keyPath | Índices | Uso |
|-------|---------|---------|-----|
| `tx` | id (autoincrement) | `ym` | Lançamentos financeiros; campo `categoriaId` opcional |
| `budget` | id (autoincrement) | — | Itens de orçamento; `isCategoriaOnly:true` + `categoriaKey` para categorias puras |
| `budgetDone` | key (string) | — | Marcações: `budgetId_YYYYMM` ou `cartao_ID_YYYYMM` |
| `pessoas` | id (autoincrement) | — | Responsáveis |
| `cartoes` | id (autoincrement) | — | Cartões de crédito |
| `gastos` | id (autoincrement) | `cartaoId` | Gastos de cartão; campo `categoriaId` opcional |
| `recorrentes` | id (autoincrement) | `cartaoId` | Cobranças fixas mensais |
| `categoriasCartao` | id (autoincrement) | — | Legado Sprint 4b — não usar (store preservada para compat) |

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

## Padrões arquiteturais adotados

- **Escopo global obrigatório** — todas as funções em `window.*` via `<script src>` sequencial
- **Cache read-through** — cada `*All()` verifica `_dbCache` antes do IndexedDB
- **Invalidação automática** — todo `*Add/*Put/*Del` chama `invalidateCache(store)`
- **Sem inline JSON em onclick** — usar IDs: `onclick="editItem(${item.id})"`
- **Template literals sem aninhamento** — usar `.join('')` em arrays renderizados

## Restrições técnicas críticas

1. `<script type="module">` PROIBIDO — carrega paralelo, quebra escopo global
2. `JSON.stringify` em atributos onclick PROIBIDO — crash em mobile
3. `dueMonthOffset` cálculo: `rawDue = curMonth + offset; dueYear = curYear + Math.floor(rawDue/12); dueMonth = (rawDue%12+12)%12`
4. `getFaturaMonth(date, cartaoObj)` — NUNCA passar o gasto como 2º argumento
5. `showBudgetEditById(id)` — NUNCA passar enrichedItem para edição de budget
6. Cache em transação direta: chamar `invalidateCache(store)` manualmente

## Decisões arquiteturais vigentes

- PWA offline-first sem backend (dados privados no dispositivo)
- Vanilla JS sem framework — simplicidade > escalabilidade
- IndexedDB como único storage para dados principais
- Export/Import v6 como mecanismo de backup — sem sincronização cloud
