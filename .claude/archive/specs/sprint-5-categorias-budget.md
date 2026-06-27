# Spec — Sprint 5: Migração de Categorias para o Orçamento

**Versão:** 1.0
**Data:** 2026-06-27
**Status:** Pronta para implementação
**Agente:** Product Owner
**Plano base:** `.claude/discovery/plan-sprint5-categorias-budget.md`

---

## Contexto

O modelo da Sprint 4b cometeu um erro de design: categorias orçadas (ex: "Gasolina — R$300/mês") vivem na store `categoriasCartao`, acoplada ao módulo de cartões. Isso causa dois problemas concretos que o usuário já observou nos dados reais:

1. O delta (orçado - realizado) é injetado no valor do cartão errado em `getCartaoBudgetItems`, inflando artificialmente o total de fatura de cartões que podem não ter gasto algum naquela categoria.
2. TX avulsas (store `tx`) — gastos pagos em dinheiro, Pix ou débito — não podem ser vinculadas a uma categoria, tornando o controle de orçamento incompleto.

**Job-to-be-done:** "Quando gerencio meu orçamento mensal, quero ver quanto gastei em cada categoria de gasto — independente do meio de pagamento — para saber se estou dentro do que planejei."

**Métrica de sucesso:** após implementação, o usuário consegue criar um item de orçamento com categoriaKey, lançar gastos de cartão e TX avulsas vinculados a ele, e ver o realizado vs orçado corretamente na aba Orçamento — sem que o valor dos cartões no orçamento inclua delta artificial.

---

## Escopo

### Dentro desta sprint

- Campo `categoriaKey` no modal de criação/edição de item de budget (opcional)
- Barra de progresso realizado/orçado na aba Orçamento para itens com `categoriaKey`
- Função auxiliar `calcCategoriaRealizado(budgetId, month, year)` que agrega gastos e TX
- Select de categoria no modal de gasto de cartão passa a listar itens de budget com `categoriaKey`
- Select de categoria (opcional) no form de TX avulsa
- Remoção do bloco de delta de categoria em `getCartaoBudgetItems`
- Seção "Por Categoria" na fatura do cartão passa a ler de `budgetAll()` em vez de `categoriasCartaoAll()`
- Remoção da seção "Categorias Orçadas" (com botão "+ Categoria") da aba Cartão
- Tratamento de orphans silencioso: gastos com `categoriaId` antigo (de `categoriasCartao`) não quebram

### Fora desta sprint

- Migração automática de categorias antigas para itens de budget
- Relatório cross-mês por categoria
- Criação de categoria a partir do modal de gasto (atalho "criar nova")
- Filtro por categoria no dashboard

### Explicitamente fora do escopo

- Bump de versão do IndexedDB (não necessário — nenhuma store nova)
- Qualquer remoção de funções `categoriasCartaoAll/Add/Put/Del` do `db.js`
- Qualquer remoção da store `categoriasCartao` do IndexedDB

---

## Restrições técnicas obrigatórias

Estas restrições são inegociáveis e devem ser verificadas antes de qualquer entrega:

| Restrição | Motivo |
|-----------|--------|
| NUNCA usar `export`/`import` | Projeto sem bundler, ES2020 globals |
| NUNCA usar `<script type="module">` | Idem |
| NUNCA template literals aninhados (backtick dentro de backtick) | Causa SyntaxError em alguns browsers |
| NUNCA `JSON.stringify` em atributos `onclick` | Causa erros de parsing no HTML |
| `node --check js/[arquivo].js` obrigatório após qualquer edição | Detecta SyntaxError antes de abrir o browser |
| Sem bump de versão do IndexedDB | Não estamos criando nem deletando stores |
| `categoriaKey` é slug gerado automaticamente, não editável | Previne inconsistências de vínculo |

---

## Regras de negócio

