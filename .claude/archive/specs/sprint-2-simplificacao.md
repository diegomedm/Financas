# Spec — Sprint 2: Simplificação e Melhorias de UX

**Projeto:** Finanças PWA  
**Sprint:** 2  
**Data:** 2026-06-26  
**Status:** Pronto para desenvolvimento  
**Agente:** Product Owner

---

## Objetivo do Sprint

Três mudanças independentes de escopo cirúrgico — cada uma pode ser implementada e testada sem depender das demais. O objetivo central é reduzir ruído no form de novo lançamento, eliminar a seção de últimos lançamentos do dashboard (que será substituída por gráficos no Sprint 3), e corrigir a ausência de data real no modal de confirmação de "marcar como realizado" no orçamento.

Nenhuma mudança altera modelos de dados persistidos. Nenhuma migração de IndexedDB é necessária.

---

## Contexto técnico compartilhado

- Stack: HTML5 + CSS3 + JS ES2020 + IndexedDB v5, sem frameworks, sem `type="module"`
- Arquivos principais afetados: `js/transactions.js`, `index.html`, `js/budget.js`
- Padrão de substituição em arquivo: sempre via `replace()` com verificação de `found` — nunca slice de bytes
- Verificação de sintaxe obrigatória após qualquer alteração em JS: `node --check js/<arquivo>.js`
- Template literals aninhados são proibidos — usar concatenação de strings em mobile
- JSON.stringify em atributos `onclick` é proibido — usar IDs e funções lookup
- Qualquer campo novo que use numpad deve chamar `clearFieldError` tanto no `oninput` quanto no `if(result!==null)` do numpad

---

## Mudança 2a — Simplificação do form de novo lançamento (TX)

### Contexto

O form de novo lançamento (`entryFormHtml` em `js/transactions.js`) oferece hoje três tipos: `income` (Receita), `fixed` (Despesa Fixa) e `variable` (Despesa Variável). Também expõe opções de recorrência/repetição e suporte a parcelamento (`area-parcela`).

O tipo `fixed` e a lógica de repetição mensal geram complexidade desnecessária para o caso de uso primário do app. Lançamentos existentes com `type:'fixed'` no IndexedDB continuam válidos e continuam sendo exibidos na listagem — apenas o form de criação muda.

### Escopo desta mudança

**Dentro do escopo:**
- Remover a `<option value="fixed">` do `<select id="f-type">` no form de novo lançamento
- Remover o bloco `<div id="area-recur">` e seu conteúdo (select de repetição + campo de quantidade)
- Remover o bloco `<div id="area-parcela">` e seu conteúdo (campos de parcela atual e total de parcelas)
- Remover a função `onRecurChange()` se não for usada em nenhum outro contexto
- Remover a lógica de `type === 'credit'` que controlava `area-recur` dentro de `onTypeChange()` — simplificar a função ao mínimo necessário para o que resta
- Remover os subitems com toggle de repeat (botão `⟳` e campo `.sub-repeat`) do form de TX — manter apenas nome e valor por subitem
- Remover a função `toggleSubitemRepeat` se exclusiva do form de TX

**Fora do escopo:**
- Nenhuma alteração no form de edição de lançamentos existentes que tenham `type:'fixed'`, `recurring:true` ou `groupId` — o form de edição (`showEditModal`) já lida com esses dados e deve continuar funcionando
- Nenhuma alteração em `budget.js` (budget tem seu próprio form de subitems)
- Nenhuma alteração nos dados persistidos no IndexedDB
- Nenhuma alteração na renderização de lançamentos (txCard) — lançamentos `fixed` continuam sendo exibidos corretamente
- Nenhuma remoção da aba "Fixas" na página de lançamentos (`page-tx`) — ela ainda filtra lançamentos existentes
- Nenhuma alteração na função `saveEntry` além de remover os branches de `credit` e `monthly` se tornarem inacessíveis

