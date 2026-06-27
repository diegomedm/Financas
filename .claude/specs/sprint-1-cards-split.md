# Sprint 1 — Split de cards.js

**Criado em:** 2026-06-26
**Agente:** Product Owner
**Status:** Aguardando implementação

---

## 1. Objetivo do Sprint

Dividir o arquivo `js/cards.js` (1.030 linhas, ~48 KB) em dois arquivos com responsabilidades distintas, eliminando o acúmulo de responsabilidades em um único módulo sem alterar nenhum comportamento observável pelo usuário.

Este sprint é uma refatoração estrutural pura. Nenhuma funcionalidade nova será adicionada. Nenhum comportamento existente será alterado.

**Resultado esperado ao final do sprint:**
- `js/cards.js` deixa de existir
- `js/cards-modal.js` contém toda a lógica de modais e formulários
- `js/cards-render.js` contém toda a lógica de render de página
- `index.html` referencia os dois novos arquivos no lugar do antigo
- `sw.js` atualiza o cache para versão `financas-v4` com os dois novos arquivos
- A aplicação funciona de forma idêntica ao estado anterior

---

## 2. Escopo

### Dentro do escopo

- Mover para `js/cards-modal.js`:
  - Constantes compartilhadas: `CARD_COLORS`, `CARD_COLOR_NAMES`
  - Funções de cálculo de fatura usadas pelos modais: `getFaturaMonth`, `getFaturaVencimento`, `getCurrentFatura`
  - Modal de cartão: `showAddCartaoModal`, `saveCartao`, `saveCartaoEdit`, `deleteCartao`, `editCartao`
  - Modal de gasto: `showAddGastoModal`, `saveGasto`, `saveGastoEdit`, `deleteGasto`, `editGasto`
  - Auxiliares do modal de gasto: `updateFaturaPreview`, `openGastoNumpad`, `onCgValInput`, `getGastoVal`, `toggleGastoParcela`, `addGastoSubitem`, `toggleGastoSubitemRepeat`, `removeGastoSubitem`, `updateGastoSubtotal`, `getRawGastoSubitems`
  - Modal de recorrente: `showAddRecorrenteModal`, `addCrSubitem`, `updateCrSubtotal`, `getCrSubitems`, `saveRecorrente`, `saveRecorrenteEdit`, `editRecorrente`, `deleteRecorrente`

- Mover para `js/cards-render.js`:
  - Funções de cálculo para render: `gastoValueForFatura`, `calcLimiteUsado`, `getCartaoFaturaGastos`, `getCartaoFaturaTotal`
  - Render principal: `renderCards`
  - Integração com orçamento: `refreshBudgetCartoes`, `getCartaoBudgetItems`

- Atualizar `index.html`:
  - Substituir `<script src="js/cards.js">` por dois scripts na ordem:
    1. `<script src="js/cards-modal.js">`
    2. `<script src="js/cards-render.js">`
  - Manter a posição original (entre `js/pessoas.js` e `js/transactions.js`)

- Atualizar `sw.js`:
  - Remover `js/cards.js` do array `urlsToCache`
  - Adicionar `js/cards-modal.js` e `js/cards-render.js` no lugar
  - Fazer bump da constante de cache: `'financas-v3'` para `'financas-v4'`

- Remover `js/cards.js` após a validação dos dois novos arquivos

### Fora do escopo

- Qualquer alteração de comportamento, lógica de negócio ou UX
- Criação de módulos ES (`export`/`import`) ou qualquer mudança para sistema de módulos
- Refatoração interna das funções (renomear, reescrever, otimizar)
- Divisão em mais de dois arquivos
- Alteração de outros arquivos JS que não sejam `index.html` e `sw.js`
- Correção de bugs existentes (se encontrados, registrar em `.claude/debt/backlog.md` separadamente)

---

## 3. Critérios de Aceite

### CA-01 — Listagem de cartões renderiza corretamente

```gherkin
Cenário: Página de cartões carrega com dados existentes
  Dado que o usuário tem cartões cadastrados no IndexedDB
  E a aplicação é carregada com os novos arquivos cards-modal.js e cards-render.js
  Quando o usuário navega para a aba "Cartões"
  Então a lista de cartões é exibida com nome, cor, dia de fechamento e vencimento
  E o total de gastos da fatura corrente é exibido para cada cartão
  E a barra de limite (quando configurada) é exibida com percentual e cor corretos
```

