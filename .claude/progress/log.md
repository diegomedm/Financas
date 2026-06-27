# Log de Progresso — Financas

> Arquivo append-only. Nunca editar entradas existentes. Sempre adicionar no topo.

---
**2026-06-27 — Senior Software Engineer**
- Feito: Sprint 3 implementado — dois gráficos Chart.js no dashboard
- Decisões: arrow functions evitadas em callbacks Chart.js (mobile safety); label do primeiro mês do Gráfico B sempre inclui "/AA"; destroy+innerHTML antes de new Chart para limpar canvas fantasma sem depender de .destroy() sozinho; renderCharts chamado dentro do try de renderDash para aproveitar catch existente
- Artefatos: js/globals.js (2 variáveis novas), js/transactions.js (renderCharts + _renderChartComposition + _renderChartHistory + chamada em renderDash), index.html (2 containers + script chart.min.js), sw.js (cache v5 + entrada chart.min.js)
- Pendências: Code Reviewer revisar; QA validar CAs da spec; confirmar que js/chart.min.js UMD 4.4.4 está presente no repo; revisar com PO se Gráfico B deve respeitar pessoaFilter (spec US-04 indica sim — implementação atual usa all sem filtro)
---

---
**2026-06-26 — QA Engineer**
- Feito: Verificações estáticas Sprint 2 — 17/17 checks PASSOU; plano de testes produzido com 23 CTs
- Decisões: nenhum bloqueante estático encontrado; Sprint 2 liberado para validação manual no browser
- Artefatos: `.claude/specs/sprint-2-simplificacao-qa.md` (plano completo com CT-001 a CT-023)
- Pendências: usuário executar checklist manual e reportar resultado por CT para veredicto final do QA
---
**2026-06-26 — Senior Software Engineer**
- Feito: Sprint 2 implementado — 3 mudanças em js/transactions.js, js/budget.js e index.html
- Decisões: option `fixed` condicional ao isEdit no entryFormHtml; addSubitem diferencia área TX vs Budget pelo ID; onRecurChange removida; enrichedRows removido (era exclusivo do recent-list); _toggleBudgetDoneInternal recebe doneDate como parâmetro; bloco cartao_ inalterado
- Artefatos: js/transactions.js, js/budget.js, index.html, .claude/progress/current.md
- Pendências: Code Review + QA validar critérios de aceite da spec sprint-2-simplificacao.md
---

---
**2026-06-27 — Sprint 2 — CONCLUÍDO**
- Feito: 3 mudanças implementadas, revisadas e validadas — push realizado
- 2a: Form TX simplificado (removido `fixed`, `area-recur`, `area-parcela`, repeat em subitems)
- 2b: Dashboard removeu seção "últimos lançamentos" (`recent-list`)
- 2c: Budget "marcar como realizado" agora tem campo de data pré-preenchido com hoje
- Fix extra: `showConfirm` corrigido de `textContent` para `innerHTML` (bug descoberto no teste manual)
- Débitos: DT-006 registrado (`invalidateCache` ausente em `delOne` — pré-existente)
- Artefatos: `js/transactions.js`, `js/budget.js`, `index.html`, `js/utils.js`
---
---
**2026-06-26 — Sprint 1 — CONCLUÍDO + Sprint 2 iniciado**
- Feito: Verificação Playwright automatizada do Sprint 1 — 12/12 checks PASS
- Feito: Push para GitHub realizado pelo usuário — deploy no GitHub Pages
- Feito: Sprint 2 iniciado (Product Owner acionado)
- Artefatos: Script Playwright em temp; sprint-1-cards-split-qa.md
- Pendências: Spec do Sprint 2 (PO), implementação (Dev), review, QA
---
---
**2026-06-26 — QA Engineer**
- Feito: Plano de testes QA produzido para Sprint 1 — Split de cards.js
- Verificações estáticas concluídas: CA-11 (PASSOU), CA-12 (PASSOU), CA-14 (PASSOU)
- Confirmado: node --check exit 0 em ambos os arquivos; sw.js com financas-v4; ordem de scripts correta; sem export/import; JSON.stringify em onclick é pré-existente (linha 915 do cards.js original)
- Artefatos: `.claude/specs/sprint-1-cards-split-qa.md` (plano de testes com checklist manual para CA-01 a CA-10 e CA-13)
- Pendências: usuário executar checklist manual no navegador e reportar resultado
---
---
**2026-06-26 — Code Reviewer**
- Feito: Code Review completo do Sprint 1 — Split de cards.js
- Resultado: APROVADO — nenhum bloqueante identificado
- Verificado: 33 funções/constantes em cards-modal.js e 7 funções em cards-render.js — contagem correta, sem duplicação, sem esquecimento
- Verificado: sem export/import/IIFE de módulo nos dois novos arquivos
- Verificado: ordem de scripts no index.html correta; sw.js com CACHE financas-v4; cards.js removido
- Verificado: node --check exit 0 em ambos; JSON.stringify em onclick e bug TDZ em saveRecorrenteEdit são pré-existentes
- Pendências: QA Engineer validar CA-01 a CA-14 conforme spec sprint-1-cards-split.md