| ID | Regra | Exemplo | Origem |
|----|-------|---------|--------|
| RN-01 | `categoriaKey` é gerado automaticamente a partir do nome do item de budget: lowercase, sem acento, espaço → underscore | "Gasolina" → `"gasolina"`, "Conta de Água" → `"conta_de_agua"` | Decisão de design |
| RN-02 | `categoriaKey` não tem validação de unicidade — é label humano, o vínculo real é pelo `id` do item de budget | Dois itens podem ter `categoriaKey: "gasolina"` | Decisão de produto |
| RN-03 | Um item de budget só exibe barra de progresso de realizado/orçado se tiver `categoriaKey` definido e não vazio | Item sem `categoriaKey` não exibe barra | Decisão de produto |
| RN-04 | `calcCategoriaRealizado(budgetId, month, year)` soma: gastos da store `gastos` com `categoriaId === budgetId` cuja fatura cai no mês alvo, mais TX da store `tx` com `categoriaId === budgetId` e `month === month, year === year` | Gastos de cartão usam `getFaturaMonth` para determinar o mês da fatura | Decisão técnica |
| RN-05 | Gastos com `categoriaId` apontando para IDs inexistentes no resultado de `budgetAll()` (orphans da Sprint 4b) são ignorados silenciosamente — sem erro, sem exibição | `categoriaId: 3` não existe no budget → ignora | Decisão de migração |
| RN-06 | O select de categoria no modal de gasto de cartão e no form de TX mostra apenas itens de `budgetAll()` com `categoriaKey` não vazio. Se não houver nenhum, exibe apenas "— Sem categoria —" | Budget vazio → select só com opção nula | Decisão de UX |
| RN-07 | `categoriaId` salvo no gasto ou TX continua sendo o `id` numérico do item de budget — não muda o campo, apenas a origem do dado | `{categoriaId: 42}` onde 42 é o id de um item de budget | Decisão técnica |
| RN-08 | A seção "Por Categoria" na fatura do cartão em `renderCards` lê o valor orçado de `budgetAll()` (campo `value` do item de budget com `id === categoriaId`), não de `categoriasCartao` | Lookup: `budgetItems.find(b => b.id === gasto.categoriaId)` | Decisão de migração |
| RN-09 | O bloco de delta de categoria em `getCartaoBudgetItems` (linhas ~331–378 de cards-render.js) deve ser completamente removido. A função retorna apenas totais reais de cada cartão | Remove loop sobre `allCatsProj` e toda lógica de `catGlobalTotals`/`delta` | Decisão técnica |
| RN-10 | `renderCards` não deve mais chamar `categoriasCartaoAll()` para renderizar a seção "Categorias Orçadas". A seção deve ser removida do HTML ou ter seu conteúdo esvaziado sem o botão "+ Categoria" | Ocultar `#categorias-cartao-section` ou renderizar string vazia | Decisão de produto |
| RN-11 | `saveEntry` e `updateEntry` em `transactions.js` devem incluir `categoriaId` (número ou null) no objeto salvo na store `tx` | `await dbAdd({..., categoriaId, ...})` | Decisão técnica |
| RN-12 | A barra de progresso de realizado/orçado usa a paleta de cores: verde quando < 80% do orçado, âmbar entre 80% e 100%, vermelho quando >= 100% | Mesma lógica da seção "Por Categoria" já existente | Decisão de UX |
| RN-13 | O select `#f-categoria` no form de TX é opcional: a opção padrão é "— Sem categoria —" (valor vazio → null no banco) | Usuário pode salvar TX sem categoria | Decisão de produto |

---

## Arquivos a modificar

| Arquivo | O que muda | Risco |
|---------|------------|-------|
| `js/budget.js` | (1) Modal ganha campo `categoriaKey`; (2) `saveBudgetItem` e `saveBudgetEdit` salvam `categoriaKey`; (3) `renderBudget` exibe barra de progresso para itens com `categoriaKey`; (4) nova função `calcCategoriaRealizado` | Médio — template literal complexo; usar concatenação de string |
| `js/cards-render.js` | (1) Remover bloco de delta (~linhas 331–378); (2) Seção "Por Categoria" lê de `budgetAll()`; (3) `renderCards` não chama `categoriasCartaoAll()` para renderizar categorias; (4) seção `#categorias-cartao-section` sem botão + Categoria | Médio — remover código é seguro se o escopo for preciso |
| `js/cards-modal.js` | Select `#cg-categoria` passa a chamar `budgetAll()` e filtrar `categoriaKey` em vez de `categoriasCartaoAll()` | Baixo — apenas a origem da lista muda |
| `js/transactions.js` | (1) `entryFormHtml` ganha select `#f-categoria`; (2) `getFormValues` captura `categoriaId`; (3) `saveEntry`/`updateEntry` incluem `categoriaId` no objeto salvo | Médio — não usar template literal aninhado |
| `js/db.js` | Nenhuma mudança | Nenhum |
| `index.html` | Remover ou esvaziar `#categorias-cartao-section` (ou manter o `<div>` vazio sem o botão, para `renderCards` não quebrar se ainda referenciar o elemento) | Baixo |

