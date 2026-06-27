# Spec — Sprint 4: Melhorias na Aba de Projeção

**Versão:** 1.0  
**Data:** 2026-06-27  
**Agente:** Product Owner  
**Status:** Pronto para revisão do Tech Lead antes de dev

---

## Objetivo

Tornar a aba de Projeção mais precisa e personalizável, permitindo horizonte configurável, incluindo itens de orçamento pendentes nos cálculos e respondendo ao filtro de pessoa já existente no app.

---

## Contexto técnico

### O que existe hoje

A aba Projeção (`#page-proj` em `index.html`) exibe uma tabela de fluxo de caixa futuro renderizada pela função `renderProj()` em `js/projection.js`.

**Comportamento atual de `renderProj()`:**
- Itera de `i=0` a `i<projPeriods` (variável global em `globals.js`, inicializada em `3`)
- Para cada mês, chama `calcMonth(all, y, m)` onde `all` vem de `dbAll()` — ou seja, considera apenas TX da store `tx` do IndexedDB
- O horizonte já tem seletor de 3/6/12 meses no HTML (botões com `setProjPeriods`), mas **não persiste em localStorage**
- `projPeriods` começa sempre em `3` quando o app é carregado
- **O filtro `pessoaFilter` não é aplicado** — a projeção sempre mostra dados de todas as pessoas
- **Itens da store `budget` não são incluídos** — apenas TX lançadas na store `tx`

**Função `calcMonth(all, y, m)` em `utils.js`:**
- Recebe um array `all` de TX e calcula receita, despesa, crédito e saldo para o par `(y, m)`
- Filtra por `t.year === y && t.month === m`
- Não conhece a store `budget` — é responsabilidade de `renderProj()` passar os dados corretos

**Store `budget`:**
- Contém itens com campos: `name`, `value`, `type` (income/fixed/variable), `recurrence` (always/once/installments), `budgetMonth`, `budgetYear`, `pessoaId`, `delayed`, `delayedSkipMonths`
- Items `recurrence: 'always'` aparecem em todo mês (exceto meses em `delayedSkipMonths`)
- Items `recurrence: 'once'` ou `'installments'` aparecem apenas no mês `budgetMonth/budgetYear`
- A lógica de filtro de `renderBudget()` em `budget.js` já resolve quais items aparecem em qual mês

**Variável `pessoaFilter`:**
- Global declarada em `globals.js` como `let pessoaFilter = null`
- Quando `null`, exibe todos. Quando preenchida com um ID, filtra por responsável
- Já é usada em `renderDash()`, `renderTx()` e `renderBudget()` — a projeção é a única aba que ignora

**Persistência do horizonte:**
- `projPeriods` é lido do localStorage em nenhum ponto atual — perde ao recarregar
- O seletor visual (botões 3/6/12) existe no HTML mas só atualiza a variável em memória via `setProjPeriods()`

---

## Mudanças aprovadas

### Mudança 1 — Horizonte configurável com persistência

O valor selecionado (3, 6 ou 12 meses) deve ser salvo em `localStorage` com a chave `'projPeriods'` e restaurado na inicialização do app.

**Comportamento esperado:**
- Ao abrir o app, `projPeriods` lê `localStorage.getItem('projPeriods')` — se existir e for 3, 6 ou 12, usa esse valor; caso contrário usa `3` como padrão
- O botão correspondente ao valor restaurado recebe a classe `active`
- Ao clicar em qualquer botão, `setProjPeriods()` salva o novo valor via `localStorage.setItem('projPeriods', n)`

### Mudança 2 — Incluir itens de orçamento pendentes na projeção

A projeção deve somar, para cada mês projetado, os itens de `budget` que ainda não foram marcados como realizados (`budgetDone`), tratando-os como receita ou despesa futura esperada.

**Comportamento esperado:**
- Para cada mês `(y, m)` do horizonte, buscar os itens de `budget` aplicáveis ao mês — mesma lógica de filtragem usada em `renderBudget()`:
  - `recurrence: 'always'`: inclui, exceto se `delayedSkipMonths` contém `{month: m, year: y}`
  - `recurrence: 'once'` ou `'installments'`: inclui apenas se `budgetMonth === m && budgetYear === y`
