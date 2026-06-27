# Plano de Testes QA — Sprint 1: Split de cards.js

**Criado em:** 2026-06-26
**Agente:** QA Engineer
**Sprint:** Sprint 1 — Split de cards.js (refatoração estrutural pura)
**Base:** spec `sprint-1-cards-split.md` — 14 critérios de aceite (CA-01 a CA-14)
**Pré-condição geral:** Code Review aprovado sem bloqueantes. DT-005 (TDZ em saveRecorrenteEdit) é débito pré-existente documentado e fora do escopo desta validação.

---

## 1. Resultado das Verificações Estáticas

> Executadas pelo QA via leitura de código e ferramentas de linha de comando. Sem necessidade de abrir navegador.

### CA-14 — Sintaxe JavaScript: PASSOU

```
node --check js/cards-modal.js  → exit code 0 (sem erros)
node --check js/cards-render.js → exit code 0 (sem erros)
```

Ambos os arquivos têm sintaxe válida. Nenhum erro de parse reportado pelo Node.js.

---

### CA-11 — Cache do service worker: PASSOU

Verificado em `sw.js`:

| Condição do CA | Situação |
|---|---|
| `const CACHE = 'financas-v4'` (linha 1) | Presente — confirmado |
| `js/cards-modal.js` em `urlsToCache` (linha 10) | Presente — confirmado |
| `js/cards-render.js` em `urlsToCache` (linha 11) | Presente — confirmado |
| `js/cards.js` ausente de `urlsToCache` | Confirmado — arquivo não aparece no array |
| Cache anterior deletado na ativação | Confirmado — bloco `activate` filtra por `k !== CACHE` e deleta os demais |

---

### CA-12 — Ordem de carregamento dos scripts: PASSOU

Verificado em `index.html` (linhas 559–569):

```html
<script src="js/globals.js"></script>       <!-- linha 559 -->
<script src="js/db.js"></script>            <!-- linha 560 -->
<script src="js/utils.js"></script>         <!-- linha 561 -->
<script src="js/pessoas.js"></script>       <!-- linha 562 -->
<script src="js/cards-modal.js"></script>   <!-- linha 563 — correto: antes de cards-render.js -->
<script src="js/cards-render.js"></script>  <!-- linha 564 — correto: depois de cards-modal.js -->
<script src="js/transactions.js"></script>  <!-- linha 565 -->
<script src="js/budget.js"></script>        <!-- linha 566 -->
<script src="js/projection.js"></script>    <!-- linha 567 -->
<script src="js/config.js"></script>        <!-- linha 568 -->
<script src="js/app.js"></script>           <!-- linha 569 -->
```

A ordem é exatamente a especificada em RT-05. `cards-modal.js` antecede `cards-render.js`, garantindo que `getFaturaMonth`, `gastoValueForFatura` e demais funções usadas em `cards-render.js` estejam disponíveis no escopo global quando o segundo arquivo executar. Nenhum `<script type="module">` introduzido.

---

### Verificações adicionais (RT-02 e RT-03)

**RT-02 — Ausência de export/import:** Grep por `export` e `import ` em ambos os arquivos retornou zero ocorrências. Nenhuma função foi modularizada. Todas permanecem em escopo global.

**RT-03 — JSON.stringify em onclick:** Identificado em `cards-render.js` linha 149:
```js
onclick="showAddGastoModal(${cartao.id},${JSON.stringify(cartao).replace(/"/g,'&quot;')})"
```
Confirmado via `git show HEAD~1:js/cards.js` que esta linha corresponde exatamente à linha 915 do arquivo original. **É pré-existente — não introduzido pelo split.** Não é bloqueante desta validação (registrado historicamente como padrão legado).

**cards.js removido:** Listagem de `js/` confirma ausência do arquivo original. Split completo.

---

## 2. Checklist de Validação Manual no Navegador

> A ser executado pelo usuário. Este sprint é refatoração pura — qualquer diferença de comportamento em relação ao estado anterior é um bug introduzido pelo split.
>
> **Como abrir o console:** F12 (Chrome/Firefox) → aba Console. Manter aberto durante toda a validação. Qualquer erro vermelho deve ser registrado.
>
> **Dados mínimos recomendados antes de iniciar:** ter ao menos 1 cartão, 1 gasto simples, 1 gasto parcelado (3+ parcelas com parcelas futuras), e 1 recorrência cadastrados.

