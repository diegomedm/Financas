# Plano de Testes QA — Sprint 2: Simplificação e Melhorias de UX

**Projeto:** Finanças PWA
**Sprint:** 2
**Data:** 2026-06-26
**Agente:** QA Engineer
**Status:** Aprovado para validação no browser
**App:** http://127.0.0.1:3000/Financas/index.html

---

## 1. Resultado das Verificações Estáticas

### 1.1 Sintaxe JS (`node --check`)

| Arquivo | Resultado |
|---------|-----------|
| `js/transactions.js` | PASSOU (exit 0) |
| `js/budget.js` | PASSOU (exit 0) |

### 1.2 Verificações de presença/ausência no código

| Verificação | Esperado | Resultado |
|-------------|----------|-----------|
| `id="recent-list"` em `index.html` | Ausente | PASSOU — nenhuma ocorrência |
| `area-recur` em `js/transactions.js` | Ausente | PASSOU — nenhuma ocorrência |
| `area-parcela` em `js/transactions.js` | Ausente | PASSOU — nenhuma ocorrência |
| `onRecurChange` em `js/transactions.js` | Ausente | PASSOU — nenhuma ocorrência |
| `done-date-input` em `js/budget.js` | Presente (linha 599 e 602) | PASSOU |
| Bifurcação `addSubitem` por `isTxArea` | Presente (linha 158–179) | PASSOU |
| `_toggleBudgetDoneInternal(budgetId, doneDate)` | Presente (linha 608) | PASSOU |
| Bloco `cartao_*` inalterado em `_toggleBudgetDoneInternal` | Presente (linha 611–643) | PASSOU |
| `onTypeChange()` mantida como stub vazio | Presente (linhas 129–131) | PASSOU |
| `enrichedRows` / `recent` em `renderDash()` | Ausente | PASSOU — nenhuma ocorrência |
| `option value="fixed"` condicional a `isEdit && t?.type==='fixed'` | Presente (linha 30) | PASSOU |
| `msg` do `showConfirm` usa concatenação de string (sem template literal aninhado) | Concatenação de string | PASSOU |
| `JSON.stringify` em atributo `onclick` introduzido pelo Sprint 2 | Ausente | PASSOU |
| `todayISO()` disponível no escopo de `budget.js` | Definida em `utils.js` (carregada antes) | PASSOU |
| Elementos do dashboard preservados em `index.html` | `summary-cards`, `prog-area`, `pessoa-summary-card`, `last-update-bar`, `person-filter-bar-dash` | PASSOU |
| `pessoa-summary` em `renderDash()` usa `allRows` (não `enrichedRows`) | Usa `allRows` (linha 553) | PASSOU |
| `date:doneDate` usado no `dbAdd` de itens normais | Presente (linha 673) | PASSOU |

### Veredicto das verificações estáticas

**APROVADO — 0 bloqueantes estáticos encontrados.**

Todas as 17 verificações passaram. Nenhum arquivo tem erro de sintaxe. Nenhuma remoção esperada deixou rastro. Nenhuma adição esperada está faltando.

---

## 2. Plano de Testes Manuais no Browser

**Estratégia:** cada cenário é numerado como CT-XXX com mapeamento 1:1 para os critérios de aceite da spec. Executar em ordem dentro de cada mudança. Os testes de regressão ficam ao final.

**Pré-requisito:** app rodando em `http://127.0.0.1:3000/Financas/index.html` com dados reais (ou dados de backup importados). Ter ao menos um lançamento com `type:'fixed'` no IndexedDB e ao menos um item de orçamento (não cartão) disponível.

---

### Mudança 2a — Simplificação do form de novo lançamento

#### CT-001: Form exibe apenas Receita e Despesa Variável no seletor de tipo
- Tipo: integração (browser)
- Prioridade: crítico
- Pré-condição: usuário está na aba Lançamentos
- Ação: tocar em "+ Novo"
- Resultado esperado: modal abre; seletor de tipo exibe exatamente duas opções — "Receita" e "Despesa Variável"; a opção "Despesa Fixa" não aparece
- Como verificar: abrir o `<select id="f-type">` e contar as opções visíveis