### CA-02 — Modal de criação de cartão funciona

```gherkin
Cenário: Usuário cria um novo cartão
  Dado que o usuário está na aba "Cartões"
  Quando o usuário toca em "+ Cartão"
  Então o modal de novo cartão abre com os campos: nome, fechamento, vencimento, limite, responsável e cor
  Quando o usuário preenche nome "Nubank", fechamento 15, vencimento 22, e toca em "Salvar"
  Então o cartão é persistido no IndexedDB
  E o modal fecha
  E a lista de cartões é atualizada exibindo o novo cartão
```

```gherkin
Cenário: Usuário tenta salvar cartão com campos obrigatórios em branco
  Dado que o modal de novo cartão está aberto
  Quando o usuário toca em "Salvar" sem preencher o nome
  Então uma mensagem de erro é exibida no campo nome: "Informe o nome"
  E o cartão não é salvo
```

```gherkin
Cenário: Usuário tenta salvar cartão com dia de fechamento inválido
  Dado que o modal de novo cartão está aberto
  Quando o usuário informa um dia de fechamento fora do intervalo 1-31
  E toca em "Salvar"
  Então uma mensagem de erro é exibida no campo fechamento: "Dia inválido (1-31)"
  E o cartão não é salvo
```

### CA-03 — Modal de edição de cartão funciona

```gherkin
Cenário: Usuário edita um cartão existente
  Dado que existe um cartão cadastrado
  Quando o usuário toca no ícone de edição do cartão
  Então o modal abre pré-preenchido com os dados atuais do cartão
  Quando o usuário altera o nome e toca em "Salvar"
  Então o cartão é atualizado no IndexedDB
  E a lista de cartões reflete a alteração
```

### CA-04 — Exclusão de cartão funciona

```gherkin
Cenário: Usuário exclui um cartão
  Dado que existe um cartão com gastos associados
  Quando o usuário toca no botão de exclusão do cartão
  Então uma confirmação é solicitada
  Quando o usuário confirma
  Então o cartão é removido do IndexedDB
  E todos os gastos e recorrências associados ao cartão são removidos
  E a lista de cartões é atualizada
```

### CA-05 — Modal de gasto funciona

```gherkin
Cenário: Usuário adiciona um gasto a um cartão
  Dado que existe um cartão cadastrado
  E o usuário está na aba "Cartões"
  Quando o usuário toca em "+ Gasto" no cartão
  Então o modal de novo gasto abre com campos: descrição, valor, data, parcelas, observações e subitens
  Quando o usuário preenche descrição "Supermercado", valor "150,00", e toca em "Salvar"
  Então o gasto é persistido no IndexedDB com o cartaoId correto
  E o total da fatura exibida no cartão é atualizado
```

```gherkin
Cenário: Pré-visualização da fatura é exibida ao selecionar data
  Dado que o modal de novo gasto está aberto
  Quando o usuário seleciona uma data
  Então o campo de pré-visualização exibe a qual fatura o gasto pertencerá
  com base na data de fechamento do cartão
```

```gherkin
Cenário: Gasto parcelado gera múltiplos registros
  Dado que o modal de novo gasto está aberto
  Quando o usuário ativa a opção de parcelamento, informa parcela atual 1 e total 3
  E toca em "Salvar"
  Então 3 gastos são criados no IndexedDB com groupId comum e labels "Nome 1/3", "Nome 2/3", "Nome 3/3"
  E as datas são incrementadas mês a mês a partir da data informada
```

### CA-06 — Calculadora de expressões no campo valor funciona

```gherkin
Cenário: Usuário usa calculadora no modal de gasto
  Dado que o modal de gasto está aberto
  Quando o usuário toca no botão de calculadora
  Então o numpad personalizado abre
  Quando o usuário digita uma expressão válida e toca em "OK"
  Então o resultado calculado é aplicado ao campo valor
  E a pré-visualização "= R$ X,XX" é exibida
```

### CA-07 — Modal de edição de gasto funciona

