# Spec — Sprint 4b: Categorias Orçadas de Cartão

**Versão:** 1.0
**Data:** 2026-06-27
**Agente:** Product Owner
**Status:** Aprovada — pronta para Dev

---

## Objetivo

Permitir que o usuário defina categorias de gasto com valor orçado mensal (ex: "Gasolina R$ 300/mês"), vincule gastos avulsos de cartão a essas categorias e visualize realizado versus orçado na fatura. Em meses futuros sem gastos reais, a projeção usa o valor orçado da categoria como despesa prevista do cartão.

---

## Contexto técnico

### Estado atual do código

**`js/db.js`**
- `indexedDB.open('financas_pwa_v2', 5)` — versão 5 atual
- Stores existentes: `tx`, `budget`, `budgetDone`, `pessoas`, `cartoes`, `gastos`, `recorrentes`
- Padrão CRUD: `_cacheRead` / `_cacheWrite` / `invalidateCache` para cada store
- Todas as funções são globais no `window` (sem export/import)

**`js/cards-modal.js`**
- `showAddGastoModal(cartaoId, cartao, gasto=null)` — modal com campos: descrição, valor, data, parcelas, observações, subitens
- `saveGasto()` e `saveGastoEdit(id)` — persistem o objeto em `gastosAdd`/`gastosPut`
- O select de categoria precisará ser populado no `setTimeout` existente (linha ~207) para evitar nested template literals
- `showAddRecorrenteModal()` — padrão de referência para o modal de categoria: função de save atribuída via `setTimeout` ao botão primário (evita inline onclick com JSON)

**`js/cards-render.js`**
- `renderCards()` — itera sobre cartões, filtra gastos da fatura, monta HTML via concatenação de strings
- `gastosFatura` já está computado antes da montagem do HTML de cada card
- `getCartaoBudgetItems(targetMonth, targetYear)` — agrega gastos + recorrentes por cartão para projeção; retorna array com `_isCartao: true`
- Nenhuma dependência de framework — tudo em strings HTML concatenadas

### Decisões de arquitetura aprovadas pelo usuário

| Decisão | Detalhe |
|---------|---------|
| Categoria é global | Não vinculada a cartão específico — vale para todos os cartões |
| Gerenciamento no topo da aba Cartão | Seção fixa acima dos cards, com botão "+ Categoria" e lista de categorias |
| Gastos na fatura | Lista normal mostra todos os gastos; seção adicional abaixo exibe realizado/orçado por categoria |
| Projeção | Delta (`max(0, valorOrcado − realizado)`) somado silenciosamente ao total do cartão — sem linha nomeada na UI de projeção |
| Delta global na projeção | Calculado por categoria somando gastos de todos os cartões — aplicado ao item de cartão com maior realizado ou distribuído proporcionalmente — ver RN-007 |
| Categoria excluída | Gastos vinculados permanecem; `categoriaId` orphan tratado como `null` na renderização |

---

## Comportamento esperado

### Gerenciamento de categorias

- Seção fixa no topo da aba Cartão (acima dos cards de cartão), com título "Categorias Orçadas" e botão "+ Categoria"
- Cada categoria exibe: nome, valor orçado mensal, botões editar (✏️) e excluir (✕)
- Se não houver categorias, exibir texto auxiliar "Nenhuma categoria. Toque em + Categoria."
- Modal de criação/edição: campo Nome (obrigatório) + campo Valor Orçado Mensal (obrigatório, numérico positivo)
- Ao excluir: confirmação via `showConfirm()` antes de deletar
- Gastos vinculados a categoria excluída mantêm `categoriaId` no banco — tratado como null na renderização

### Vinculação de gasto a categoria

- Modal de criar/editar gasto ganha campo `<select>` "Categoria (opcional)" após o campo Observações
- Opção default: "— sem categoria —" (valor vazio)
- Opções restantes: lista de categorias ordenadas por nome
- Ao editar gasto com `categoriaId`, a opção correspondente é pré-selecionada
- Select populado programaticamente no `setTimeout` existente do modal (nunca via template literal)