#### CT-002: Form não exibe seletor de repetição
- Tipo: integração (browser)
- Prioridade: alto
- Pré-condição: modal de novo lançamento está aberto
- Ação: inspecionar o formulário visualmente
- Resultado esperado: não há seletor "Apenas este período / Mensal — repetir N vezes"; não há campo de quantidade de repetições
- Como verificar: rolar o modal do topo ao rodapé — nenhum elemento de recorrência deve estar visível ou no DOM (verificar via DevTools: `document.getElementById('area-recur')` deve retornar null)

#### CT-003: Form não exibe campos de parcelamento
- Tipo: integração (browser)
- Prioridade: alto
- Pré-condição: modal de novo lançamento está aberto
- Ação: inspecionar o formulário
- Resultado esperado: não há campos de "Parcela atual" e "Total de parcelas"
- Como verificar: `document.getElementById('area-parcela')` retorna null no DevTools

#### CT-004: Subitem no form de novo TX exibe apenas nome e valor
- Tipo: integração (browser)
- Prioridade: alto
- Pré-condição: modal de novo lançamento está aberto
- Ação: tocar em "+ Subitem"
- Resultado esperado: linha de subitem aparece com campo de nome e campo de valor; botão "⟳" (repeat) não está presente; nenhum campo de quantidade de repetição no subitem
- Como verificar: inspecionar a linha de subitem adicionada

#### CT-005: Salvar lançamento de despesa variável simples
- Tipo: integração (browser)
- Prioridade: crítico
- Pré-condição: modal de novo lançamento aberto
- Ação: preencher Descrição "Mercado", Valor "150", Tipo "Despesa Variável"; tocar "Salvar"
- Resultado esperado: modal fecha; lançamento "Mercado" aparece na listagem do mês corrente com valor R$ 150,00; nenhum `console.error` disparado
- Como verificar: verificar listagem; via DevTools → Application → IndexedDB confirmar `type:'variable'`

#### CT-006: Salvar receita simples
- Tipo: integração (browser)
- Prioridade: crítico
- Pré-condição: modal de novo lançamento aberto
- Ação: preencher Descrição "Salário", Valor "5000", Tipo "Receita"; tocar "Salvar"
- Resultado esperado: modal fecha; lançamento aparece; saldo do dashboard sobe com o valor; nenhum erro
- Como verificar: navegar ao Dashboard após salvar — card de Receitas deve incluir o valor

#### CT-007: Lançamentos existentes com type:'fixed' aparecem na listagem
- Tipo: regressão 2a
- Prioridade: crítico
- Pré-condição: IndexedDB contém lançamento(s) com `type:'fixed'`
- Ação: navegar para aba Lançamentos; verificar aba "Fixas" (se houver filtro)
- Resultado esperado: os lançamentos fixed aparecem normalmente; não há erro de renderização
- Como verificar: confirmar visualmente que os cards aparecem sem "undefined" ou valores incorretos

#### CT-008: Edição de lançamento existente com type:'fixed' funciona
- Tipo: regressão 2a
- Prioridade: crítico
- Pré-condição: existe lançamento com `type:'fixed'` no IndexedDB
- Ação: tocar em editar esse lançamento
- Resultado esperado: modal de edição abre; seletor de tipo exibe "Despesa Fixa" corretamente (opção visível); usuário consegue salvar sem mudar o tipo
- Como verificar: a option `value="fixed"` deve estar presente e selecionada no modal de edição

---

### Mudança 2b — Remoção de "Últimos lançamentos" do dashboard

#### CT-009: Dashboard não exibe seção de últimos lançamentos
- Tipo: integração (browser)
- Prioridade: crítico
- Pré-condição: usuário está na aba Dashboard (página inicial)
- Ação: carregar a página / navegar para o Dashboard
- Resultado esperado: nenhuma seção com título "Últimos lançamentos" é exibida; nenhum elemento com `id="recent-list"` está no DOM
- Como verificar: `document.getElementById('recent-list')` retorna null no DevTools; inspecionar o DOM do Dashboard na íntegra

