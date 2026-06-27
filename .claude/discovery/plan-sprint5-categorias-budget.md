# Plano de Desenvolvimento — Sprint 5: Migração de Categorias para o Orçamento

**Versão:** 1.0
**Data:** 2026-06-27
**Status:** Aguardando aprovação
**Nível de complexidade:** N2 MVP — refatoração interna em sistema existente com usuários reais, dados não críticos, sem SLA formal

---

## 1. Visão Geral

### Problema

A implementação atual da Sprint 4b tem um modelo conceitual errado: categorias orçadas (ex: "Gasolina — R$300/mês") vivem na store `categoriasCartao`, que está acoplada ao módulo de cartões. Isso gera dois problemas concretos:

1. O delta (orçado - realizado) aparece na fatura do primeiro cartão disponível, mesmo quando nenhum gasto daquela categoria foi feito naquele cartão — comportamento incorreto e confuso.
2. TX avulsas (store `tx`) não podem ser vinculadas a uma categoria, impedindo controle correto do orçamento para gastos pagos em dinheiro, Pix ou débito.

### Solução proposta

Mover o conceito de "categoria orçada" para dentro da store `budget`, que já existe e é o lugar semântico correto para "quanto quero gastar com X neste mês". Um item de orçamento com `categoriaKey` definido passa a ser reconhecido como uma categoria orçada.

Os gastos (cartão e TX avulsas) continuam tendo `categoriaId`, mas agora esse ID aponta para um item da store `budget`, não da `categoriasCartao`.

A aba Orçamento passa a exibir o realizado vs orçado por categoria, agregando gastos de todos os cartões e TX avulsas. A seção "Por Categoria" na fatura mantém sua função, mas lê o valor orçado do item de budget — não da store antiga.

### Por que este nível de complexidade

N2: o sistema já tem usuários reais (o próprio usuário) e dados reais importados. A mudança não envolve dados sensíveis, SLA ou compliance, mas exige cuidado na migração de dados existentes (gastos que já têm `categoriaId` apontando para a store antiga). O escopo é bem delimitado e o usuário conhece o sistema profundamente.

---

## 2. Objetivos e Critérios de Sucesso

| Objetivo | Métrica de sucesso | Prazo esperado |
|----------|-------------------|----------------|
| Categoria orçada vive no budget | Item de budget com `categoriaKey` aparece na aba Orçamento com realizado vs orçado | Sprint única |
| TX avulsas podem ser categorizadas | Form de TX avulsa tem select de categoria vinculando ao budget | Sprint única |
| Delta não aparece em cartão errado | `getCartaoBudgetItems` para de injetar delta em faturas de cartão | Sprint única |
| Seção "Por Categoria" na fatura funciona | Lê valor orçado do budget, não da store antiga | Sprint única |
| Dados antigos não quebram | Gastos com `categoriaId` de `categoriasCartao` tratados como sem categoria (orphan) | Sprint única |

---

## 3. Escopo

### Dentro do escopo

- Adicionar campo `categoriaKey` (string slug) ao modal de criação/edição de item de budget
- Exibir na aba Orçamento, para itens com `categoriaKey`, o valor realizado vs orçado (bar de progresso)
- Permitir vincular gastos de cartão a um item de budget (via `categoriaId` apontando para budget)
- Permitir vincular TX avulsas a um item de budget (campo opcional no form de TX)
- Remover a lógica de delta de categoria de `getCartaoBudgetItems` (a funcao para de injetar delta no valor dos cartoes)
- Manter a seção "Por Categoria" na fatura lendo do budget (não da store antiga)
- Tratamento de orphans: gastos com `categoriaId` antigo (da store `categoriasCartao`) renderizam sem categoria, sem erro
- A store `categoriasCartao` permanece no banco sem ser deletada (dados históricos preservados, CRUD legado mantido ou simplesmente não exibido)

### Fora do escopo agora (futuro)

- Migração automática de categorias antigas (`categoriasCartao`) para itens de budget
- Relatório de categorias cross-mês (evolução mensal por categoria)
- Criação de categoria diretamente do modal de gasto (atalho "criar nova")
- Filtro por categoria no dashboard