**Regra crítica — form de edição vs. form de novo:**  
`entryFormHtml(t=null)` é usado tanto para novo quanto para edição. O parâmetro `isEdit=!!t` distingue os dois casos. As remoções se aplicam apenas ao contexto de criação (`isEdit===false`). No contexto de edição, o `select#f-type` continua desabilitado quando `fromBudget` ou `fromCartao` estiver presente, e o `credit` continua sendo renderizado como opção especial. A remoção do `fixed` do seletor deve respeitar isso: se o item editado for `type:'fixed'`, o select deve ainda ser capaz de exibir esse valor (o mais simples é manter a option no seletor mas apenas escondê-la via CSS quando `!isEdit`, ou condicionar a renderização ao `isEdit`).

**Comportamento de subitems simplificado:**  
Subitems continuam existindo no form (nome + valor), mas sem o botão de repeat (`⟳`) e sem o campo de quantidade de repetição. `getRawSubitems()` e `getSubitems()` continuam funcionando — apenas a coluna do repeat some do grid. O `addSubitem()` usado no form de TX deve ser simplificado ou substituído por uma versão sem o campo repeat.

### User Stories

```
Como Diego ou Camila
Quero criar um lançamento financeiro com o mínimo de campos necessários
Para registrar receitas e despesas variáveis sem distrações
```

### Critérios de Aceite — Mudança 2a

```gherkin
Cenário: Form de novo lançamento exibe apenas os tipos necessários
  Dado que o usuário está na aba Lançamentos
  Quando ele toca em "+ Novo"
  Então o modal exibe apenas as opções "Receita" e "Despesa Variável" no seletor de tipo
  E a opção "Despesa Fixa" não está visível no seletor

Cenário: Form de novo lançamento não exibe seção de repetição
  Dado que o modal de novo lançamento está aberto
  Quando o usuário inspeciona o formulário
  Então não há seletor de repetição ("Apenas este período" / "Mensal — repetir N vezes")
  E não há campo de quantidade de repetições

Cenário: Form de novo lançamento não exibe seção de parcelamento
  Dado que o modal de novo lançamento está aberto
  Quando o usuário inspeciona o formulário
  Então não há campos de "Parcela atual" e "Total de parcelas"

Cenário: Subitem no form de novo lançamento aceita apenas nome e valor
  Dado que o usuário toca em "+ Subitem" no modal de novo lançamento
  Quando o subitem é adicionado
  Então o subitem exibe apenas os campos de nome e valor
  E o botão de repeat não está presente no subitem

Cenário: Salvar lançamento simples funciona sem os campos removidos
  Dado que o usuário preencheu descrição "Mercado" e valor "150"
  E selecionou tipo "Despesa Variável"
  Quando ele toca em "Salvar"
  Então o lançamento é criado com type:"variable"
  E aparece na listagem do mês corrente

Cenário: Salvar receita funciona sem os campos removidos
  Dado que o usuário preencheu descrição "Salário" e valor "5000"
  E selecionou tipo "Receita"
  Quando ele toca em "Salvar"
  Então o lançamento é criado com type:"income"
  E o saldo do dashboard é atualizado

Cenário: Lançamentos existentes com type "fixed" continuam aparecendo
  Dado que existem lançamentos com type:"fixed" no IndexedDB
  Quando o usuário navega para a aba Lançamentos
  Então esses lançamentos são exibidos normalmente na listagem
  E continuam aparecendo na aba "Fixas"

Cenário: Edição de lançamento existente com type "fixed" continua funcionando
  Dado que existe um lançamento com type:"fixed" no IndexedDB
  Quando o usuário toca em editar esse lançamento
  Então o modal de edição exibe o tipo "Despesa Fixa" corretamente
  E o usuário consegue salvar sem alterar o tipo
```

---

## Mudança 2b — Dashboard: remover seção "Últimos lançamentos"

### Contexto

O dashboard (`page-dash` em `index.html`) contém uma seção card com título "Últimos lançamentos" e um `<div id="recent-list">`. Essa seção é alimentada pela variável `recent` calculada em `renderDash()` dentro de `js/transactions.js`.

No Sprint 3, gráficos serão adicionados ao dashboard. A seção de últimos lançamentos será removida agora para liberar espaço e reduzir a quantidade de dados carregados no render do dashboard.