```gherkin
Cenário: Usuário edita um gasto simples
  Dado que existe um gasto não parcelado
  Quando o usuário toca no ícone de edição do gasto
  Então o modal abre pré-preenchido com os dados do gasto
  Quando o usuário altera o valor e toca em "Salvar"
  Então o gasto é atualizado no IndexedDB
  E o total da fatura é recalculado
```

```gherkin
Cenário: Usuário edita um gasto parcelado — opções são apresentadas
  Dado que existe um gasto pertencente a uma série de parcelas com parcelas futuras
  Quando o usuário toca em editar
  Então um diálogo apresenta as opções: "Apenas esta parcela", "Esta e seguintes", "Cancelar"
```

### CA-08 — Exclusão de gasto funciona

```gherkin
Cenário: Usuário exclui um gasto simples
  Dado que existe um gasto não parcelado
  Quando o usuário toca no botão de exclusão
  Então uma confirmação nativa é solicitada
  Quando o usuário confirma
  Então o gasto é removido do IndexedDB
  E o total da fatura é atualizado
```

```gherkin
Cenário: Usuário exclui parcela de série com parcelas futuras
  Dado que existe um gasto com groupId e parcelas futuras
  Quando o usuário toca em excluir
  Então um diálogo apresenta: "Remover só esta", "Esta e seguintes (N)", "Cancelar"
```

### CA-09 — Modal de recorrência funciona

```gherkin
Cenário: Usuário cria uma recorrência
  Dado que existe um cartão cadastrado
  Quando o usuário toca em "+ Recorrência"
  Então o modal de nova recorrência abre
  Quando o usuário preenche nome e valor e toca em "Adicionar"
  Então a recorrência é persistida no IndexedDB
  E é exibida na seção "Recorrências" do cartão
  E o total exibido no cartão inclui o valor da recorrência
```

### CA-10 — Subitens de gasto funcionam

```gherkin
Cenário: Usuário adiciona subitens a um gasto
  Dado que o modal de gasto está aberto
  Quando o usuário adiciona subitens com nome e valor
  Então o campo de valor total é preenchido automaticamente com a soma dos subitens
  E os subitens são salvos junto ao gasto no IndexedDB
```

### CA-11 — Cache do service worker é atualizado

```gherkin
Cenário: Service worker instala versão nova do cache
  Dado que sw.js declara CACHE = 'financas-v4'
  E o array urlsToCache contém js/cards-modal.js e js/cards-render.js
  E não contém js/cards.js
  Quando o service worker é instalado no navegador
  Então os arquivos js/cards-modal.js e js/cards-render.js são cacheados com sucesso
  E o cache da versão anterior (financas-v3) é apagado na ativação
```

### CA-12 — Ordem de carregamento dos scripts é preservada

```gherkin
Cenário: Scripts carregam na ordem correta
  Dado que index.html declara os scripts na sequência:
    globals.js → db.js → utils.js → pessoas.js → cards-modal.js → cards-render.js → transactions.js → budget.js → projection.js → config.js → app.js
  Quando a página é carregada no navegador
  Então todas as funções de cards-modal.js estão disponíveis no escopo global (window)
  antes de cards-render.js ser executado
  E todas as funções de cards-render.js estão disponíveis antes de transactions.js executar
```

### CA-13 — Nenhuma regressão em funcionalidades relacionadas

```gherkin
Cenário: Página de orçamento continua consumindo dados de cartão
  Dado que existem cartões com gastos cadastrados
  Quando o usuário navega para a aba "Orçamento"
  Então os itens de cartão aparecem corretamente com valor, data de vencimento e nome do cartão
```

```gherkin
Cenário: Navegação entre meses na aba Cartões funciona
  Dado que o usuário está na aba "Cartões"
  Quando o usuário toca nas setas de mês anterior e próximo mês
  Então a fatura exibida para cada cartão corresponde ao mês selecionado
  E os totais são recalculados corretamente
```

### CA-14 — Verificação de sintaxe dos novos arquivos

```gherkin
Cenário: Arquivos não contêm erros de sintaxe JavaScript
  Dado que os arquivos js/cards-modal.js e js/cards-render.js foram criados
  Quando o comando "node --check js/cards-modal.js" é executado
  Então o comando retorna exit code 0 sem erros
  Quando o comando "node --check js/cards-render.js" é executado
  Então o comando retorna exit code 0 sem erros
```