---

### Preparação (executar uma vez antes de tudo)

- [ ] Abrir DevTools (F12) e deixar a aba Console visível
- [ ] Recarregar a página com Ctrl+Shift+R (hard reload, ignora cache) para garantir que o service worker novo foi ativado
- [ ] Verificar no Console: não deve haver nenhum erro vermelho ao carregar
- [ ] Verificar no Console que `typeof showAddCartaoModal === 'function'` retorna `true`
- [ ] Verificar no Console que `typeof renderCards === 'function'` retorna `true`
- [ ] Verificar no Console que `typeof CARD_COLORS !== 'undefined'` retorna `true`

---

### CA-01 — Listagem de cartões renderiza corretamente

**Pré-condição:** ter ao menos 1 cartão cadastrado com gastos.

- [ ] Navegar para a aba "Cartões"
- [ ] Os cartões são exibidos com: nome, cor (logo colorido), dia de fechamento, dia de vencimento e mês/ano da fatura
- [ ] O total de gastos da fatura corrente aparece abaixo do nome (em vermelho ou cinza se zero)
- [ ] Se o cartão tiver limite configurado: a barra de limite aparece com percentual e cor (verde < 70%, âmbar 70–90%, vermelho >= 90%)
- [ ] Nenhum erro no console durante o carregamento

---

### CA-02 — Modal de criação de cartão

**Cenário A — Happy path:**

- [ ] Tocar em "+ Cartão" — modal abre com campos: nome, fechamento, vencimento, limite (opcional), responsável (opcional) e seletor de cor
- [ ] Preencher nome "Teste QA", fechamento 15, vencimento 22
- [ ] Selecionar uma cor no seletor
- [ ] Tocar em "Salvar"
- [ ] Toast de confirmação aparece ("Cartão adicionado!")
- [ ] Modal fecha
- [ ] O novo cartão "Teste QA" aparece na lista

**Cenário B — Validação: nome em branco:**

- [ ] Abrir o modal de novo cartão
- [ ] Deixar o campo nome vazio, preencher fechamento e vencimento
- [ ] Tocar em "Salvar"
- [ ] Mensagem de erro aparece no campo nome: "Informe o nome"
- [ ] O cartão não é salvo (lista não muda)

**Cenário C — Validação: dia de fechamento inválido:**

- [ ] Abrir o modal de novo cartão
- [ ] Preencher nome, informar fechamento = 0 (ou 32)
- [ ] Tocar em "Salvar"
- [ ] Mensagem de erro aparece no campo fechamento: "Dia inválido (1-31)"
- [ ] O cartão não é salvo

---

### CA-03 — Modal de edição de cartão

- [ ] Tocar no ícone ✏️ de um cartão existente
- [ ] Modal abre pré-preenchido com os dados atuais (nome, fechamento, vencimento, cor e responsável se houver)
- [ ] Alterar o nome para "Teste QA Editado"
- [ ] Tocar em "Salvar"
- [ ] Toast de confirmação aparece ("Cartão atualizado!")
- [ ] A lista reflete o nome alterado

---

### CA-04 — Exclusão de cartão

**Pré-condição:** ter um cartão com ao menos 1 gasto e 1 recorrência cadastrados.

- [ ] Tocar no botão ✕ do cartão
- [ ] Um diálogo de confirmação nativo (window.confirm) é exibido
- [ ] Confirmar a exclusão
- [ ] Toast de confirmação aparece ("Cartão removido")
- [ ] O cartão some da lista
- [ ] Verificar no Console que não há erros após a remoção
- [ ] (Verificação extra) Navegar para "Orçamento" — o cartão excluído não aparece mais

---

### CA-05 — Modal de gasto

**Cenário A — Happy path simples:**

- [ ] Tocar em "+ Gasto" em um cartão
- [ ] Modal abre com campos: descrição, valor (com botão de calculadora), data, parcelas (toggle), observações e área de subitens
- [ ] Preencher descrição "Supermercado QA", valor "150,00"
- [ ] Tocar em "Salvar"
- [ ] Toast de confirmação aparece ("Gasto adicionado!")
- [ ] Modal fecha
- [ ] O gasto aparece na lista do cartão e o total da fatura é atualizado

**Cenário B — Pré-visualização de fatura:**