### Escopo desta mudança

**Dentro do escopo:**
- Remover do `index.html` o bloco `<div class="card">` que contém `section-header` com "Últimos lançamentos" e `<div id="recent-list">`
- Remover de `renderDash()` em `js/transactions.js` o cálculo da variável `recent` e o bloco que escreve em `document.getElementById('recent-list')`
- Remover o `enrichedRows` de `renderDash()` se a única razão de sua existência for alimentar `recent-list` — verificar se é usado em outro lugar dentro de `renderDash` antes de remover

**Fora do escopo:**
- Nenhuma alteração nos cards de resumo de saldo (receita/despesa/saldo/cartão em `#summary-cards`)
- Nenhuma alteração na barra de progresso (`#prog-area`)
- Nenhuma alteração no card de "Por responsável" (`#pessoa-summary-card`)
- Nenhuma alteração na barra de última atualização (`#last-update-bar`)
- Nenhuma alteração no filtro de pessoa (`#person-filter-bar-dash`)
- O espaço liberado fica vazio — será preenchido no Sprint 3

**Atenção:** `enrichedRows` em `renderDash()` monta os dados com `_pessoa` e subitems ativos. Verificar se ele é usado apenas para `recent` ou também para outro render. Se for exclusivo de `recent`, pode ser removido. Se for compartilhado (ex: `pessoa-summary`), manter apenas o que for necessário.

### User Stories

```
Como Diego ou Camila
Quero que o dashboard carregue mais rápido e com menos ruído visual
Para focar nos indicadores de saldo e comprometimento de renda
```

### Critérios de Aceite — Mudança 2b

```gherkin
Cenário: Dashboard não exibe seção de últimos lançamentos
  Dado que o usuário está na aba Dashboard (página inicial)
  Quando a página carrega
  Então a seção com título "Últimos lançamentos" não aparece
  E o elemento com id "recent-list" não está presente no DOM

Cenário: Cards de resumo continuam funcionando
  Dado que o usuário está na aba Dashboard
  Quando a página carrega
  Então os cards de Receitas, Despesas, Saldo e Cartão são exibidos corretamente
  E os valores refletem o mês selecionado

Cenário: Barra de comprometimento continua funcionando
  Dado que o usuário está na aba Dashboard
  Quando a página carrega
  Então a barra de comprometimento da renda é exibida com percentual e cor correta

Cenário: Card "Por responsável" continua funcionando quando há múltiplas pessoas
  Dado que existem dois ou mais responsáveis cadastrados
  E ambos têm lançamentos no mês
  Quando o usuário está no Dashboard
  Então o card "Por responsável" é exibido com saldo por pessoa

Cenário: Barra de última atualização continua funcionando
  Dado que o usuário está no Dashboard
  Quando a página carrega
  Então o label de última atualização e o botão "Marcar atualizado" são exibidos normalmente

Cenário: Filtro de pessoa no dashboard continua funcionando
  Dado que existem múltiplos responsáveis
  Quando o usuário filtra por um responsável no dashboard
  Então os cards de receita, despesa e saldo refletem apenas os lançamentos desse responsável
```

---

## Mudança 2c — Budget "marcar como realizado": adicionar campo de data

### Contexto

Quando o usuário marca um item de orçamento como realizado via `toggleBudgetDone(budgetId)`, o sistema abre um `showConfirm` com título "Marcar como realizado?" e uma mensagem genérica. Ao confirmar, chama `_toggleBudgetDoneInternal(budgetId)`, que cria uma transação no store `tx` com `date: dateStr` calculada a partir do `dueDay` e `dueMonthOffset` do item de orçamento.

Esse `dateStr` representa o vencimento previsto, não a data real em que o pagamento ocorreu. O usuário não tem como registrar a data real sem editar o lançamento depois.

**O que muda:** O modal de confirmação ganha um campo de data pré-preenchido com hoje (`todayISO()`). O usuário pode alterar. Ao confirmar, essa data é passada como `date` para a TX criada, em vez do `dateStr` calculado pelo vencimento.