---

## User Stories

### Story 1 — Campo categoriaKey no item de orçamento

```
Como usuário
Quero poder marcar um item de orçamento como "categoria orçada" ao criá-lo ou editá-lo
Para vincular gastos a esse item e acompanhar realizado vs orçado
```

**Critérios de aceite:**

```gherkin
Cenário: Criar item de budget com categoriaKey
  Dado que estou no modal "Novo item do orçamento"
  Quando preencho o nome "Gasolina" e marco como categoria orçada
  Então o sistema gera automaticamente categoriaKey "gasolina"
  E salva o item de budget com o campo categoriaKey preenchido
  E o item aparece na aba Orçamento com barra de progresso (realizado: R$ 0,00 / orçado: valor do item)

Cenário: Criar item de budget sem marcar como categoria
  Dado que estou no modal "Novo item do orçamento"
  Quando preencho o nome e não marco como categoria orçada
  Então o item é salvo sem categoriaKey
  E não exibe barra de progresso na aba Orçamento

Cenário: Editar item de budget para adicionar categoriaKey
  Dado que tenho um item de budget sem categoriaKey
  Quando abro o modal de edição e marco como categoria orçada
  Então categoriaKey é gerado e salvo no item existente
  E a barra de progresso passa a aparecer para esse item

Cenário: Geração do slug categoriaKey
  Dado que o nome do item é "Conta de Água"
  Quando marco como categoria orçada
  Então categoriaKey gerado é "conta_de_agua"

Cenário: categoriaKey com acento
  Dado que o nome do item é "Alimentação"
  Quando marco como categoria orçada
  Então categoriaKey gerado é "alimentacao" (sem acento)
```

**Regras associadas:** RN-01, RN-02, RN-03

---

### Story 2 — Barra de progresso realizado/orçado na aba Orçamento

```
Como usuário
Quero ver na aba Orçamento quanto já gastei em cada categoria orçada no mês
Para saber se estou dentro do limite planejado
```

**Critérios de aceite:**

```gherkin
Cenário: Item com categoriaKey exibe progresso
  Dado que tenho um item de budget "Gasolina" (R$ 300,00) com categoriaKey
  E tenho um gasto de cartão de R$ 120,00 vinculado a esse item (categoriaId = id do item)
  E tenho uma TX avulsa de R$ 80,00 vinculada ao mesmo item
  Quando abro a aba Orçamento no mês correto
  Então o item "Gasolina" exibe barra de progresso com realizado R$ 200,00 / orçado R$ 300,00
  E a barra tem cor verde (< 80%)

Cenário: Realizado entre 80% e 100%
  Dado que tenho item de budget (R$ 300,00) com realizado R$ 255,00 (85%)
  Quando abro a aba Orçamento
  Então a barra exibe cor âmbar

Cenário: Realizado >= 100%
  Dado que tenho item de budget (R$ 300,00) com realizado R$ 320,00 (> 100%)
  Quando abro a aba Orçamento
  Então a barra exibe cor vermelha
  E o percentual exibido é limitado a 100% na barra (não ultrapassa a largura do container)

Cenário: Nenhum gasto vinculado
  Dado que tenho item de budget com categoriaKey mas sem gastos vinculados no mês
  Quando abro a aba Orçamento
  Então a barra exibe realizado R$ 0,00 / orçado [valor do item]
  E a barra tem largura 0% (cor verde)

Cenário: Gastos de mês diferente não contam
  Dado que tenho um gasto de cartão com data cujo mês de fatura é diferente do mês atual
  Quando visualizo o mês atual na aba Orçamento
  Então esse gasto não entra no realizado da categoria

Cenário: Orphan ignorado silenciosamente
  Dado que tenho gastos com categoriaId apontando para IDs da store categoriasCartao (Sprint 4b)
  Quando abro a aba Orçamento
  Então esses gastos não aparecem no realizado de nenhuma categoria
  E não há erro ou toast de falha
```

**Regras associadas:** RN-03, RN-04, RN-05, RN-12

---

### Story 3 — Select de categoria no modal de gasto de cartão lê budget