- Excluir itens já marcados como realizados em `budgetDone` para o par `(y, m)` — esses já estão ou estarão na store `tx`
- Separar por tipo: itens com `type: 'income'` somam à receita; demais somam à despesa
- O saldo do mês = (receita TX + receita budget pendente) - (despesa TX + despesa budget pendente)
- A linha de cada mês deve indicar visualmente que inclui itens de orçamento (ver RN-05)

### Mudança 3 — Projeção por pessoa

Aplicar `pessoaFilter` na projeção, exatamente como o dashboard já faz.

**Comportamento esperado:**
- Quando `pessoaFilter !== null`, filtrar tanto os TX (passados para `calcMonth`) quanto os itens de budget pelo `pessoaId`
- Quando `pessoaFilter === null`, exibir dados de todas as pessoas (comportamento atual)
- A projeção deve re-renderizar automaticamente quando o filtro de pessoa mudar (o mecanismo já existe: `renderPersonFilterBars()` chama `renderAll()`, que chama `renderProj()` quando a aba está ativa)
- Adicionar barra de filtro de pessoa na aba de Projeção, com o mesmo padrão visual das outras abas (`#person-filter-bar-dash`, `#person-filter-bar-tx`)

---

## User Stories

### US-01 — Horizonte persistido

Como Diego ou Camila,  
quero que o app lembre o horizonte de projeção que escolhi (3, 6 ou 12 meses),  
para não precisar reconfigurar toda vez que abro o app.

### US-02 — Orçamento na projeção

Como Diego ou Camila,  
quero que a projeção considere os itens do orçamento que ainda não foram realizados,  
para ter uma visão mais realista do que entra e sai nos próximos meses.

### US-03 — Projeção filtrada por pessoa

Como Diego ou Camila,  
quero aplicar o filtro de responsável na aba de Projeção,  
para entender minha participação individual no fluxo de caixa futuro.

---

## Critérios de Aceite (BDD)

### CA-01 — Persistência do horizonte ao recarregar

```gherkin
Cenário: Usuário seleciona 6 meses e recarrega o app
  Dado que o usuário está na aba Projeção
  Quando o usuário clica no botão "6"
  E fecha e reabre o app (ou recarrega a página)
  Então a aba Projeção exibe 6 meses de projeção
  E o botão "6" está visualmente ativo (classe active)
  E os botões "3" e "12" não estão ativos
```

```gherkin
Cenário: Primeiro uso — sem valor salvo no localStorage
  Dado que o localStorage não contém a chave 'projPeriods'
  Quando o app é carregado e o usuário navega para a aba Projeção
  Então a projeção exibe 3 meses (padrão)
  E o botão "3" está ativo
```

```gherkin
Cenário: Valor inválido no localStorage
  Dado que localStorage contém 'projPeriods' com valor '7' (inválido)
  Quando o app é carregado
  Então projPeriods assume o valor 3 (padrão seguro)
  E o botão "3" está ativo
```

### CA-02 — Orçamento incluído nos meses futuros

```gherkin
Cenário: Item de budget fixo (always) aparece na projeção
  Dado que existe um item de orçamento com recurrence 'always', type 'fixed', value 1500
  E esse item não foi marcado como realizado em nenhum dos próximos meses
  Quando o usuário visualiza a aba Projeção
  Então cada linha de mês futuro exibe R$ 1.500,00 a mais na coluna Saída
  Em relação a um cenário hipotético sem esse item
```

```gherkin
Cenário: Item de budget pontual (once) aparece apenas no mês correto
  Dado que existe um item de orçamento com recurrence 'once', budgetMonth=7, budgetYear=2026, type 'fixed', value 800
  Quando o usuário visualiza a projeção com horizonte de 6 meses a partir de julho/2026
  Então apenas a linha de julho/2026 inclui R$ 800,00 na coluna Saída
  E os outros meses não são afetados
```

```gherkin
Cenário: Item de budget já realizado não duplica na projeção
  Dado que existe um item de orçamento marcado como realizado em agosto/2026
  E o lançamento correspondente já foi gerado na store tx (via toggleBudgetDone)
  Quando o usuário visualiza a projeção
  Então agosto/2026 não conta o valor do item de budget duas vezes
  E apenas o TX gerado é contado (via calcMonth)
```