---

## 4. Definition of Done (DoD)

Checklist obrigatório para o Dev marcar antes de encaminhar para Code Review. Nenhum item pode ficar pendente.

### Entregáveis

- [ ] `js/cards-modal.js` criado com todas as funções de modal e formulário listadas no escopo
- [ ] `js/cards-render.js` criado com todas as funções de render listadas no escopo
- [ ] `js/cards.js` removido do repositório
- [ ] `index.html` atualizado: `cards.js` substituído por `cards-modal.js` seguido de `cards-render.js` na mesma posição
- [ ] `sw.js` atualizado: `cards.js` removido do array, `cards-modal.js` e `cards-render.js` adicionados, versão alterada para `'financas-v4'`

### Verificação de sintaxe

- [ ] `node --check js/cards-modal.js` retorna exit code 0
- [ ] `node --check js/cards-render.js` retorna exit code 0

### Verificação de escopo global

- [ ] Nenhuma função foi envolvida em IIFE, closure ou módulo ES
- [ ] Nenhum `export` ou `import` foi introduzido nos novos arquivos
- [ ] Todas as funções listadas no escopo estão acessíveis via `window.<nome>` após o carregamento da página

### Verificação de integridade do split

- [ ] Nenhuma função foi duplicada entre `cards-modal.js` e `cards-render.js`
- [ ] Nenhuma função foi esquecida (total de funções em `cards-modal.js + cards-render.js` = total original em `cards.js`)
- [ ] As constantes `CARD_COLORS` e `CARD_COLOR_NAMES` estão em `cards-modal.js` (primeiro arquivo carregado)

### Verificação de comportamento

- [ ] Criação de cartão funciona (nome, fechamento, vencimento, limite, cor, responsável)
- [ ] Edição de cartão funciona com dados pré-preenchidos
- [ ] Exclusão de cartão remove cartão, gastos e recorrências associados
- [ ] Criação de gasto funciona com data, valor, parcelas e subitens
- [ ] Edição de gasto simples funciona
- [ ] Edição de gasto parcelado apresenta opções "Apenas esta parcela" e "Esta e seguintes"
- [ ] Exclusão de gasto parcelado apresenta opções corretas
- [ ] Criação e edição de recorrência funciona
- [ ] Pré-visualização de fatura atualiza ao trocar data no modal de gasto
- [ ] Calculadora (numpad) aplica resultado ao campo valor
- [ ] Barra de limite exibe percentual e cor corretos (verde/âmbar/vermelho)
- [ ] Integração com orçamento (`getCartaoBudgetItems`) funciona sem alteração
- [ ] Navegação entre meses recalcula totais corretamente
- [ ] Toast de confirmação/erro aparece nas ações de criar, editar e excluir

### Verificação de restrições técnicas

- [ ] Nenhum `<script type="module">` introduzido no `index.html`
- [ ] Nenhum `JSON.stringify` em atributo `onclick` introduzido
- [ ] Nenhuma função foi renomeada ou refatorada além da reorganização de arquivo

### Verificação do service worker

- [ ] `sw.js` declara `const CACHE = 'financas-v4'`
- [ ] `urlsToCache` contém `js/cards-modal.js` e `js/cards-render.js`
- [ ] `urlsToCache` não contém `js/cards.js`

### Code Review

- [ ] Code Review aprovado (sem bloqueantes)

---

## 5. Restrições Técnicas Obrigatórias

Estas restrições têm peso de regra inegociável. Qualquer violação é bloqueante para aprovação.

### RT-01 — Proibido usar `<script type="module">`

Módulos ES carregam de forma assíncrona e em escopo isolado. Esta aplicação depende de escopo global sequencial. O uso de `type="module"` quebraria todas as chamadas `onclick` do HTML e todas as referências entre arquivos.

**O que fazer:** usar apenas `<script src="...">` sem atributo `type`, na ordem correta.

### RT-02 — Proibido usar `export` ou `import`

Toda função deve permanecer no escopo global (`window.*`). Não usar `export default`, `export function`, `import from` ou qualquer sintaxe de módulo ES.

### RT-03 — Proibido usar `JSON.stringify` em atributos `onclick`