**2026-06-26 — Senior Developer**
- Feito: Split de js/cards.js (1.030 linhas) em js/cards-modal.js (33 funções/constantes) e js/cards-render.js (7 funções)
- Feito: node --check em ambos os arquivos — exit code 0 confirmado
- Feito: index.html atualizado — cards.js substituído por cards-modal.js + cards-render.js na posição original (linha 563/564)
- Feito: sw.js atualizado — CACHE bumped para financas-v4, cards.js removido, dois novos arquivos adicionados
- Feito: js/cards.js removido do repositório
- Feito: Bug pré-existente registrado como DT-005 (saveRecorrenteEdit usa name/value antes da declaração) — não corrigido (RT-04)
- Pendências: Code Review aprovar antes de fechar sprint 1
---
**2026-06-26 — Product Owner**
- Feito: Leitura completa de js/cards.js (1.030 linhas), index.html e sw.js para embasar a spec
- Feito: Criação de `.claude/specs/sprint-1-cards-split.md` com objetivo, escopo, 14 cenarios de aceite em BDD, DoD completo e 6 restricoes tecnicas obrigatorias
- Feito: Mapeamento de todas as 33 funcoes/constantes para seus arquivos de destino (cards-modal.js vs cards-render.js)
- Decisoes: getCartaoFaturaGastos e getCartaoFaturaTotal vao para cards-render.js (consulta/calculo de render) apesar de estarem no topo do arquivo original
- Decisoes: CARD_COLORS e CARD_COLOR_NAMES vao para cards-modal.js pois sao usadas em showAddCartaoModal
- Artefatos: `.claude/specs/sprint-1-cards-split.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendencias: Senior Developer implementar o split; Code Reviewer validar antes de fechar
---
**2026-06-26 21:19 — Retomada / Mapeamento**
- Feito: Mapeamento completo do projeto via agentes de exploração paralela
- Feito: Execução do init.sh — estrutura `.claude/` criada
- Feito: Population de todos os arquivos .claude/ com contexto real (product.md, architecture.md, inventory/project.md, glossary.md, current.md, log.md, debt/backlog.md)
- Decisões: Nenhuma de implementação — apenas setup de contexto
- Artefatos: `.claude/` com todos os subdiretórios e arquivos populados
- Pendências: Orchestrator-cto coordenar execução do roadmap (4 itens)
---

---
**2026-06-26 21:19 — Inicialização via init.sh**
- Feito: Estrutura .claude/ criada via bash init.sh
- Artefatos: Diretórios e arquivos base da estrutura de contexto
- Pendências: Popular arquivos com contexto real do projeto
---