```
Como usuário
Quero selecionar uma categoria ao lançar um gasto de cartão, escolhendo entre os itens de orçamento que marquei como categoria
Para que o gasto seja contabilizado corretamente no progresso da aba Orçamento
```

**Critérios de aceite:**

```gherkin
Cenário: Select populado com itens de budget
  Dado que tenho itens de budget com categoriaKey (ex: "Gasolina", "Mercado")
  Quando abro o modal de novo gasto de cartão
  Então o select de categoria exibe "— Sem categoria —" como opção padrão
  E lista os itens de budget com categoriaKey em ordem alfabética pelo nome

Cenário: Nenhum item de budget com categoriaKey
  Dado que não tenho nenhum item de budget com categoriaKey definido
  Quando abro o modal de novo gasto de cartão
  Então o select de categoria exibe apenas "— Sem categoria —"
  E não há erro

Cenário: Editar gasto com categoria existente
  Dado que tenho um gasto de cartão com categoriaId = 42 (id de um item de budget)
  Quando abro o modal de edição do gasto
  Então o select de categoria tem o item correspondente pré-selecionado

Cenário: Editar gasto com categoriaId orphan (Sprint 4b)
  Dado que tenho um gasto com categoriaId apontando para id que não existe no budget
  Quando abro o modal de edição do gasto
  Então o select exibe "— Sem categoria —" selecionado (orphan ignorado silenciosamente)
  E não há erro
```

**Regras associadas:** RN-05, RN-06, RN-07

---

### Story 4 — Select de categoria no form de TX avulsa

```
Como usuário
Quero poder vincular um lançamento avulso (dinheiro, Pix, débito) a uma categoria orçada
Para que gastos fora do cartão também sejam contabilizados no progresso do orçamento
```

**Critérios de aceite:**

```gherkin
Cenário: Form de TX com select de categoria
  Dado que estou no modal "Novo lançamento"
  Quando o form é renderizado
  Então existe um select "Categoria" (opcional) após o campo Observações
  E o select lista itens de budget com categoriaKey em ordem alfabética

Cenário: Salvar TX sem categoria
  Dado que preencho o form de TX sem selecionar categoria
  Quando salvo
  Então a TX é salva com categoriaId null
  E nenhum erro é exibido

Cenário: Salvar TX com categoria selecionada
  Dado que preencho o form de TX e seleciono "Gasolina" (id 42)
  Quando salvo
  Então a TX é salva com categoriaId: 42
  E o realizado da categoria "Gasolina" na aba Orçamento aumenta pelo valor da TX

Cenário: Editar TX com categoria existente
  Dado que tenho uma TX com categoriaId definido
  Quando abro o modal de edição
  Então o select de categoria tem o item correspondente pré-selecionado

Cenário: TX avulsa de tipo "income" (receita)
  Dado que estou criando uma TX do tipo Receita
  Quando o form é renderizado
  Então o select de categoria é exibido normalmente (sem restrição por tipo)
  E a seleção é opcional
```

**Regras associadas:** RN-06, RN-07, RN-11, RN-13

---

### Story 5 — Seção "Por Categoria" na fatura lê budget

```
Como usuário
Quero que a seção "Por Categoria" dentro da fatura do cartão exiba o valor orçado correto
Para comparar com o realizado sem depender da store antiga
```

**Critérios de aceite:**

```gherkin
Cenário: Fatura com gastos categorizados
  Dado que tenho um cartão com gastos vinculados a categorias de budget
  Quando abro a aba Cartão
  Então a seção "Por Categoria" exibe cada categoria com realizado e orçado (do budget)
  E a barra de progresso usa verde/âmbar/vermelho conforme percentual

Cenário: Orphan ignorado na fatura
  Dado que tenho gastos com categoriaId apontando para IDs inexistentes no budget
  Quando abro a aba Cartão
  Então esses gastos não aparecem na seção "Por Categoria"
  E não há erro

Cenário: Fatura sem gastos categorizados
  Dado que tenho uma fatura onde nenhum gasto tem categoriaId preenchido
  Quando abro a aba Cartão
  Então a seção "Por Categoria" não é exibida
```

**Regras associadas:** RN-05, RN-08, RN-12

---

### Story 6 — Remoção do delta artificial em getCartaoBudgetItems

```
Como usuário
Quero que o valor da fatura de cada cartão na aba Orçamento reflita apenas os gastos reais
Para que o total não seja inflado por delta de categoria que pode não ter relação com aquele cartão
```

