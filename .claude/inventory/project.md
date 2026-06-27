# Inventory — Financas

**Atualizado em:** 2026-06-26
**Status:** Maduro

## Visão geral

PWA de gestão financeira pessoal. Single-page app com 10 módulos JS vanilla + CSS inline. Sem framework, sem build tool, sem backend. Dados em IndexedDB v5. Deploy via GitHub Pages.

**Repositório:** c:\Users\SESI\Documents\GitHub\Financas\
**Deploy:** https://diegomedm.github.io/Financas/

## Módulos / Arquivos

| Arquivo | Linhas | Responsabilidade | Status |
|---------|--------|-----------------|--------|
| `index.html` | ~570 | Entry point + HTML + CSS inline completo | Estável |
| `sw.js` | 53 | Service Worker cache-first (financas-v3) | Estável |
| `js/globals.js` | 12 | Constantes, estado global, API de cache | Estável |
| `js/db.js` | 116 | IndexedDB helpers CRUD + cache read/write | Estável |
| `js/utils.js` | 146 | Modal, toast, numpad, validação, formatação | Estável |
| `js/pessoas.js` | 195 | CRUD e render de responsáveis | Estável |
| `js/transactions.js` | 681 | Lançamentos, dashboard, última atualização | Estável |
| `js/cards.js` | 1.030 | Cartões, gastos, faturas, recorrentes | Candidato a split |
| `js/budget.js` | 893 | Orçamento, recorrência, atraso/pendência | Estável |
| `js/projection.js` | 36 | Projeção cash flow 3/6/12 meses | Estável |
| `js/config.js` | 189 | Export/import v6, temas, clear all | Estável |
| `js/app.js` | 97 | Init PWA, SW registration, nav, renderAll() | Estável |

**Total: ~4.018 linhas de código**

## Entidades principais

| Entidade | Descrição | Store |
|----------|-----------|-------|
| Transaction (tx) | Lançamento financeiro (receita/despesa fixa/variável/cartão) | `tx` |
| Budget Item | Item de orçamento com recorrência e vencimento | `budget` |
| BudgetDone | Marcação de item concluído no mês (chave composta) | `budgetDone` |
| Pessoa | Responsável com cor e avatar | `pessoas` |
| Cartão | Cartão de crédito com limite e datas fechamento/vencimento | `cartoes` |
| Gasto | Compra no cartão (pode ser parcelada) | `gastos` |
| Recorrente | Cobrança fixa mensal de cartão | `recorrentes` |

## Stack

| Camada | Tecnologia | Observações |
|--------|-----------|-------------|
| Linguagem | JavaScript ES2020 | Sem TypeScript, sem build |
| Markup | HTML5 | Single page app |
| Estilo | CSS3 inline | ~2k linhas em index.html, CSS Variables |
| Storage | IndexedDB v5 | `financas_pwa_v2`, 7 stores |
| Cache | In-memory (`_dbCache`) | Invalidado automaticamente nas escritas |
| Offline | Service Worker | cache-first, 'financas-v3' |
| PWA | Web App Manifest | Gerado em runtime via app.js |
| Fontes | DM Sans + DM Mono | Google Fonts |
| Build | Nenhum | Direto no navegador |
| Deploy | GitHub Pages | Push para main = deploy |

## Integrações externas

| Serviço | Tipo | Status |
|---------|------|--------|
| GitHub Pages | Hospedagem estática | Ativo |
| Google Fonts | CDN de fontes (DM Sans + DM Mono) | Ativo |
| Nubank OFX/QFX | Export de extrato | Planejado (não implementado) |

## Páginas da aplicação

| Tab | Page ID | Conteúdo |
|-----|---------|----------|
| Ícone dashboard | `page-dash` | Resumo saldo, compromisso de renda, últimos lançamentos |
| Ícone lista | `page-tx` | Lançamentos com form + lista filtrada |
| Ícone cartão | `page-cards` | Lista de cartões, faturas, gastos |
| Ícone gráfico | `page-proj` | Projeção de cash flow |
| Ícone orçamento | `page-budget` | Orçamento mensal com confirmação de realizado |
| Ícone config | `page-cfg` | Configurações (pessoas, tema, export/import) |