### Na fatura do cartão

- Lista de gastos continua idêntica: exibe todos os gastos do período, com ou sem categoria
- Seção adicional "Por Categoria" aparece abaixo da lista de gastos, somente quando houver categorias com gastos vinculados naquele cartão/mês
- Por categoria: exibe nome, "Realizado: R$ X / Orçado: R$ Y" e barra de progresso simples
- Cor da barra e do valor realizado:
  - Verde (`var(--green)`): realizado <= 80% do orçado
  - Âmbar (`var(--amber)`): realizado entre 80% e 100% do orçado (inclusive)
  - Vermelho (`var(--red)`): realizado > orçado
- Categorias sem nenhum gasto vinculado no cartão/mês não aparecem nesta seção

### Na projeção

- `getCartaoBudgetItems()` calcula, por categoria, o delta = `max(0, valorOrcado − totalRealizadoGlobal)`
- `totalRealizadoGlobal` = soma de todos os gastos com `categoriaId` da categoria no mês alvo, em todos os cartões
- Se delta > 0: adicionar ao resultado do cartão com maior realizado da categoria (ou ao primeiro cartão se nenhum tiver gasto)
- Item adicional no array: `{ _isCategoria: true, _categoriaId: cat.id, name: cat.name, value: delta, ... }` — ver RN-007
- Sem alteração na UI de projeção: `projection.js` não é modificado

---

## Critérios de aceite (BDD)

### CA-01 — Criar categoria

```gherkin
Cenário: Usuário cria categoria com nome e valor orçado
  Dado que a aba Cartão está aberta
  E existe a seção "Categorias Orçadas" no topo
  Quando o usuário toca em "+ Categoria"
  Então o modal de categoria abre com campos Nome e Valor Orçado Mensal
  Quando o usuário preenche Nome = "Gasolina" e Valor = "300"
  E toca em "Salvar"
  Então a categoria "Gasolina" aparece na seção com "R$ 300,00/mês"
  E o modal é fechado

Cenário: Tentativa de salvar categoria sem nome
  Dado que o modal de categoria está aberto
  Quando o usuário deixa o campo Nome vazio e toca em "Salvar"
  Então uma mensagem de erro aparece no campo Nome
  E o modal permanece aberto

Cenário: Tentativa de salvar categoria com valor zero ou negativo
  Dado que o modal de categoria está aberto
  Quando o usuário informa Valor = "0" e toca em "Salvar"
  Então uma mensagem de erro aparece no campo Valor
  E o modal permanece aberto
```

### CA-02 — Editar categoria

```gherkin
Cenário: Usuário edita nome e valor de categoria existente
  Dado que existe a categoria "Gasolina" com orçado de R$ 300
  Quando o usuário toca em ✏️ na categoria "Gasolina"
  Então o modal abre com os valores atuais preenchidos
  Quando o usuário altera o valor para "350" e toca em "Salvar"
  Então a categoria exibe "R$ 350,00/mês"
  E gastos já lançados com essa categoria não são alterados
```

### CA-03 — Excluir categoria

```gherkin
Cenário: Usuário exclui categoria sem gastos vinculados
  Dado que existe a categoria "Mercado" sem gastos vinculados
  Quando o usuário toca em ✕ na categoria "Mercado"
  Então aparece uma caixa de confirmação
  Quando o usuário confirma
  Então a categoria "Mercado" desaparece da seção
  E nenhum dado de gasto é alterado

Cenário: Usuário exclui categoria com gastos vinculados
  Dado que existe a categoria "Gasolina" com 3 gastos vinculados no mês atual
  Quando o usuário exclui a categoria e confirma
  Então a categoria desaparece da seção de gerenciamento
  E os 3 gastos permanecem na fatura sem categoria (tratados como sem categoria)
  E a seção "Por Categoria" da fatura não exibe mais "Gasolina"

Cenário: Usuário cancela exclusão
  Dado que o diálogo de confirmação está aberto
  Quando o usuário toca em "Cancelar"
  Então a categoria permanece
  E nenhum dado é alterado
```