### Explicitamente fora do escopo

- Mudança no IndexedDB version bump (não criar nem deletar stores — não é necessário)
- Qualquer lógica de export/import de dados
- Onboarding (Sprint 5 original — foi postergado por esta prioridade)

---

## 4. Módulos e Impacto por Arquivo

| Arquivo | O que muda | Complexidade |
|---------|------------|--------------|
| `js/db.js` | Nenhuma mudança — IDB schema-less, campos novos não exigem bump | Nenhuma |
| `js/budget.js` | (1) Modal de budget ganha campo `categoriaKey`; (2) `renderBudget` exibe barra realizado/orçado para itens com `categoriaKey` | Média |
| `js/cards-render.js` | (1) Remover bloco de delta de categoria de `getCartaoBudgetItems`; (2) Seção "Por Categoria" na fatura lê budget em vez de `categoriasCartao` | Média |
| `js/cards-modal.js` | Select `#cg-categoria` passa a listar itens do budget com `categoriaKey`; `saveGasto`/`saveGastoEdit` já salvam `categoriaId` corretamente — apenas a origem da lista muda | Baixa |
| `js/transactions.js` | Adicionar select de categoria (opcional) no form de TX avulsa; `saveEntry`/`updateEntry` salvam `categoriaId` no objeto | Média |
| `index.html` | Remover ou ocultar a seção `#categorias-cartao-section` da aba Cartão (ou manter vazia sem botão + Categoria) | Baixa |

---

## 5. Stack

Sem mudança. Vanilla JS ES2020, IndexedDB, sem build step.

---

## 6. Fases de Implementação

### Fase 1 — Budget: campo `categoriaKey` e exibição do realizado

**Arquivos:** `js/budget.js`

**Entregáveis:**
- [ ] Modal de budget (`showBudgetAddModal`) ganha campo "Esta é uma categoria orçada?" com input de slug (`categoriaKey`), opcional
- [ ] `renderBudget`: para itens com `categoriaKey`, calcular `totalRealizado` (soma de gastos de cartão + TX avulsas com `categoriaId === item.id` no mês corrente) e exibir barra de progresso realizado/orçado abaixo do item
- [ ] A lógica de cálculo de `totalRealizado` por categoria é uma função auxiliar `calcCategoriaRealizado(budgetId, month, year)` que lê `gastosAll()` e `dbAll()` e soma os valores

**Detalhes técnicos:**
- `categoriaKey` é um slug livre (ex: `"gasolina"`) usado apenas para identificação humana; o vínculo real é pelo `id` do item de budget
- Não há validação de unicidade de `categoriaKey` — é apenas um label identificador
- A barra de progresso usa a mesma paleta da seção "Por Categoria" existente: verde/âmbar/vermelho conforme o percentual

### Fase 2 — Cartão: select de categoria lê budget, remover delta de getCartaoBudgetItems

**Arquivos:** `js/cards-render.js`, `js/cards-modal.js`

**Entregáveis:**
- [ ] Em `showAddGastoModal`: o `setTimeout` que popula `#cg-categoria` passa a chamar `budgetAll()` e filtra itens com `categoriaKey`, em vez de `categoriasCartaoAll()`
- [ ] `saveGasto` e `saveGastoEdit`: já salvam `categoriaId` — sem mudança no campo, apenas a origem do dado muda
- [ ] Seção "Por Categoria" em `renderCards`: o lookup do valor orçado passa a usar o item de budget (`budgetAll()`) em vez de `categoriasCartao`; orphans (categoriaId que não existe no budget) são ignorados silenciosamente
- [ ] Em `getCartaoBudgetItems`: remover completamente o bloco de cálculo de delta por categoria (linhas ~333–378 do arquivo atual) — a função passa a retornar apenas os totais reais de cada cartão, sem injeção de delta
- [ ] A seção `#categorias-cartao-section` na aba Cartão: remover o botão "+ Categoria" e esconder o conteúdo (ou remover a seção do HTML) — categorias agora são gerenciadas pelo Orçamento