```gherkin
Cenário: Item de budget de receita soma à entrada da projeção
  Dado que existe um item de orçamento com type 'income', recurrence 'always', value 5000
  E esse item não está realizado nos próximos meses
  Quando o usuário visualiza a aba Projeção
  Então cada linha de mês futuro exibe R$ 5.000,00 a mais na coluna Entrada
```

```gherkin
Cenário: Mês atual tem budget parcialmente realizado
  Dado que o mês atual (mês corrente) tem 3 itens de orçamento
  E 2 deles já foram marcados como realizados (com TX gerado na store tx)
  E 1 ainda está pendente
  Quando o usuário visualiza a aba Projeção
  Então a linha do mês atual exibe os valores da store tx (2 realizados via calcMonth)
  Mais o valor do item pendente (1 item de budget)
  Sem duplicação dos 2 já realizados
```

### CA-03 — Projeção filtrada por pessoa

```gherkin
Cenário: Filtro de pessoa ativo filtra TX da projeção
  Dado que o filtro de responsável está ativo para "Diego"
  E Diego tem lançamentos (store tx) e itens de orçamento atribuídos a ele
  E Camila tem lançamentos e itens de orçamento atribuídos a ela
  Quando o usuário visualiza a aba Projeção
  Então apenas os TX com pessoaId de Diego são incluídos nos cálculos
  E apenas os itens de budget com pessoaId de Diego são incluídos
  E os valores de Camila não aparecem na projeção
```

```gherkin
Cenário: Sem filtro exibe todos
  Dado que o filtro de pessoa está em "Todos" (pessoaFilter === null)
  Quando o usuário visualiza a aba Projeção
  Então a projeção inclui TX e itens de orçamento de todas as pessoas
```

```gherkin
Cenário: Barra de filtro de pessoa está presente na aba Projeção
  Dado que o app tem pelo menos uma pessoa cadastrada
  Quando o usuário navega para a aba Projeção
  Então a barra de filtro de pessoa é exibida acima da tabela de projeção
  Com os mesmos chips de pessoa presentes no dashboard e lançamentos
```

```gherkin
Cenário: Trocar filtro de pessoa re-renderiza a projeção
  Dado que a aba Projeção está visível
  Quando o usuário seleciona um filtro de pessoa diferente na barra
  Então a tabela de projeção redesenha imediatamente com os dados filtrados
  Sem necessidade de navegar para outra aba e voltar
```

### CA-04 — Comportamento do total acumulado

```gherkin
Cenário: Linha de total reflete orçamento incluído
  Dado que a projeção considera TX e budget pendente
  Quando o usuário visualiza a linha "TOTAL N MESES" ao final da projeção
  Então o total de Entrada é a soma de todas as entradas (TX + budget income) dos N meses
  E o total de Saída é a soma de todas as saídas (TX + budget expense) dos N meses
  E o saldo acumulado é a diferença correta
```

### CA-05 — Edge cases

```gherkin
Cenário: Nenhum lançamento e nenhum item de orçamento
  Dado que o IndexedDB está vazio (sem TX e sem budget)
  Quando o usuário navega para a aba Projeção
  Então a projeção exibe as linhas de meses com valores zerados
  E não há erro no console
```

```gherkin
Cenário: Item de budget com delayed e delayedSkipMonths
  Dado que existe um item fixo com delayedSkipMonths incluindo o mês M
  Quando a projeção calcula o mês M
  Então o item não é incluído no cálculo do mês M
  E aparece normalmente nos outros meses (sem skip)
```

---

## Requisitos não-funcionais (RN)