### CA-04 — Vincular gasto a categoria

```gherkin
Cenário: Usuário cria gasto vinculado a uma categoria
  Dado que existe a categoria "Gasolina"
  Quando o usuário abre o modal "+ Gasto" em qualquer cartão
  Então o campo "Categoria (opcional)" está disponível com a opção "— sem categoria —" selecionada
  E a opção "Gasolina" está disponível no select
  Quando o usuário seleciona "Gasolina", preenche os demais campos e salva
  Então o gasto é salvo com o categoriaId de "Gasolina"

Cenário: Gasto salvo sem categoria (default)
  Dado que o modal de gasto está aberto
  Quando o usuário não altera o select de categoria e salva
  Então o gasto é salvo com categoriaId = null

Cenário: Editar gasto e alterar categoria
  Dado que existe um gasto vinculado à categoria "Gasolina"
  Quando o usuário edita o gasto
  Então o select de categoria exibe "Gasolina" pré-selecionado
  Quando o usuário altera para "— sem categoria —" e salva
  Então o gasto passa a ter categoriaId = null

Cenário: Modal de gasto sem categorias cadastradas
  Dado que não há categorias cadastradas
  Quando o usuário abre o modal de gasto
  Então o campo "Categoria (opcional)" exibe apenas "— sem categoria —"
```

### CA-05 — Exibição na fatura

```gherkin
Cenário: Seção "Por Categoria" aparece quando há gastos vinculados
  Dado que o cartão "Nubank" tem 2 gastos vinculados à categoria "Gasolina" (R$ 80 + R$ 100)
  E a categoria "Gasolina" tem orçado de R$ 300
  Quando o usuário visualiza a fatura do mês atual do "Nubank"
  Então a seção "Por Categoria" aparece abaixo da lista de gastos
  E exibe "Gasolina — Realizado: R$ 180,00 / Orçado: R$ 300,00"
  E a barra de progresso está em verde (60% do orçado)

Cenário: Indicador âmbar quando realizado entre 80% e 100%
  Dado que a categoria "Gasolina" tem orçado de R$ 300
  E os gastos vinculados somam R$ 270 (90% do orçado)
  Quando o usuário visualiza a fatura
  Então a barra de progresso e o valor realizado são exibidos em âmbar

Cenário: Indicador vermelho quando realizado excede orçado
  Dado que a categoria "Gasolina" tem orçado de R$ 300
  E os gastos vinculados somam R$ 350 (117% do orçado)
  Quando o usuário visualiza a fatura
  Então a barra de progresso e o valor realizado são exibidos em vermelho

Cenário: Seção "Por Categoria" não aparece quando não há gastos vinculados
  Dado que nenhum gasto do cartão "Inter" tem categoria vinculada no mês atual
  Quando o usuário visualiza a fatura do "Inter"
  Então a seção "Por Categoria" não aparece
  E a lista de gastos normal continua inalterada

Cenário: Lista de gastos continua exibindo todos os gastos independentemente
  Dado que o cartão "Nubank" tem 3 gastos: 2 vinculados a "Gasolina" e 1 sem categoria
  Quando o usuário visualiza a fatura
  Então a lista de gastos exibe os 3 gastos normalmente
  E a seção "Por Categoria" exibe o resumo de "Gasolina" com os 2 gastos vinculados
```

### CA-06 — Projeção com delta de categoria