**O que NÃO muda:** o `dateStr` baseado em `dueDay`/`dueMonthOffset` continua sendo calculado internamente — ele pode ser usado como fallback ou para outra finalidade. A data que vai para `tx.date` passa a ser a data informada pelo usuário no modal.

**Escopo restrito ao item de orçamento manual** (bloco "Normal manual budget items" dentro de `_toggleBudgetDoneInternal`). O bloco de `cartao_*` (fatura de cartão) não é afetado — esse fluxo usa `vencDate` calculado por `getFaturaVencimento` e tem semântica própria.

### Escopo desta mudança

**Dentro do escopo:**
- Modificar `toggleBudgetDone(budgetId)` para que o `showConfirm` de confirmação (ao marcar) inclua um campo `<input type="date">` pré-preenchido com `todayISO()`
- Capturar o valor desse campo no momento em que o usuário confirma
- Passar esse valor como `date` para o `dbAdd(...)` dentro de `_toggleBudgetDoneInternal` (apenas para itens não-cartão)
- A assinatura de `_toggleBudgetDoneInternal` pode precisar receber `dateOverride` como parâmetro, ou a lógica de captura pode ser inline no `action:` do confirm — escolher a abordagem que não quebre o bloco de cartão

**Fora do escopo:**
- Nenhuma alteração no fluxo de desmarcação (desmarcar não pede confirmação e não tem data)
- Nenhuma alteração no bloco de `cartao_*` dentro de `_toggleBudgetDoneInternal`
- Nenhuma alteração nos itens do orçamento em si (store `budget`)
- Nenhuma alteração no store `budgetDone`
- Nenhuma validação bloqueante — se o usuário apagar o campo de data e confirmar, salvar com string vazia (comportamento igual ao que já acontece em lançamentos sem data)

**Atenção técnica — showConfirm e campo de input:**  
`showConfirm(title, msg, buttons)` em `js/utils.js` renderiza HTML da `msg` diretamente como innerHTML. Um `<input type="date">` dentro da `msg` funciona. A captura do valor deve ocorrer dentro da função `action:` via `document.getElementById('done-date-input')?.value || ''`. O campo deve ter `id="done-date-input"`.

**Nota sobre todayISO():** A função `todayISO()` já existe em `js/transactions.js` (usada no form de TX). Pode ser chamada diretamente.

### User Stories

```
Como Diego ou Camila
Quero informar a data real em que um pagamento ocorreu ao marcar o item como realizado no orçamento
Para que o lançamento gerado reflita quando de fato a saída aconteceu, não apenas o vencimento previsto
```

### Critérios de Aceite — Mudança 2c

```gherkin
Cenário: Modal de confirmação exibe campo de data pré-preenchido com hoje
  Dado que existe um item de orçamento não marcado como realizado
  Quando o usuário toca no círculo de check desse item
  Então um modal de confirmação abre com o título "Marcar como realizado?"
  E o modal exibe um campo de data do tipo date
  E esse campo está pré-preenchido com a data de hoje no formato YYYY-MM-DD

Cenário: Confirmar com a data de hoje cria lançamento com data de hoje
  Dado que o modal de confirmação está aberto com a data de hoje no campo
  Quando o usuário não altera o campo e toca em "Confirmar"
  Então o lançamento gerado tem tx.date igual à data de hoje

Cenário: Alterar a data antes de confirmar salva a data escolhida
  Dado que o modal de confirmação está aberto com a data de hoje no campo
  Quando o usuário altera o campo para uma data diferente (ex: ontem)
  E toca em "Confirmar"
  Então o lançamento gerado tem tx.date igual à data escolhida pelo usuário

Cenário: Cancelar o modal não cria lançamento
  Dado que o modal de confirmação está aberto
  Quando o usuário toca em "Cancelar"
  Então nenhum lançamento é criado
  E o item permanece desmarcado no orçamento

Cenário: Desmarcação de item não exibe modal de data
  Dado que um item de orçamento já está marcado como realizado
  Quando o usuário toca no círculo de check desse item
  Então a marcação é desfeita diretamente sem exibir modal de confirmação
  E o lançamento associado é removido

Cenário: Itens de fatura de cartão não são afetados
  Dado que existe um item de cartão de crédito na tela de orçamento
  Quando o usuário marca o cartão como realizado
  Então o fluxo segue o comportamento original (sem campo de data adicional)
  E a fatura é lançada normalmente

Cenário: Campo de data vazio não bloqueia a confirmação
  Dado que o modal de confirmação está aberto
  Quando o usuário apaga o conteúdo do campo de data
  E toca em "Confirmar"
  Então o lançamento é criado com tx.date igual a string vazia
  E nenhum erro é exibido
```