**Critérios de aceite:**

```gherkin
Cenário: Valor do cartão no budget sem delta
  Dado que tenho um cartão Nubank com R$ 200,00 de gastos reais na fatura
  E tenho uma categoria orçada "Gasolina" (R$ 300,00) sem nenhum gasto nesse cartão
  Quando abro a aba Orçamento
  Então o item de fatura do Nubank exibe R$ 200,00
  E não exibe R$ 500,00 (200 + delta artificial de 300)

Cenário: Projeção não é afetada negativamente
  Dado que removi o delta de getCartaoBudgetItems
  Quando abro a aba Projeção
  Então os valores projetados para cada mês não incluem delta artificial de categoria
  E não há erro ou crash na renderização da projeção
```

**Regras associadas:** RN-09

**Nota técnica crítica:** A função `renderProj` em `projection.js` chama `getCartaoBudgetItems(pm, py)` e usa apenas `citem.value` para somar à despesa projetada. Após a remoção do delta, `citem.value` passará a refletir apenas gastos reais dos cartões — o que é o comportamento correto. Nenhuma alteração em `projection.js` é necessária.

---

### Story 7 — Remoção da seção "Categorias Orçadas" da aba Cartão

```
Como usuário
Quero que o gerenciamento de categorias orçadas seja feito exclusivamente pela aba Orçamento
Para não ter duas interfaces conflitantes gerenciando o mesmo conceito
```

**Critérios de aceite:**

```gherkin
Cenário: Seção de categorias removida da aba Cartão
  Dado que estou na aba Cartão
  Quando a página carrega
  Então não há botão "+ Categoria" visível
  E não há listagem de categorias orçadas nesta aba
  E o restante da aba (listagem de cartões, faturas, gastos) funciona normalmente

Cenário: renderCards não quebra por ausência de categoriasCartaoAll
  Dado que renderCards não chama mais categoriasCartaoAll para renderizar a seção
  Quando a aba Cartão carrega com a store categoriasCartao vazia
  Então não há erro, não há toast de falha
```

**Regras associadas:** RN-10

---

## Detalhamento técnico por arquivo

### budget.js

**Novo campo no modal `showBudgetAddModal`:**

O campo deve ser adicionado após o campo Observações, antes do campo "Atrasado/Pendente":

```
Label: "Categoria orçada (opcional)"
Hint: "Marque se este item representa uma categoria de gastos. O slug é gerado automaticamente."
Toggle (checkbox): "Usar como categoria orçada"
Ao marcar: gera categoriaKey a partir do nome preenchido
Display do slug gerado (somente leitura)
```

Geração do slug (função auxiliar `slugify`):
- `str.toLowerCase()`
- Remover acentos via `.normalize('NFD').replace(/[̀-ͯ]/g, '')`
- Substituir espaços e caracteres não alfanuméricos por `_`
- Remover `_` duplicados e nos extremos

**Nova função auxiliar `calcCategoriaRealizado(budgetId, month, year)`:**
- `async function calcCategoriaRealizado(budgetId, month, year)`
- Lê `gastosAll()` e `dbAll()` (TX avulsas)
- Para gastos: filtra `g.categoriaId === budgetId`, calcula `getFaturaMonth(g.date, cartao)`, verifica se cai no mês alvo usando `gastoValueForFatura`
- Para TX: filtra `t.categoriaId === budgetId && t.month === month && t.year === year`
- Retorna soma total (number)
- Orphans (IDs não encontrados nos gastos) são simplesmente não somados — sem erro

**Atualização de `renderBudget`:**

Para cada item com `item.categoriaKey`:
1. Chamar `calcCategoriaRealizado(item.id, curMonth, curYear)`
2. Calcular percentual `realizado / item.value * 100`
3. Determinar cor da barra: `< 80` → verde, `>= 80 && < 100` → âmbar, `>= 100` → vermelho
4. Renderizar bloco de barra abaixo dos subitems do item (usando concatenação de string, não template literal aninhado)

**Atualização de `saveBudgetItem` e `saveBudgetEdit`:**

Capturar `categoriaKey` do toggle/campo do modal e incluir no objeto salvo:
- `categoriaKey: categoriaKey || null`
- Em `saveBudgetEdit`: preservar `categoriaKey` existente se toggle não foi alterado, ou atualizar se foi

---

### cards-render.js