```gherkin
Cenário: Mês futuro sem gastos reais usa valor orçado na projeção
  Dado que a categoria "Gasolina" tem orçado de R$ 300
  E no mês seguinte não há gastos lançados com essa categoria
  Quando a projeção calcula o total do cartão para o mês seguinte
  Então R$ 300 é adicionado ao total de despesas do cartão (delta = 300 - 0)

Cenário: Mês com gastos parciais usa somente o delta restante
  Dado que a categoria "Gasolina" tem orçado de R$ 300
  E no mês seguinte já existe um gasto de R$ 180 vinculado a "Gasolina"
  Quando a projeção calcula o total
  Então R$ 120 é adicionado ao total (delta = 300 - 180)

Cenário: Mês com gastos iguais ou acima do orçado não duplica valor
  Dado que a categoria "Gasolina" tem orçado de R$ 300
  E no mês seguinte os gastos vinculados somam R$ 310
  Quando a projeção calcula o total
  Então nenhum valor adicional é somado (delta = max(0, 300 - 310) = 0)

Cenário: Delta é calculado globalmente (todos os cartões)
  Dado que a categoria "Gasolina" tem orçado de R$ 300
  E no mês seguinte há R$ 150 de gastos vinculados no "Nubank" e R$ 100 no "Inter"
  Quando a projeção calcula o total
  Então delta = max(0, 300 - 250) = R$ 50 adicionado uma única vez (não por cartão)
```

### CA-07 — Migração do IndexedDB

```gherkin
Cenário: Usuário com dados existentes (versão 5) abre o app após atualização
  Dado que o usuário tem dados nas stores existentes (tx, gastos, cartoes, etc.)
  Quando o app abre e o IndexedDB faz upgrade para versão 6
  Então a store "categoriasCartao" é criada vazia
  E todos os dados existentes em tx, gastos, cartoes, budget, pessoas, recorrentes, budgetDone permanecem intactos
  E o app carrega normalmente sem erros no console

Cenário: Gastos existentes sem categoriaId continuam funcionando
  Dado que existem gastos salvos sem o campo categoriaId
  Quando a fatura é renderizada
  Então os gastos sem categoriaId são tratados como "sem categoria"
  E a lista de gastos exibe normalmente
  E a seção "Por Categoria" não os inclui em nenhum agrupamento
```

---

## Requisitos não-funcionais (RN)

| ID | Regra | Exemplo / Detalhe |
|----|-------|-------------------|
| RN-001 | Nome de categoria é obrigatório e não pode ser vazio | Validação no modal antes de salvar |
| RN-002 | Valor orçado deve ser numérico, maior que zero | `parseFloat(val) > 0` — rejeitar zero e negativo |
| RN-003 | `categoriaId` em gastos é opcional (`number | null`) | Campo ausente equivale a `null` — retrocompatível |
| RN-004 | Editar valor orçado não afeta gastos já lançados | Apenas o campo `valorOrcado` da categoria muda |
| RN-005 | Excluir categoria não exclui gastos vinculados | Gastos ficam com `categoriaId` orphan; renderização trata como null |
| RN-006 | A barra de progresso não ultrapassa 100% visualmente | `width: min(100%, pct%)` via CSS/inline |
| RN-007 | Delta de projeção é calculado por categoria, globalmente (todos os cartões) | Um único delta por categoria por mês; adicionado ao item do cartão com maior realizado da categoria, ou ao primeiro cartão se nenhum tiver gasto |
| RN-008 | Delta de projeção nunca é negativo | `max(0, valorOrcado - totalRealizado)` |
| RN-009 | Seção "Por Categoria" na fatura só aparece se houver pelo menos uma categoria com gastos vinculados naquele cartão/mês | Não renderizar seção vazia |
| RN-010 | `categoriasCartao` não tem índice secundário | Volume pequeno; `getAll()` é suficiente |
| RN-011 | A store `categoriasCartao` é criada apenas no `onupgradeneeded` com guard `!d.objectStoreNames.contains(...)` | Padrão idêntico às stores existentes |

---

## Restrições técnicas obrigatórias

| Restrição | Detalhe |
|-----------|---------|
| Sem `export`/`import` | Todas as funções novas são globais no `window` |
| Sem `<script type="module">` | Escopo global padrão |
| Sem `JSON.stringify` em atributos `onclick` | Botões de editar/excluir categoria usam apenas o ID numérico: `onclick="editCategoria(3)"` |
| Sem nested template literals | Select de categoria populado programaticamente no `setTimeout`; seção de categoria na fatura via concatenação de strings |
| Select populado no setTimeout | O `setTimeout` existente em `showAddGastoModal` já é o ponto de extensão correto |
| onclick de Salvar do modal de categoria | Atribuído via `setTimeout` ao `document.querySelector('.btn-primary')`, seguindo o padrão de `showAddRecorrenteModal` |
| Bump de versão | `indexedDB.open('financas_pwa_v2', 6)` — testar upgrade com backup real antes de entregar |