#### CT-010: Cards de resumo (Receitas, Despesas, Saldo, Cartão) funcionam
- Tipo: regressão 2b
- Prioridade: crítico
- Pré-condição: existem lançamentos no mês corrente
- Ação: carregar Dashboard
- Resultado esperado: os quatro cards são exibidos com valores corretos do mês selecionado; nenhum card exibe NaN ou valor zerado indevidamente
- Como verificar: confirmar valores bateriam com os lançamentos cadastrados

#### CT-011: Barra de comprometimento da renda funciona
- Tipo: regressão 2b
- Prioridade: alto
- Pré-condição: existem receitas e despesas no mês
- Ação: carregar Dashboard
- Resultado esperado: barra de progresso exibida com percentual e cor correta (verde < 60%, âmbar 60–84%, vermelho >= 85%)
- Como verificar: verificar visualmente o percentual e a cor da barra

#### CT-012: Card "Por responsável" funciona quando há múltiplas pessoas
- Tipo: regressão 2b
- Prioridade: alto
- Pré-condição: dois ou mais responsáveis cadastrados, ambos com lançamentos no mês
- Ação: carregar Dashboard
- Resultado esperado: card "Por responsável" exibe saldo por pessoa; `pessoa-summary-card` visível
- Como verificar: inspecionar se o card aparece com dados corretos; se só há uma pessoa o card deve estar oculto

#### CT-013: Barra de última atualização funciona
- Tipo: regressão 2b
- Prioridade: médio
- Pré-condição: usuário está no Dashboard
- Ação: carregar Dashboard
- Resultado esperado: label de última atualização e botão "Marcar atualizado" são exibidos normalmente
- Como verificar: `#last-update-bar` visível no DOM

#### CT-014: Filtro de pessoa no dashboard funciona
- Tipo: regressão 2b
- Prioridade: alto
- Pré-condição: múltiplos responsáveis com lançamentos no mês
- Ação: selecionar um responsável no filtro do Dashboard
- Resultado esperado: cards de Receita, Despesa e Saldo refletem apenas os lançamentos daquele responsável; barra de comprometimento atualiza correspondentemente
- Como verificar: comparar os valores antes e depois do filtro

---

### Mudança 2c — Budget "marcar como realizado": campo de data

#### CT-015: Modal de confirmação exibe campo de data pré-preenchido com hoje
- Tipo: integração (browser)
- Prioridade: crítico
- Pré-condição: existe item de orçamento (não cartão) não marcado como realizado
- Ação: tocar no círculo de check desse item
- Resultado esperado: modal com título "Marcar como realizado?" abre; campo `<input type="date">` visível no modal; campo pré-preenchido com a data de hoje no formato YYYY-MM-DD
- Como verificar: comparar o valor do campo com `new Date().toISOString().slice(0,10)` no DevTools

#### CT-016: Confirmar com data de hoje cria lançamento com data de hoje
- Tipo: integração (browser)
- Prioridade: crítico
- Pré-condição: modal de confirmação aberto com a data de hoje no campo
- Ação: não alterar o campo; tocar em "Confirmar"
- Resultado esperado: modal fecha; lançamento criado tem `date` igual à data de hoje
- Como verificar: via DevTools → IndexedDB → store `tx` — o registro mais recente deve ter `date` igual a hoje

#### CT-017: Alterar a data antes de confirmar salva a data escolhida
- Tipo: integração (browser)
- Prioridade: crítico
- Pré-condição: modal de confirmação aberto
- Ação: alterar o campo de data para um dia anterior (ex: ontem); tocar em "Confirmar"
- Resultado esperado: lançamento criado tem `date` igual à data escolhida (não hoje, não o vencimento do orçamento)
- Como verificar: via DevTools → IndexedDB → store `tx` — confirmar o campo `date` do registro criado

#### CT-018: Cancelar o modal não cria lançamento
- Tipo: integração (browser)
- Prioridade: alto
- Pré-condição: modal de confirmação aberto
- Ação: tocar em "Cancelar"
- Resultado esperado: modal fecha; item permanece desmarcado no orçamento; nenhum novo registro em `tx`
- Como verificar: contar registros em IndexedDB antes e depois; item deve continuar sem check visual