| ID | Regra | Detalhe | Origem |
|----|-------|---------|--------|
| RN-01 | Sem chamada adicional ao banco para cada mês | `budgetAll()` e `_budgetDoneAll()` (ou equivalente) devem ser chamados uma única vez antes do loop de meses, não dentro do loop | Performance — evitar N queries para N meses |
| RN-02 | `pessoaFilter` aplicado da mesma forma que em `renderBudget()` e `renderDash()` | Consistência de comportamento entre abas | Consistência UX |
| RN-03 | `projPeriods` lido do localStorage na inicialização do app | Em `init()` em `app.js` ou no topo de `projection.js`, antes da primeira renderização | Persistência correta |
| RN-04 | Valor inválido no localStorage deve ter fallback seguro para `3` | Validar se o valor é um dos três aceitos: 3, 6 ou 12 | Robustez |
| RN-05 | Indicador visual de que o budget está incluído | Exibir uma nota textual discreta abaixo da tabela (ex: "Inclui itens de orçamento pendentes") — não é necessário indicar por linha | Transparência para o usuário |
| RN-06 | Itens de budget já realizados em `budgetDone` não devem ser incluídos na projeção | Verificar contra `budgetDone` para o par `(y, m)` de cada item | Evitar dupla contagem |
| RN-07 | Items de budget do tipo `credit` não existem (o formulário só permite income/fixed/variable) | Tratar como `expense` caso apareça um valor inesperado | Segurança futura |
| RN-08 | A barra de filtro de pessoa na aba Projeção usa o mesmo `renderPersonFilterBars()` já existente | Adicionar `#person-filter-bar-proj` ao HTML e incluir `'proj'` no array de `renderPersonFilterBars()` em `pessoas.js` | Consistência de implementação |

---

## Restrições técnicas obrigatórias

- NUNCA usar `export` ou `import`
- NUNCA usar `<script type="module">`
- NUNCA usar nested template literals (template literal dentro de template literal)
- NUNCA usar `JSON.stringify` em atributos `onclick`
- `node --check` obrigatório após qualquer edição em arquivo `.js`
- Toda nova variável global deve ser declarada em `globals.js`

---

## Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `js/projection.js` | Reescrever `renderProj()`: adicionar fetch de `budgetAll()` e `_budgetDoneAll()`, lógica de filtro por `pessoaFilter`, lógica de budget items por mês; atualizar `setProjPeriods()` para persistir em localStorage |
| `js/globals.js` | Inicializar `projPeriods` lendo do localStorage (com fallback para 3 e validação) |
| `js/pessoas.js` | Incluir `'proj'` na lógica de `renderPersonFilterBars()` para que o filtro de pessoa seja renderizado na aba Projeção |
| `index.html` | Adicionar `<div id="person-filter-bar-proj"></div>` dentro de `#page-proj`, antes do `.card` de projeção |

---

## DoD (Definition of Done)

- [ ] `projPeriods` é restaurado do localStorage ao carregar o app, com botão correto marcado como `active`
- [ ] Ao selecionar 3, 6 ou 12 meses, o valor é salvo no localStorage e persiste após reload
- [ ] Para cada mês da projeção, itens de budget `recurrence: 'always'` são incluídos (exceto com `delayedSkipMonths`)
- [ ] Itens de budget `recurrence: 'once'` e `'installments'` aparecem apenas no mês correto
- [ ] Itens de budget já marcados como realizados em `budgetDone` não são incluídos
- [ ] Quando `pessoaFilter !== null`, tanto TX quanto budget são filtrados por `pessoaId`
- [ ] Barra de filtro de pessoa presente e funcional na aba Projeção
- [ ] Nota "Inclui itens de orçamento pendentes" exibida abaixo da tabela de projeção
- [ ] Total de N meses reflete corretamente os valores de TX + budget pendente
- [ ] Sem erros no console em nenhum cenário (sem budget, com budget parcial, com filtro ativo)
- [ ] `node --check` sem erros em todos os arquivos modificados
- [ ] Testado com `pessoaFilter` ativo e inativo
- [ ] Testado com horizonte 3, 6 e 12 meses após reload
- [ ] Code Reviewer aprovou sem bloqueantes
- [ ] QA validou todos os CAs acima e aprovou explicitamente
- [ ] PO aprovou o resultado

---

## DoR — Pré-requisitos para entrar em dev

- [x] Contexto técnico documentado com base no código atual lido
- [x] User stories no formato correto
- [x] Critérios de aceite em BDD sem ambiguidade
- [x] Regras de negócio explícitas e verificáveis
- [x] Escopo MVP separado do escopo futuro (não há V2 nesta spec — escopo fechado)
- [x] Dependências identificadas (budgetAll, _budgetDoneAll, pessoaFilter, renderPersonFilterBars)
- [ ] Tech Lead confirma: `_budgetDoneAll()` pode ser chamada diretamente de `projection.js` (é função interna de `db.js` prefixada com `_`, verificar se está acessível globalmente)
- [ ] Tech Lead confirma: impacto de chamar `budgetAll()` no contexto de `renderProj()` (cache já cobre — `budgetAll()` usa `_dbCache`)

