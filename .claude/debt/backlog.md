# Backlog de Débito Técnico — Financas

> Arquivo append-only. Registrar débitos identificados pelo Code Reviewer ou Senior Dev.
> Revisar e priorizar na Retrospectiva de cada ciclo.

---

## Débitos identificados em 2026-06-26

### [DT-001] cards.js com 1.030 linhas — dividir em módulos
- **Impacto:** Alto — dificulta manutenção, edição e revisão; maior arquivo do projeto (~48KB)
- **Proposta:** Separar em `cards-cartoes.js` (cartões CRUD + render) e `cards-gastos.js` (gastos + faturas + recorrentes)
- **Risco:** Médio — funções se referenciam mutuamente; requer mapeamento cuidadoso das dependências
- **Status:** No roadmap como item #1

### [DT-002] CSS inline em index.html (~2.000 linhas)
- **Impacto:** Médio — arquivo monolítico dificulta edição de estilos
- **Proposta:** Extrair para `style.css` separado
- **Risco:** Baixo — mudança estrutural sem lógica
- **Status:** Não priorizado

### [DT-003] Sem testes automatizados
- **Impacto:** Médio — regressões detectadas manualmente; 18 bugs históricos catalogados
- **Proposta:** Testes unitários para funções críticas: getActiveSubitems, getFaturaMonth, dueMonthOffset, export/import
- **Risco:** Baixo — adiciona camada sem alterar código existente
- **Status:** Não priorizado

### [DT-005] Bug em saveRecorrenteEdit — uso de variáveis antes da declaração
- **Arquivo:** `js/cards-modal.js` (originalmente `js/cards.js` linhas 745-746)
- **Descrição:** Nas linhas iniciais do bloco `try` de `saveRecorrenteEdit`, `name` e `value` são referenciados em `if(!name)` e `if(value<=0)` antes das suas declarações `const name = ...` e `const value = ...` que aparecem logo abaixo. Em modo estrito (`'use strict'`) isso causaria ReferenceError. No modo sloppy (não-strict) o JavaScript eleva a declaração mas não o valor, então `name` seria `undefined` e a validação seria redundante/incorreta. As verificações de validação duplicadas logo após as declarações (linhas 751-752) funcionam corretamente.
- **Impacto:** Baixo — a função possui validações redundantes corretas após as declarações que cobrem o mesmo caso. O bug nas linhas 745-746 torna as primeiras validações mortas/incorretas mas não quebra o fluxo pois as segundas (linhas 751-752) funcionam.
- **Proposta de fix:** Remover as verificações duplicadas das linhas 745-746 (antes das declarações) e manter apenas as linhas 751-752 (após as declarações).
- **Identificado em:** Sprint 1 — Split de cards.js (2026-06-26)
- **Status:** Não corrigido (fora do escopo do Sprint 1 — RT-04)

### [DT-006] `delOne` em `deleteBudgetItem` sem invalidar cache de `budgetDone`
- **Arquivo:** `js/budget.js` — função `delOne` dentro de `deleteBudgetItem`
- **Descrição:** Abre `db.transaction('budgetDone','readwrite')` diretamente sem chamar `invalidateCache('budgetDone')` após deletar. Viola Regra #13 do CONTEXT.md. Cache pode ficar stale se o usuário deletar itens de orçamento com realizações na mesma sessão sem reload.
- **Impacto:** Baixo — manifestação requer cache populado + deleção de série na mesma sessão
- **Proposta:** Adicionar `invalidateCache('budgetDone')` após a Promise em `delOne`
- **Identificado em:** Code Review Sprint 2 (2026-06-26) — pré-existente, não introduzido pelo sprint
- **Status:** Não corrigido

### [DT-007] Delta de projeção de categoria ignora pessoaFilter
- **Status:** ✅ RESOLVIDO na Sprint 5 — delta removido; categorias entram via `calcCategoriaRealizado` em `renderProj` separado do fluxo de cartões

### [DT-008] Ordenação da seção "Por Categoria" por ordem de inserção
- **Status:** ✅ RESOLVIDO na Sprint 5 — seção "Por Categoria" em cards-render.js passa a ler de `budgetAll()` com `categoriaKey`

### [DT-004] projection.js — projeção não considerava budget nem cartões
- **Status:** ✅ RESOLVIDO — projeção agora inclui itens de budget pendentes, faturas de cartão e saldo restante de categorias orçadas

---

## Débitos identificados em 2026-06-27 — Code Review Sprint 5

### [DT-009] Funções legadas de categoria não removidas de cards-modal.js
- **Arquivo:** `js/cards-modal.js` — funções `showAddCategoriaModal`, `showEditCategoriaModal`, `saveCategoria`, `saveEditCategoria`, `deleteCategoria` (~linhas 652–762)
- **Descrição:** As cinco funções de gerenciamento de categorias da Sprint 4b continuam presentes em cards-modal.js. Nenhuma delas é chamada por nenhum ponto do HTML ou de outros JS após a Sprint 5. São código morto que mantém dependência de `categoriasCartaoAll/Add/Put/Del` e cria risco de chamada acidental.
- **Impacto:** Baixo — sem efeito funcional; risco de confusão de manutenção
- **Proposta:** Remover as cinco funções em próxima sprint de limpeza, após confirmar que não há referências residuais no HTML
- **Introduzido em:** Sprint 4b — sobreviveu à Sprint 5 (escopo da Sprint 5 previa remoção, mas não foi executada)
- **Identificado em:** Code Review Sprint 5 (2026-06-27)
- **Status:** Não corrigido — registrado para próxima sprint de limpeza

### [DT-010] calcCategoriaRealizado silencia gastos de categoria sem cartão encontrado
- **Arquivo:** `js/budget.js` — função `calcCategoriaRealizado` (~linha 815)
- **Descrição:** Se um gasto tem `categoriaId` correto mas `g.cartaoId` não existe no array `cartoes` (cartão deletado), o gasto é silenciosamente ignorado (`if(!gc)continue`). O usuário verá realizado menor que o real sem nenhum aviso.
- **Impacto:** Baixo — afeta apenas gastos cujo cartão foi deletado mas o gasto permanece órfão na store
- **Proposta:** Logar `console.warn` para facilitar debug; ou somar o gasto pelo `g.value` bruto quando cartão não for encontrado
- **Identificado em:** Code Review Sprint 5 (2026-06-27)
- **Status:** Não corrigido
