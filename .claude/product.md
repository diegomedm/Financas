# Visão de Produto — Financas

**Atualizado em:** 2026-06-26
**Status:** Maduro — features core completas, roadmap ativo

## Problema que resolve

Gestão financeira pessoal sem dependência de servidor ou cloud. Permite controle de lançamentos, orçamento, cartões de crédito e projeção de fluxo de caixa diretamente no dispositivo, com dados privados e acesso offline.

## Usuário alvo

- **Diego** — proprietário principal, gerencia as finanças do casal
- **Camila** — responsável secundária, acesso compartilhado via mesmo dispositivo/export

Contexto: casal com renda fixa, cartões de crédito, despesas fixas e variáveis, e necessidade de visibilidade mensal do orçamento.

## Proposta de valor

- PWA offline-first: funciona sem internet, instala na tela inicial (iOS/Android)
- Dados 100% locais (IndexedDB): sem servidor, sem conta, sem assinatura
- Export/Import v6: backup manual e migração entre dispositivos
- Publicado em GitHub Pages: gratuito, sem infraestrutura

## Deploy

- URL: https://diegomedm.github.io/Financas/
- Hospedagem: GitHub Pages (gratuito)
- Atualização: push para `main` → deploy automático

## Funcionalidades core (todas implementadas)

| Feature | Descrição |
|---------|-----------|
| Lançamentos (TX) | Receitas e despesas com subitens, parcelamentos, filtros |
| Orçamento | Recorrência always/once/installments, atraso/pendência, confirmação de realizado |
| Cartões de Crédito | Fatura por fechamento, limite com barra, gastos parcelados, recorrentes |
| Projeção | Fluxo de caixa 3/6/12 meses |
| Pessoas | Responsáveis com cores e filtros por seção |
| Configurações | Export/import v6, temas claro/escuro, limpeza de dados |
| PWA | Offline-first, instalável, Service Worker cache-first |

## Roadmap (itens pendentes)

| Prioridade | Item | Complexidade |
|-----------|------|-------------|
| 1 | Separar `cards.js` em dois módulos | N2 (refactor) |
| 2 | Onboarding para novo usuário | N2-N3 |
| 3 | Gráficos/visualizações no dashboard | N2-N3 |
| 4 | OFX/QFX importer (Nubank suporta nativamente) | N3 |

## Fora do escopo (decisão explícita)

- Sincronização cloud / backend
- Contas de usuário / autenticação
- Multi-tenant / compartilhamento em tempo real
- Aplicativo nativo (iOS/Android — PWA é suficiente)