- [ ] Abrir o modal de novo gasto
- [ ] O campo de pré-visualização de fatura (texto azul "→ Fatura de ...") é exibido ou atualizado ao selecionar/alterar a data
- [ ] Alterar a data para um dia antes do fechamento do cartão — a fatura exibida deve ser do mês corrente
- [ ] Alterar a data para o dia do fechamento ou depois — a fatura exibida deve ser do próximo mês

**Cenário C — Gasto parcelado:**

- [ ] Abrir modal de novo gasto
- [ ] Ativar o toggle "Parcelar compra"
- [ ] Preencher parcela atual = 1, total de parcelas = 3, valor = 100,00
- [ ] Preencher descrição "Parcela QA"
- [ ] Tocar em "Salvar"
- [ ] Toast "3 parcelas adicionadas!" aparece
- [ ] 3 gastos aparecem na lista nos meses seguintes com labels "Parcela QA 1/3", "Parcela QA 2/3", "Parcela QA 3/3"
- [ ] Navegar pelos meses (seta ›) para confirmar que cada parcela está no mês correto

---

### CA-06 — Calculadora (numpad)

- [ ] Abrir modal de novo gasto
- [ ] Tocar no botão 📟 ao lado do campo valor
- [ ] O numpad personalizado abre (tela de cálculo com botões numéricos e operadores)
- [ ] Digitar a expressão "50+30"
- [ ] Tocar em "OK"
- [ ] O campo valor exibe "50+30" e a pré-visualização "= R$ 80,00" (ou equivalente) aparece abaixo
- [ ] Tocar em "Salvar" — o valor salvo deve ser 80,00 (resultado da expressão)

---

### CA-07 — Modal de edição de gasto

**Cenário A — Gasto simples:**

- [ ] Tocar no ✏️ de um gasto não parcelado
- [ ] Modal abre pré-preenchido com os dados do gasto (nome, valor, data, obs)
- [ ] Alterar o valor
- [ ] Tocar em "Salvar"
- [ ] Toast de confirmação aparece ("Gasto atualizado!")
- [ ] O total da fatura é recalculado e exibido corretamente

**Cenário B — Gasto parcelado com parcelas futuras:**

- [ ] Tocar no ✏️ de uma parcela que tenha parcelas futuras
- [ ] O modal fecha e um diálogo customizado aparece com as opções: "Apenas esta parcela", "Esta e seguintes", "Cancelar"
- [ ] Tocar "Cancelar" — nada é alterado
- [ ] Repetir e escolher "Apenas esta parcela" — apenas essa parcela é atualizada, as demais mantêm o valor original
- [ ] Repetir e escolher "Esta e seguintes" — as parcelas a partir desta são atualizadas

---

### CA-08 — Exclusão de gasto

**Cenário A — Gasto simples:**

- [ ] Tocar no ✕ de um gasto não parcelado
- [ ] Um diálogo de confirmação nativo (window.confirm) é exibido
- [ ] Confirmar a exclusão
- [ ] Toast "Gasto removido" aparece
- [ ] O gasto some da lista e o total da fatura é atualizado

**Cenário B — Gasto parcelado com parcelas futuras:**

- [ ] Tocar no ✕ de uma parcela que tenha parcelas futuras
- [ ] Um diálogo customizado aparece com as opções: "Remover só esta", "Esta e seguintes (N)", "Cancelar"
- [ ] Tocar "Cancelar" — nada é alterado
- [ ] Repetir e escolher "Remover só esta" — apenas aquela parcela é removida
- [ ] Repetir e escolher "Esta e seguintes (N)" — a parcela atual e as futuras são removidas

---

### CA-09 — Modal de recorrência

- [ ] Tocar em "+ Recorrência" em um cartão (botão aparece quando não há recorrência)
- [ ] Modal abre com campos: nome, valor e subitens
- [ ] Preencher nome "Netflix QA" e valor "45,90"
- [ ] Tocar em "Adicionar"
- [ ] Toast de confirmação aparece ("Recorrência adicionada!")
- [ ] A recorrência "Netflix QA" aparece na seção "Recorrências" do cartão com borda teal
- [ ] O total exibido no cartão inclui o valor da recorrência (R$ gasto + R$ recorrência)
- [ ] Verificar que o valor da recorrência está correto e não zerado

---

### CA-10 — Subitens de gasto