### Fase 3 — TX avulsas: campo de categoria

**Arquivos:** `js/transactions.js`

**Entregáveis:**
- [ ] `entryFormHtml`: adicionar select `#f-categoria` (opcional, após Observações) que lista itens de budget com `categoriaKey`
- [ ] `getFormValues`: capturar `categoriaId` do select
- [ ] `saveEntry` e `updateEntry`: incluir `categoriaId` no objeto salvo na store `tx`
- [ ] `txCard`: não precisa exibir a categoria — é dado interno de aggregação, não de UI

### Fase 4 — Limpeza e validação

**Entregáveis:**
- [ ] `node --check` em todos os arquivos JS modificados
- [ ] Testar fluxo completo no browser:
  1. Criar item de budget com `categoriaKey` (ex: "Gasolina")
  2. Lançar gasto no cartão vinculando à categoria
  3. Lançar TX avulsa vinculando à mesma categoria
  4. Verificar barra de realizado/orçado na aba Orçamento
  5. Verificar seção "Por Categoria" na fatura do cartão
  6. Verificar que o valor do cartão no budget NÃO inclui delta de categoria mais

---

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Gastos antigos com `categoriaId` da store `categoriasCartao` causam erro no lookup | Alta (usuário tem dados reais da Sprint 4b) | Médio | Tratar orphans: se `categoriaId` não existe no budget retornado por `budgetAll()`, ignorar silenciosamente — sem erro, sem exibição |
| `getCartaoBudgetItems` remover delta quebra projeção | Baixa (projeção usa os valores de `getCartaoBudgetItems`) | Médio | Verificar `js/projection.js` antes de remover — confirmar que projeção lê os totais reais e não dependia do delta artificial |
| Template literals aninhados ao adicionar barra de progresso no `renderBudget` | Média (código já tem template literals complexos) | Baixo | Usar concatenação de string para o trecho novo, seguindo o padrão já adotado em outras partes do código |
| Select de categoria vazio (nenhum item de budget com `categoriaKey`) | Alta (usuário provavelmente não tem nenhum item com o campo novo) | Baixo | Select mostra apenas "— Sem categoria —" quando vazio, sem erro |

---

## 8. Processo e Agentes Ativos

| Agente | Ativo? | Quando |
|--------|--------|--------|
| Discovery Agent | Sim | Agora — elaboração do plano |
| Product Owner | Não | Escopo já definido pelo usuário diretamente |
| Senior Dev | Sim | Após aprovação do plano |
| Code Reviewer | Não | N2 — sem Code Review formal |
| QA Engineer | Não | Smoke test manual pelo usuário |

**Gates obrigatórios:**
- Aprovação do plano pelo usuário
- `node --check` em todos os arquivos JS modificados
- Smoke test manual confirmado pelo usuário antes de commit

---

## 9. Verificação necessária antes de implementar

Antes de remover o bloco de delta em `getCartaoBudgetItems`, verificar `js/projection.js` para confirmar que a projeção não depende do valor inflado artificialmente pelos deltas de categoria. Este arquivo não foi lido ainda — deve ser lido no início da sessão de implementação.

---

## 10. Próximos Passos (após aprovação)

1. Senior Dev lê `js/projection.js` para confirmar risco do item 7
2. Implementar Fase 1 (budget.js) — mais isolada, menor risco
3. Implementar Fase 2 (cards-render.js + cards-modal.js)
4. Implementar Fase 3 (transactions.js)
5. Fase 4: node --check + smoke test manual
6. Commit após confirmação do usuário

---

## Notas sobre dados existentes

O usuário tem um backup JSON em `G:\Meu Drive\financas_backup_20260626.json` com dados reais da Sprint 4b. Gastos nesse backup podem ter `categoriaId` apontando para IDs da store `categoriasCartao`. A estratégia de orphan (ignorar silenciosamente) garante que esses dados não quebrem a nova lógica.

A store `categoriasCartao` permanece no banco e no código de leitura (`categoriasCartaoAll` continua existindo). O que muda é que a UI deixa de usar essa store para criar/editar categorias — ela passa a ser legado silencioso.