---

## DoD (Definição de Pronto)

Uma story desta spec só está pronta quando:

- [ ] Todos os CAs acima passam (verificados manualmente pelo QA)
- [ ] `db.js` com versão 6 e store `categoriasCartao` criada no `onupgradeneeded`
- [ ] Funções `categoriasCartaoAll`, `categoriasCartaoAdd`, `categoriasCartaoPut`, `categoriasCartaoDel` implementadas e funcionando
- [ ] Modal de categoria (criar e editar) funciona sem erros de console
- [ ] Modal de gasto tem campo select de categoria funcional
- [ ] Fatura renderiza seção "Por Categoria" corretamente (incluindo cor de barra)
- [ ] Projeção soma delta de categoria sem duplicar valor já realizado
- [ ] Upgrade do IndexedDB testado com backup `G:\Meu Drive\financas_backup_20260626.json`
- [ ] Nenhuma violação das restrições técnicas (sem nested template literals, sem JSON.stringify em onclick)
- [ ] Nenhum erro ou warning novo no console após as alterações
- [ ] QA aprovou explicitamente — nenhum item crítico aberto

---

## Arquivos a modificar

| Arquivo | Natureza da mudança | Risco |
|---------|--------------------|----|
| `js/db.js` | Bump versão 5→6; criar store `categoriasCartao`; adicionar 4 funções CRUD | Médio — bump de versão aciona upgrade; testar com dados reais |
| `js/cards-modal.js` | Adicionar `showAddCategoriaModal`, `saveCategoriaModal`, `saveCategoriaEdit`, `deleteCategoria`; modificar `showAddGastoModal`, `saveGasto`, `saveGastoEdit` | Médio — modificação de funções com lógica complexa existente (parcelamento, subitens) |
| `js/cards-render.js` | Modificar `renderCards` para seção de gerenciamento no topo + seção "Por Categoria" na fatura; modificar `getCartaoBudgetItems` para delta de categoria | Alto — função mais crítica do módulo; impacta exibição de todos os cartões e projeção |
| `index.html` | Provavelmente nenhuma mudança necessária (scripts já carregados em ordem correta) | Baixo |

---

## Riscos que o Dev deve conhecer

| Risco | Probabilidade | Impacto | Ação esperada |
|-------|--------------|---------|---------------|
| Bump de versão do IndexedDB quebrar dados existentes | Baixa | Alto | Testar com backup real antes de entregar. Usar o JSON em `G:\Meu Drive\financas_backup_20260626.json` para restaurar e abrir o app |
| `renderCards` já produz HTML extenso — adicionar seção de gerenciamento no topo exige atenção ao encapsulamento | Média | Médio | A seção de gerenciamento fica fora do loop de cartões (antes do `for(const cartao of cartoes)`), em HTML separado injetado no mesmo `el` |
| Delta de categoria contabilizado mais de uma vez na projeção (por cartão) | Média | Médio | Garantir que o loop em `getCartaoBudgetItems` some o delta de cada categoria uma única vez, não por cartão que tem gastos |
| `categoriaId` orphan (referência a categoria excluída) causando erro de renderização | Baixa | Baixo | Sempre filtrar: `const cat = cats.find(c => c.id === g.categoriaId)` e tratar `undefined` como null antes de qualquer acesso a propriedade |
| Select de categoria no modal de gasto exibindo opções duplicadas ao reabrir o modal | Baixa | Baixo | Garantir que o `setTimeout` que popula o select não é chamado mais de uma vez; select começa vazio no HTML e é populado uma única vez |
| `saveGastoEdit` para gastos parcelados (groupId) usa `showConfirm` e retorna cedo — `categoriaId` precisa ser capturado antes do return | Média | Médio | Ler `categoriaId` do DOM antes do bloco `if(existing.groupId)` e passar para os dois branches de save |