- [ ] Abrir modal de novo gasto
- [ ] Tocar em "+ subitem"
- [ ] Preencher nome "Item A" e valor "30,00"
- [ ] Tocar em "+ subitem" novamente
- [ ] Preencher nome "Item B" e valor "20,00"
- [ ] O campo "Valor" do gasto é preenchido automaticamente com "50.00" (soma dos subitens)
- [ ] Tocar em "Salvar"
- [ ] O gasto é salvo com valor total 50,00
- [ ] No card do cartão, ao expandir o gasto, os subitens são exibidos

---

### CA-13 — Regressões em funcionalidades relacionadas

**Cenário A — Orçamento consome dados de cartão:**

- [ ] Navegar para a aba "Orçamento"
- [ ] Os cartões com gastos na fatura do mês atual aparecem como itens de orçamento
- [ ] Cada item exibe: nome do cartão, valor total (gastos + recorrências) e data de vencimento
- [ ] Navegar para um mês sem gastos em cartão — o item do cartão não aparece (ou aparece com valor 0 e não exibido)

**Cenário B — Navegação entre meses na aba Cartões:**

- [ ] Estar na aba "Cartões"
- [ ] Tocar na seta "‹" (mês anterior) — o mês no header muda e os gastos da fatura anterior são exibidos
- [ ] Tocar na seta "›" (próximo mês) — o mês avança e os gastos da fatura correta são exibidos
- [ ] Os totais por cartão são recalculados a cada troca de mês
- [ ] Nenhum erro no Console durante a navegação

---

## 3. Tabela-Resumo dos CAs

| CA | Descrição | Método | Situação |
|---|---|---|---|
| CA-01 | Listagem de cartões renderiza | Manual — navegador | A validar |
| CA-02 | Modal criação de cartão | Manual — navegador | A validar |
| CA-03 | Modal edição de cartão | Manual — navegador | A validar |
| CA-04 | Exclusão de cartão | Manual — navegador | A validar |
| CA-05 | Modal de gasto | Manual — navegador | A validar |
| CA-06 | Calculadora (numpad) | Manual — navegador | A validar |
| CA-07 | Edição de gasto | Manual — navegador | A validar |
| CA-08 | Exclusão de gasto | Manual — navegador | A validar |
| CA-09 | Modal de recorrência | Manual — navegador | A validar |
| CA-10 | Subitens de gasto | Manual — navegador | A validar |
| CA-11 | Cache service worker v4 | Estático — leitura de sw.js | **PASSOU** |
| CA-12 | Ordem dos scripts em index.html | Estático — leitura de index.html | **PASSOU** |
| CA-13 | Regressões em orçamento e navegação | Manual — navegador | A validar |
| CA-14 | Sintaxe dos novos arquivos | Estático — node --check | **PASSOU** |

---

## 4. Critério de Aprovação

Este sprint será considerado **APROVADO** quando:

- Todos os itens do checklist de validação manual estiverem marcados como OK
- Nenhum erro inesperado no Console durante qualquer das ações acima
- Nenhuma diferença de comportamento em relação ao estado anterior (qualquer diferença é regressão introduzida pelo split)

Será considerado **REPROVADO** se qualquer das seguintes ocorrer:

- Erro JavaScript no Console ao carregar a página
- Qualquer modal não abrindo, não fechando ou não salvando corretamente
- Totais de fatura calculados incorretamente
- Integração com orçamento quebrada (CA-13)
- Navegação entre meses não recalculando corretamente (CA-13)
- Service worker não ativado na versão correta (detectável em DevTools > Application > Service Workers)

---

## 5. Observações para o Usuário

**DT-005 (saveRecorrenteEdit):** ao tentar editar uma recorrência, é possível que a operação retorne erro em modo estrito. Este é um bug **pré-existente** documentado em `.claude/debt/backlog.md` e não é de responsabilidade deste sprint. Se ocorrer, registrar separadamente.

**JSON.stringify em onclick (cards-render.js linha 149):** este padrão legado (`showAddGastoModal` recebendo o objeto cartão serializado) é pré-existente e estava na linha 915 do `cards.js` original. Não é um problema introduzido pelo split. O botão "+ Gasto" deve funcionar normalmente apesar disso.

**Service worker:** se após hard reload (Ctrl+Shift+R) o novo SW não ativar, verificar em DevTools > Application > Service Workers se há um worker "waiting". Clicar em "skipWaiting" para forçar a ativação do `financas-v4`.