#### CT-019: Desmarcação de item não exibe modal de data
- Tipo: integração (browser)
- Prioridade: alto
- Pré-condição: item de orçamento já marcado como realizado
- Ação: tocar no círculo de check desse item
- Resultado esperado: a marcação é desfeita imediatamente sem exibir modal; lançamento associado é removido do store `tx`
- Como verificar: nenhum modal aparece; verificar que o círculo volta ao estado desmarcado

#### CT-020: Itens de fatura de cartão não são afetados
- Tipo: regressão 2c
- Prioridade: crítico
- Pré-condição: existe cartão de crédito com fatura no orçamento do mês corrente
- Ação: marcar o cartão como realizado
- Resultado esperado: fluxo segue o comportamento original — sem campo de data adicional (modal pode aparecer dependendo do fluxo original, mas sem o campo `done-date-input`); fatura é lançada com a data de vencimento calculada
- Como verificar: confirmar que nenhum campo `done-date-input` aparece para o cartão; verificar `tx.date` corresponde ao vencimento da fatura

#### CT-021: Campo de data vazio não bloqueia a confirmação
- Tipo: integração (browser)
- Prioridade: médio
- Pré-condição: modal de confirmação aberto para item de orçamento não-cartão
- Ação: apagar o valor do campo de data; tocar em "Confirmar"
- Resultado esperado: lançamento é criado com `tx.date` igual a string vazia; nenhum erro exibido; nenhum `console.error`
- Como verificar: verificar o registro em IndexedDB; confirmar ausência de erros no console

---

### Testes de Regressão Geral

#### CT-022: Export/Import v6 não afetado
- Tipo: regressão geral
- Prioridade: crítico
- Pré-condição: dados no app (lançamentos, orçamento, cartões)
- Ação: Configurações → Export → salvar arquivo; limpar dados; Import → selecionar arquivo exportado
- Resultado esperado: dados restaurados corretamente; lançamentos com `type:'fixed'`, `type:'income'`, `type:'variable'`, `type:'credit'` todos visíveis
- Como verificar: comparar quantidade de registros antes/depois; verificar que `type:'fixed'` reaparece

#### CT-023: Nenhum `console.error` em fluxo normal de uso
- Tipo: regressão geral
- Prioridade: alto
- Pré-condição: DevTools Console aberto
- Ação: executar fluxo completo — criar TX, verificar dashboard, marcar item de orçamento, desmarcar item de orçamento
- Resultado esperado: zero `console.error` durante todo o fluxo
- Como verificar: monitorar painel Console do DevTools durante a execução

---

## 3. Requisitos do Harness (para execução automatizada futura)

Esta seção documenta o que seria necessário para automatizar estes testes.

### Dados necessários
- Lançamento com `type:'fixed'` pré-existente no IndexedDB
- Lançamento com `type:'income'` e `type:'variable'` pré-existentes
- Ao menos dois responsáveis (pessoas) cadastrados com lançamentos no mês
- Item de orçamento (não cartão) em status não marcado
- Item de orçamento já marcado (para CT-019)
- Cartão de crédito com ao menos um gasto na fatura do mês corrente

### Serviços a mockar
- Não se aplica — app é offline-first sem dependências externas

### Isolamento necessário
- Banco IndexedDB limpo ou com seed controlado por teste
- Nenhum teste altera dados usados por outro teste (usar transações com rollback ou recriação de banco por teste)

---

## 4. Critérios de Aprovação

| Condição | Threshold |
|----------|-----------|
| CTs críticos passando | 100% (CT-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 015, 016, 017, 020, 022) |
| CTs altos passando | 100% |
| CTs médios passando | 100% |
| `console.error` durante fluxo normal | 0 |
| Bugs críticos abertos | 0 |
| Bugs altos abertos | 0 |

Qualquer CT crítico ou alto que não passe bloqueia o merge. CTs médios podem ser aceitos com registro de débito técnico se o PO concordar.

---

## 5. Veredicto QA

**VERIFICAÇÕES ESTÁTICAS: APROVADO**

Nenhum bloqueante encontrado na análise estática. O código pode ser validado no browser.

**PRÓXIMO PASSO:** executar o checklist manual (CT-001 a CT-023) no browser com os dados reais disponíveis no backup (`G:\Meu Drive\financas_backup_20260626.json`). Após execução, reportar resultado por CT e o QA emite veredicto final de aprovação ou devolução ao Dev.
