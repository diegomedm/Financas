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

### [DT-004] projection.js muito simples (36 linhas)
- **Impacto:** Baixo — projeção não considera budget nem cartões, apenas TX passados
- **Proposta:** Enriquecer com dados de orçamento para projeção mais precisa
- **Status:** Não priorizado