`JSON.stringify` em `onclick` inline gera strings com aspas que quebram o atributo HTML. Este padrão já existe no código legado em alguns pontos — não replicar em nenhuma função nova ou movida.

**Alternativa existente e correta:** passar IDs simples (números inteiros) para funções globais, e dentro da função buscar o objeto completo via `cartoesAll()`, como já feito em `editCartao(cartaoId)` e `editGasto(cartaoId, gastoId)`.

### RT-04 — Zero mudança de comportamento

Este sprint é exclusivamente reorganização de arquivo. Qualquer diferença de comportamento entre antes e depois é um bug introduzido pelo split, não uma melhoria. Se durante o split for identificado um bug pré-existente, registrar em `.claude/debt/backlog.md` e não corrigir agora.

### RT-05 — Ordem de carregamento é obrigatória

`cards-modal.js` deve ser declarado antes de `cards-render.js` no `index.html`. `cards-render.js` usa funções definidas em `cards-modal.js` (`getFaturaMonth`, `gastoValueForFatura` e outras). Inversão da ordem causaria `ReferenceError` em tempo de execução.

A sequência final esperada em `index.html`:

```
js/globals.js
js/db.js
js/utils.js
js/pessoas.js
js/cards-modal.js   ← primeiro
js/cards-render.js  ← segundo
js/transactions.js
js/budget.js
js/projection.js
js/config.js
js/app.js
```

### RT-06 — Verificação de sintaxe é mandatória antes do commit

Executar obrigatoriamente antes de qualquer commit:

```
node --check js/cards-modal.js
node --check js/cards-render.js
```

Exit code diferente de 0 = bloqueante. Não commitar com erro de sintaxe.

---

## Mapeamento de funções por arquivo de destino

### cards-modal.js

| Função / Constante | Tipo | Linha aprox. original |
|---|---|---|
| `CARD_COLORS` | constante | 1 |
| `CARD_COLOR_NAMES` | constante | 2 |
| `getFaturaMonth` | função | 4 |
| `getFaturaVencimento` | função | 19 |
| `getCurrentFatura` | função | 26 |
| `showAddCartaoModal` | função | 62 |
| `saveCartao` | função | 106 |
| `saveCartaoEdit` | função | 128 |
| `deleteCartao` | função | 153 |
| `editCartao` | função | 645 |
| `showAddGastoModal` | função | 172 |
| `updateFaturaPreview` | função | 274 |
| `openGastoNumpad` | função | 288 |
| `onCgValInput` | função | 310 |
| `getGastoVal` | função | 320 |
| `toggleGastoParcela` | função | 333 |
| `addGastoSubitem` | função | 337 |
| `toggleGastoSubitemRepeat` | função | 358 |
| `removeGastoSubitem` | função | 366 |
| `updateGastoSubtotal` | função | 409 |
| `getRawGastoSubitems` | função | 416 |
| `saveGasto` | função | 437 |
| `saveGastoEdit` | função | 484 |
| `deleteGasto` | função | 597 |
| `editGasto` | função | 631 |
| `showAddRecorrenteModal` | função | 658 |
| `addCrSubitem` | função | 693 |
| `updateCrSubtotal` | função | 708 |
| `getCrSubitems` | função | 714 |
| `saveRecorrente` | função | 723 |
| `saveRecorrenteEdit` | função | 742 |
| `editRecorrente` | função | 765 |
| `deleteRecorrente` | função | 777 |

### cards-render.js

| Função | Tipo | Linha aprox. original |
|---|---|---|
| `gastoValueForFatura` | função | 795 |
| `calcLimiteUsado` | função | 803 |
| `getCartaoFaturaGastos` | função | 35 |
| `getCartaoFaturaTotal` | função | 57 |
| `renderCards` | função | 841 |
| `refreshBudgetCartoes` | função | 969 |
| `getCartaoBudgetItems` | função | 976 |

> Atenção: `getCartaoFaturaGastos` e `getCartaoFaturaTotal` estão nas linhas 35-60 do arquivo original, mas dependem de `getFaturaMonth` e `getActiveSubitems` (definida em `utils.js`). Devem ir para `cards-render.js` pois são funções de consulta/cálculo para render, não para modal.