---

## Riscos e ambiguidades para o Dev

### Risco 1 — `_budgetDoneAll()` é prefixada com `_` (internal)

A função `_budgetDoneAll()` em `db.js` tem prefixo de convenção "interna". No contexto de escopo global compartilhado (sem módulos), ela **é acessível** de qualquer arquivo. Mas o Dev deve verificar isso antes de usar. Alternativa: criar um wrapper público `budgetDoneAll()` em `db.js` — mais limpo e sem depender de convenção.

### Risco 2 — Dupla contagem para o mês corrente

O mês corrente pode ter TX gerados pelo `toggleBudgetDone` (que cria TX na store `tx` ao marcar um budget como realizado). Se o item de budget correspondente ainda aparecer no `budgetAll()`, será contado duas vezes — uma pelo TX e outra pelo budget.

**Solução esperada:** para cada item de budget do mês `(y, m)`, verificar se existe um registro em `budgetDone` com a chave `budgetId_YYYYMM`. Se existir, o item já gerou TX e **não deve ser somado ao budget pendente**.

A função `doneAllForMonth(y, m)` já existe em `db.js` e retorna todos os registros de `budgetDone` para um mês — usar ela para construir o Set de IDs realizados.

### Risco 3 — Items de budget sem `pessoaId`

Alguns itens de budget podem ter `pessoaId: null` (não atribuídos). Quando `pessoaFilter` está ativo, esses itens devem ser **excluídos** da projeção filtrada — o mesmo comportamento de `renderBudget()`:

```js
// em renderBudget():
const manualItems = pessoaFilter
  ? manualItemsBeforePessoa.filter(item => item.pessoaId === pessoaFilter)
  : manualItemsBeforePessoa;
```

Confirmar com o usuário se items sem responsável devem aparecer ou não quando um filtro está ativo. Posição atual: **excluir** (consistência com o comportamento de `renderBudget()`).

### Risco 4 — Performance com horizonte de 12 meses

Com 12 meses, `renderProj()` irá calcular 12 iterações. Para cada iteração, filtrará o array de TX (já em cache via `dbAll()`) e o array de budget (também em cache via `budgetAll()`). Com `doneAllForMonth()` chamada uma vez e o resultado disponível em memória, não há queries adicionais ao IndexedDB. O Dev deve garantir que `budgetAll()`, `dbAll()` e `doneAllForMonth()` (ou equivalente) sejam chamadas **uma única vez antes do loop**, não dentro dele.

### Risco 5 — Items de budget com `subRepeatStart` e subitems

Alguns items de budget têm `subitems` com campo `repeat` e `subRepeatStart`. Para a projeção, o valor relevante é o `value` do item principal — não é necessário calcular subitems ativos mês a mês. O Dev pode usar `item.value` diretamente. Se quiser maior precisão, pode usar `getActiveSubitems()` — mas isso aumenta a complexidade. **Decisão de PO: usar `item.value` por ora. Refinamento de subitems fica fora do escopo desta sprint.**

---

## Dependências identificadas

| Tipo | Nome | Natureza | Responsável | Status |
|------|------|---------|-------------|--------|
| Função existente | `budgetAll()` em `db.js` | Não-bloqueante | — | Disponível (com cache) |
| Função existente | `doneAllForMonth(y, m)` em `db.js` | Não-bloqueante | — | Disponível |
| Função existente | `calcMonth(all, y, m)` em `utils.js` | Não-bloqueante | — | Disponível |
| Variável global | `pessoaFilter` em `globals.js` | Não-bloqueante | — | Disponível |
| Função existente | `renderPersonFilterBars()` em `pessoas.js` | Não-bloqueante — requer inclusão de 'proj' | Senior Dev | A verificar |
| HTML | `#person-filter-bar-proj` | Bloqueante para filtro visual | Senior Dev | A criar |
| localStorage key | `'projPeriods'` | Não-bloqueante | — | A implementar |