---

## Definition of Done — Sprint 2 (unificado)

Uma mudança só está pronta quando **todos** os itens abaixo forem verdadeiros:

- [ ] Todos os critérios de aceite da mudança passam em validação manual no browser (Chrome mobile e desktop)
- [ ] `node --check js/transactions.js` passa sem erros
- [ ] `node --check js/budget.js` passa sem erros
- [ ] Nenhum `console.error` é disparado durante o fluxo testado
- [ ] Lançamentos existentes com `type:'fixed'` continuam aparecendo corretamente (regressão 2a)
- [ ] Cards de resumo e barra de progresso do dashboard continuam corretos (regressão 2b)
- [ ] O fluxo de fatura de cartão (`cartao_*`) no toggleBudgetDone continua funcionando (regressão 2c)
- [ ] Export e import de dados (v6) continuam funcionando após as mudanças
- [ ] Nenhuma mudança introduz template literal aninhado em JS
- [ ] Nenhuma mudança introduz `JSON.stringify` em atributo `onclick`
- [ ] QA validou e aprovou explicitamente cada mudança antes de marcar como done

---

## Restrições técnicas obrigatórias (extraídas do CONTEXT.md)

| Regra | Aplicação neste sprint |
|-------|----------------------|
| REGRA #1 — `getFormValues()` desestruturação | Se `saveEntry()` perder os branches de `credit` e `monthly`, a desestruturação deve continuar completa. Qualquer campo removido do form deve ter fallback na desestruturação para não quebrar a edição de registros antigos |
| REGRA #2 — `addSubitem()` assinatura | Se `addSubitem` for simplificado para TX, garantir que a versão usada no form de budget (`modal-b-subitems-area`) continue com a assinatura completa |
| REGRA #4 — IDs de subitems areas | `subitems-area` (TX) e `modal-b-subitems-area` (Budget) devem permanecer distintos e corretos |
| REGRA #5 — JSON.stringify em onclick proibido | Não introduzir em nenhuma das mudanças |
| REGRA #13 — Cache: transações diretas invalidam | A mudança 2c chama `dbAdd` via helper — cache é invalidado automaticamente. Nenhuma transação direta é introduzida |
| Template literals aninhados proibidos | A `msg` do `showConfirm` na mudança 2c deve usar concatenação de string, não template literal aninhado |
| Verificação de sintaxe | `node --check` obrigatório após qualquer edição em JS antes de considerar pronto |

---

## Dependências entre mudanças

As três mudanças são independentes entre si. Podem ser desenvolvidas e testadas em qualquer ordem ou em paralelo.

| Mudança | Arquivo principal | Arquivo secundário | Bloqueante para outra? |
|---------|------------------|-------------------|----------------------|
| 2a | `js/transactions.js` | `index.html` (se o form for inline) | Não |
| 2b | `index.html` + `js/transactions.js` | — | Não |
| 2c | `js/budget.js` | — | Não |

---

## Fora do escopo deste sprint (próximas iterações)

| Item | Sprint planejado |
|------|----------------|
| Gráficos no dashboard | Sprint 3 |
| Aba "Fixas" na página de lançamentos pode ser removida se não houver mais criação de `fixed` | A definir — depende de análise de dados existentes |
| OFX/QFX importer | Backlog futuro |
| Separação de `cards-render.js` | Backlog técnico |
