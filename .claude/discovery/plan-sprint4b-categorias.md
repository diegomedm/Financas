# Plano de Desenvolvimento — Sprint 4b: Categorias Orçadas de Cartão

**Versão:** 1.0
**Data:** 2026-06-27
**Status:** Aguardando aprovação
**Nível de complexidade:** N2 MVP

---

## 1. Visão Geral

### Problema

Gastos variáveis de cartão que seguem um orçamento mensal previsível (ex: Gasolina R$300/mês) não têm referência de envelope. O usuário não sabe se está acima ou abaixo do esperado ao olhar a fatura, e a projeção futura ignora esses gastos quando ainda não foram lançados.

### Solução proposta

Introduzir uma entidade "Categoria Orçada" (global, sem vínculo com cartão específico) que pode ser associada a gastos avulsos no momento do lançamento. Na fatura, categorias com gastos vinculados exibem realizado vs. orçado. Na projeção, meses sem gastos reais da categoria usam o valor orçado como despesa prevista.

### Usuários alvo

Usuário único do PWA pessoal — acesso via mobile e desktop.

### Por que N2

Feature autocontida em módulo existente (cartão), sem backend, sem dados sensíveis novos, sem SLA. Impacto restrito à aba Cartão e à lógica de projeção. Nível MVP é adequado: precisa funcionar corretamente mas sem cerimônia de Produto.

---

## 2. Objetivos e Critérios de Sucesso

| Objetivo | Métrica de sucesso | Prazo esperado |
|----------|-------------------|----------------|
| Criar/editar/excluir categorias | CRUD completo funcionando na aba Cartão | Sprint 4b |
| Vincular categoria ao lançar gasto | Campo opcional no modal de gasto mostrando categorias disponíveis | Sprint 4b |
| Exibir realizado vs. orçado na fatura | Linha de categoria com dois valores visível dentro da fatura | Sprint 4b |
| Projeção considera orçado em meses futuros | Valor orçado aparece na projeção quando não há gastos reais suficientes | Sprint 4b |

---

## 3. Escopo

### Dentro do escopo

- Store `categoriasCartao` com CRUD completo (nome + valor orçado mensal)
- Gerenciamento de categorias na aba Cartão (botão + modal, similar ao fluxo de recorrentes)
- Campo "Categoria" opcional no modal de gasto (select com categorias disponíveis)
- Persistência do `categoriaId` no documento de gasto
- Exibição agrupada na fatura: por categoria (realizado / orçado) e sem categoria (lista normal)
- `getCartaoBudgetItems()` usa valor orçado de categoria quando não há gastos reais no mês
- Projeção absorve automaticamente via `getCartaoBudgetItems()` (sem mudança direta em projection.js)
- Bump de versão do IndexedDB de 5 para 6

### Fora do escopo agora (futuro)

- Relatórios ou gráficos de categorias
- Histórico de evolução do orçado por mês
- Categorias em TX ou Budget manual

### Explicitamente fora do escopo

- Valor orçado variável por mês
- Vinculação de categoria a recorrentes
- Backend ou sincronização remota

---

## 4. Nova Store

### `categoriasCartao`

```
keyPath: 'id' (autoIncrement)

Campos:
  id          — autoIncrement (number)
  name        — string, obrigatório
  valorOrcado — number, obrigatório (valor mensal padrão)
  createdAt   — number (Date.now())
```

Sem índices secundários necessários (volume pequeno, getAll() é suficiente).

### Alteração na store `gastos`

Adicionar campo opcional ao documento existente:

```
categoriaId — number | null (referência a categoriasCartao.id)
```

Sem migration necessária — campo ausente equivale a `null` (retrocompatível).

---

## 5. Arquivos a Modificar

### `js/db.js`

**O que muda:**

1. Bump de versão: `indexedDB.open('financas_pwa_v2', 6)` (era 5)
2. Adicionar bloco `onupgradeneeded` para criar store `categoriasCartao`:

```js
if(!d.objectStoreNames.contains('categoriasCartao')){
  d.createObjectStore('categoriasCartao',{keyPath:'id',autoIncrement:true});
}
```

3. Adicionar 4 funções CRUD seguindo o padrão existente:

```
categoriasCartaoAll()
categoriasCartaoAdd(item)
categoriasCartaoPut(item)
categoriasCartaoDel(id)
```

Padrão idêntico ao de `recorrentes*` — com invalidateCache e _cacheRead/_cacheWrite.

**Risco:** Bump de versão aciona `onupgradeneeded` somente para novos campos — dados existentes preservados. Testar que o upgrade não quebra stores existentes.

---

### `js/cards-modal.js`

**O que muda:**

1. **Modal de gasto (`showAddGastoModal`)** — adicionar campo select de categoria após o campo de observações:

```
<div class="form-group">
  <label>Categoria <span class="label-muted">(opcional)</span></label>
  <select id="cg-categoria">
    <option value="">— sem categoria —</option>
    <!-- populado via setTimeout após abertura do modal -->
  </select>
</div>
```

   - Populado no `setTimeout` existente com `await categoriasCartaoAll()`
   - Se editando gasto com `categoriaId`, pré-selecionar a opção correspondente