**Remoção do bloco de delta:**

Remover completamente o bloco iniciando em:
```javascript
// Delta de projeção por categoria — calculado globalmente (todos os cartões)
const allCatsProj = await categoriasCartaoAll();
```
até o final da função `getCartaoBudgetItems`, mantendo apenas o `return result.filter(r=>r.value>0);`

**Alteração na seção "Por Categoria" em `renderCards`:**

Substituir a leitura de `cats` (de `categoriasCartaoAll()`) por `budgetAll()` filtrado por itens com `categoriaKey`. O lookup do orçado passa de `catItem.valorOrcado` para `budgetItem.value`.

**Alteração em `renderCards` — seção de categorias:**

A variável `cats` (resultado de `categoriasCartaoAll()`) e o bloco que renderiza `catsSection` devem ser removidos. O elemento `#categorias-cartao-section` pode permanecer no HTML como `<div id="categorias-cartao-section"></div>` vazio, ou ter seu conteúdo definido como string vazia em `renderCards`.

---

### cards-modal.js

**Alteração em `showAddGastoModal` — populate do select `#cg-categoria`:**

Substituir a chamada `categoriasCartaoAll().then(...)` por `budgetAll().then(function(budgets){`:
- Filtrar: `budgets.filter(function(b){ return b.categoriaKey; })`
- Ordenar por nome
- Gerar options com `value = b.id` e `text = b.name`
- Pré-selecionar se `isEdit && gasto.categoriaId === b.id`

A lógica de detecção de orphan ao pré-selecionar: se `gasto.categoriaId` não existe nos itens filtrados, nenhum item fica selecionado (option padrão "— Sem categoria —" prevalece).

---

### transactions.js

**Alteração em `entryFormHtml`:**

Adicionar após o bloco de Observações (`<div class="form-group">` com `f-obs`), antes do `btn-row`:

```html
<div class="form-group">
  <label>Categoria <span class="label-muted">(opcional)</span></label>
  <select id="f-categoria"></select>
</div>
```

O select começa vazio e é populado no `setTimeout` de `showAddModal`/`showEditModal` via `budgetAll()`.

**Alteração em `showAddModal` e `showEditModal`:**

No `setTimeout` de inicialização, adicionar chamada para popular `#f-categoria`:
- `budgetAll()` filtrado por `categoriaKey`
- Pré-selecionar se `t.categoriaId` existe

**Alteração em `getFormValues`:**

Adicionar captura:
```javascript
const categoriaId = parseInt(document.getElementById('f-categoria')?.value) || null;
```
Retornar `categoriaId` no objeto.

**Alteração em `saveEntry`:**

Incluir `categoriaId` no objeto passado para `dbAdd`. Ambos os paths (com e sem `subRepeatStart`) devem incluir o campo.

**Alteração em `updateEntry`:**

Incluir `categoriaId` no objeto passado para `dbPut`. Todos os paths (série, apenas este, etc.) devem incluir o campo.

---

## Checklist de cenários obrigatórios

- [x] Happy path: criar categoria, lançar gasto + TX, ver barra na aba Orçamento
- [x] Dados inválidos: select vazio (nenhum item com categoriaKey) — sem erro
- [x] Orphans (categoriaId de Sprint 4b): ignorados silenciosamente em todos os contextos
- [x] Estado inesperado: store `categoriasCartao` vazia ou com dados — não afeta o fluxo novo
- [x] Ação duplicada: salvar item de budget com mesmo categoriaKey que outro — permitido (sem validação de unicidade)
- [x] Projeção não quebra após remoção do delta
- [x] `node --check` em todos os arquivos modificados

---

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Gastos antigos com `categoriaId` de `categoriasCartao` causam erro no lookup | Alta — usuário tem dados reais da Sprint 4b | Médio | Tratar orphans: se `budgetItem.find(b => b.id === categoriaId)` retorna `undefined`, ignorar o gasto naquele contexto |
| Template literals aninhados ao adicionar barra de progresso no `renderBudget` | Média — código já tem strings complexas | Baixo | Usar concatenação de string (`+`) para o bloco da barra, seguindo o padrão de `renderCards` |
| `getCartaoBudgetItems` sem delta afeta projeção negativamente | Baixa — `projection.js` usa apenas `citem.value` sem depender do delta | Médio | Verificado: `renderProj` lê `citem.value` diretamente; sem delta, o valor é menor e mais correto |
| Select de categoria vazio (nenhum item de budget com `categoriaKey`) | Alta — usuário ainda não tem itens com o campo novo | Baixo | Select exibe apenas "— Sem categoria —", sem erro, sem crash |
| `calcCategoriaRealizado` faz await em `gastosAll()` e `dbAll()` dentro do loop de `renderBudget` | Média — pode haver N itens com categoriaKey | Baixo | Chamar `gastosAll()` e `dbAll()` uma vez antes do loop e passar o resultado para `calcCategoriaRealizado` como parâmetro, evitando múltiplos round-trips ao cache |
| `cartoesAll()` não disponível em `calcCategoriaRealizado` para calcular `getFaturaMonth` | Baixa — `cartoesAll()` é global | Baixo | Chamar `cartoesAll()` uma vez no escopo de `renderBudget` e passar para a função auxiliar |

---

## Definição de Pronto (DoD)

Uma story desta sprint está pronta quando **todos** os itens abaixo são verdadeiros:

- [ ] Código implementado conforme esta spec
- [ ] `node --check js/budget.js` sem erros
- [ ] `node --check js/cards-render.js` sem erros
- [ ] `node --check js/cards-modal.js` sem erros
- [ ] `node --check js/transactions.js` sem erros
- [ ] Smoke test manual completo no browser (ver abaixo)
- [ ] Confirmação explícita do usuário antes de commit

**Smoke test manual obrigatório (sequência):**

1. Abrir o app no browser
2. Aba Orçamento → criar novo item com nome "Gasolina" e marcar como categoria orçada → confirmar que slug "gasolina" aparece e item é salvo
3. Aba Cartão → modal de novo gasto → confirmar que select de categoria lista "Gasolina" → selecionar e salvar gasto
4. Aba Lançamentos → novo lançamento → confirmar que select de categoria lista "Gasolina" → selecionar e salvar TX
5. Aba Orçamento → confirmar que item "Gasolina" exibe barra de progresso com realizado = gasto + TX
6. Aba Cartão → confirmar que seção "Por Categoria" na fatura exibe "Gasolina" com o valor correto
7. Aba Orçamento → confirmar que o valor da fatura do cartão não inclui delta artificial
8. Aba Projeção → confirmar que os valores projetados não apresentam crash ou valores absurdos
9. Abrir DevTools → aba Console → confirmar que não há erros JavaScript em nenhuma das ações acima
10. Dados antigos: se houver gastos com `categoriaId` apontando para IDs da store antiga, confirmar que não aparecem erros e que a aba Orçamento/Cartão carrega normalmente

---

## Definição de Pronto para Entrar em Implementação (DoR)

- [x] Contexto claro: problema e solução descritos
- [x] User stories no formato correto
- [x] Critérios de aceite escritos em Given/When/Then
- [x] Regras de negócio explícitas e sem interpretação livre
- [x] Escopo MVP separado do escopo futuro
- [x] Dependências identificadas (nenhuma externa bloqueante)
- [x] Restrições técnicas documentadas
- [x] Riscos identificados com mitigação
- [x] Arquivos a modificar mapeados com escopo preciso
- [x] Plano aprovado pelo usuário (base desta spec)

---

## Ordem de implementação recomendada

1. **Fase 1 — `budget.js`** — mais isolada, menor risco de regressão
   - Função `slugify`
   - Campo `categoriaKey` no modal
   - Função `calcCategoriaRealizado`
   - Barra de progresso no `renderBudget`
   - `saveBudgetItem` e `saveBudgetEdit` salvam `categoriaKey`
   - `node --check` + smoke test parcial

2. **Fase 2 — `cards-render.js`**
   - Remover bloco de delta de `getCartaoBudgetItems`
   - Seção "Por Categoria" lê `budgetAll()`
   - `renderCards` sem `categoriasCartaoAll()` para categorias
   - `node --check` + smoke test parcial

3. **Fase 3 — `cards-modal.js`**
   - Select `#cg-categoria` passa a usar `budgetAll()`
   - `node --check`

4. **Fase 4 — `transactions.js`**
   - Select `#f-categoria` no form de TX
   - `getFormValues`, `saveEntry`, `updateEntry`
   - `node --check`

5. **Fase 5 — Validação final**
   - Smoke test completo (todos os 10 passos)
   - Confirmação do usuário
   - Commit