2. **`saveGasto()`** — ler `cg-categoria` e incluir `categoriaId` no objeto salvo:

```js
const categoriaId = parseInt(document.getElementById('cg-categoria')?.value)||null;
await gastosAdd({name, value, ..., categoriaId, createdAt: Date.now()});
```

3. **`saveGastoEdit()`** — mesmo tratamento de `categoriaId` no `gastosPut()`

4. **Novo: `showAddCategoriaModal(categoria=null)`** — modal para criar/editar categoria:

```
Campos: nome (text) + valor orçado (number)
Botões: Salvar / Cancelar
Save chama: categoriasCartaoAdd() ou categoriasCartaoPut()
Após save: renderCards() para atualizar a seção de categorias
```

5. **Novo: `saveCategoriaModal()`** e **`saveCategoriaEdit(id)`** — funções de persistência

6. **Novo: `deleteCategoria(id)`** — com confirmação via `showConfirm()`:
   - Ao excluir, os gastos vinculados perdem a referência mas permanecem (categoriaId fica orphan — tratado como null na renderização)

**Restrições técnicas aplicadas:**
- Nenhum `JSON.stringify` em `onclick`
- `onclick` de botões do modal atribuídos via `setTimeout` (padrão já usado em recorrentes)
- `select` populado programaticamente — sem nested template literal

---

### `js/cards-render.js`

**O que muda:**

1. **`renderCards()`** — adicionar seção "Categorias Orçadas" dentro de cada card de cartão:

   Lógica:
   - Carregar `await categoriasCartaoAll()`
   - Para cada categoria, filtrar `gastosFatura` onde `g.categoriaId === cat.id`
   - Calcular `realizado = soma dos gastos vinculados na fatura atual`
   - Exibir linha: `[nome da categoria]   R$ realizado / R$ orçado`
   - Cor: verde se realizado <= orçado, âmbar se > 80%, vermelho se > orçado
   - Gastos sem categoria continuam na lista normal abaixo

   HTML esperado por categoria (dentro do card):
   ```
   <div class="card-cat-item">
     <span class="card-cat-name">Gasolina</span>
     <span class="card-cat-vals">R$ 180 / R$ 300</span>
   </div>
   ```

2. **`renderCards()`** — adicionar botão "+ Categoria" na barra de ações do cartão (próximo ao "+ Recorrência")

3. **Gerenciamento de categorias** — seção com lista de categorias globais (visível em pelo menos um cartão ou como seção separada):
   - Cada item: nome + valor orçado + botões editar/excluir
   - Posição sugerida: no primeiro cartão expandido, ou como seção fixa no topo da aba Cartão acima dos cards — definir na implementação

4. **`getCartaoBudgetItems(targetMonth, targetYear)`** — lógica adicional para categorias:

   Para cada categoria orçada:
   - Verificar se há gastos dessa categoria vinculados ao cartão na fatura `tm/ty`
   - Se `realizado >= valorOrcado`: usar `realizado` (já computado nos gastos normais — nenhuma adição extra)
   - Se `realizado < valorOrcado` (inclui zero): adicionar `(valorOrcado - realizado)` como despesa adicional projetada
   - Isso garante que meses futuros sem gastos reais ainda projetam o valor orçado

   Observação importante: a lógica deve ser por cartão? A categoria é global — um mesmo "Gasolina" pode aparecer em gastos de cartões diferentes. A implementação deve iterar por categoria e agregar gastos de todos os cartões para aquela categoria no mês, depois inserir o delta como item projetado avulso (não vinculado a cartão específico) — OU vincular ao primeiro cartão com gasto dessa categoria. Decisão: incluir o delta como item separado no resultado de `getCartaoBudgetItems` com `_isCategoria: true`, nome da categoria e valor = `valorOrcado - realizado`. Isso preserva compatibilidade com projection.js sem alterar sua lógica.

**Restrições técnicas aplicadas:**
- Toda renderização via concatenação de strings HTML (sem template literals aninhados)
- Referências a funções globais via `window.*` quando necessário

---

### `index.html` (ou arquivo HTML principal)

**O que muda:**

Verificar se há necessidade de ajuste no carregamento de scripts (ordem) — provavelmente não, pois `categoriasCartao*` será definido em `db.js` que já é carregado antes de `cards-modal.js` e `cards-render.js`.

Nenhuma nova tag `<script>` deve ser necessária.

---

## 6. Stack / Padrões

| Camada | Tecnologia | Padrão |
|--------|------------|--------|
| Persistência | IndexedDB via funções CRUD globais | Idêntico a recorrentes |
| UI Modal | HTML string + `openModal()` | Idêntico a showAddRecorrenteModal |
| Renderização | Concatenação de strings HTML | Idêntico a renderCards atual |
| Estado global | `window.*` / variáveis globais | Sem mudança |
| Escopo | Global compartilhado | Sem export/import |

---

## 7. Fases de Desenvolvimento

### Fase 1 — Store e CRUD base

**Entregáveis:**
- [ ] Bump de versão do IndexedDB para 6
- [ ] Store `categoriasCartao` criada no `onupgradeneeded`
- [ ] Funções `categoriasCartaoAll/Add/Put/Del` em `db.js`

**Estimativa:** 30 min

---

### Fase 2 — Modal e CRUD de categorias na UI

**Entregáveis:**
- [ ] `showAddCategoriaModal()` em `cards-modal.js`
- [ ] `saveCategoriaModal()`, `saveCategoriaEdit(id)`, `deleteCategoria(id)` em `cards-modal.js`
- [ ] Seção de categorias visível na aba Cartão com lista + botões editar/excluir
- [ ] Botão para abrir modal de nova categoria

**Estimativa:** 1h

---

### Fase 3 — Campo categoria no modal de gasto

**Entregáveis:**
- [ ] Campo `<select>` de categoria em `showAddGastoModal()`
- [ ] `saveGasto()` persiste `categoriaId`
- [ ] `saveGastoEdit()` persiste `categoriaId`
- [ ] Pré-seleção ao editar gasto existente com categoria

**Estimativa:** 45 min

---

### Fase 4 — Exibição na fatura

**Entregáveis:**
- [ ] `renderCards()` exibe seção "Categorias" por cartão com realizado/orçado
- [ ] Gastos vinculados a categoria aparecem agrupados (ou destacados)
- [ ] Gastos sem categoria continuam na lista normal
- [ ] Indicador visual de status (verde/âmbar/vermelho)

**Estimativa:** 1h 30 min

---

### Fase 5 — Projeção

**Entregáveis:**
- [ ] `getCartaoBudgetItems()` inclui delta de categoria (orçado - realizado) quando positivo
- [ ] Projeção de meses futuros sem gastos reais reflete valor orçado da categoria
- [ ] Meses com gastos reais >= orçado não duplicam o valor

**Estimativa:** 1h

---

**Estimativa total:** ~4h 45 min

---

## 8. Riscos e Dependências

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Bump de versão do IndexedDB quebrar dados existentes | Baixa | Alto | Testar upgrade em ambiente com dados reais; usar o backup JSON disponível (G:\Meu Drive\financas_backup_20260626.json) |
| Categoria global vs. escopo por cartão gerar contagem duplicada na projeção | Média | Médio | Definir explicitamente na Fase 5 que o delta é calculado globalmente (soma de todos os gastos da categoria, independente de cartão), uma vez por categoria |
| `getCartaoBudgetItems()` retornar itens duplicados (gasto real + delta da categoria somando acima do real) | Média | Médio | Garantir que o delta seja `max(0, valorOrcado - totalRealizado)` — nunca negativo |
| Modal de gasto com select de categorias quebrando a regra de no-nested-template-literal | Baixa | Baixo | Popular o select programaticamente no setTimeout existente, nunca via template literal |
| Gastos vinculados a categoria excluída ficarem com referência orphan | Baixa | Baixo | Na renderização, tratar `categoriaId` ausente no array de categorias como `null` (sem categoria) |

---

## 9. Processo e Agentes Ativos

| Agente | Ativo | Quando |
|--------|-------|--------|
| Discovery Agent | Sim | Agora — elaboração do plano |
| Product Owner | Não (N2 simplificado) | — |
| Senior Dev | Sim | Após aprovação do plano |
| QA Engineer | Sim (smoke básico) | Após implementação |
| Demais agentes | Não | Fora do escopo N2 |

**Gates obrigatórios (N2):**
- Aprovação explícita do plano pelo usuário
- Smoke test básico pós-implementação (funcionalidades principais testadas manualmente)

---

## 10. Perguntas em Aberto

- [ ] A seção de gerenciamento de categorias fica onde exatamente na aba Cartão? Sugestão: seção fixa no topo da aba (antes dos cards de cartão), similar ao cabeçalho de recorrentes. Alternativa: dentro de cada card. Aguardando decisão do usuário antes da Fase 2.
- [ ] Gastos vinculados a categoria devem aparecer agrupados sob o label da categoria na fatura (substituindo a lista individual), ou aparecem duas vezes (uma vez na categoria, outra na lista)? Sugestão: aparecem apenas na seção de categoria — a lista normal exibe somente gastos sem categoria.
- [ ] Na projeção, o delta de categoria deve aparecer como linha nomeada no detalhamento (quando houver detalhamento futuro) ou apenas somar ao total do cartão? Para este sprint: apenas soma ao total — sem mudança na UI de projeção.

---

## 11. Próximos Passos (após aprovação)

1. Dev inicia pela Fase 1 (store + CRUD em db.js) — menor risco, base para tudo
2. Resolver as perguntas em aberto antes de iniciar Fase 2 e Fase 4
3. Usar backup `financas_backup_20260626.json` para testar upgrade do IndexedDB com dados reais
4. Ao concluir, executar smoke test cobrindo: criar categoria, vincular a gasto, verificar fatura, verificar projeção futura

---

*Plano elaborado pelo Discovery Agent em 2026-06-27.*
