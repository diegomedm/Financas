# Log de Progresso — Financas

> Arquivo append-only. Nunca editar entradas existentes. Sempre adicionar no topo.

---

**2026-06-27 — QA Engineer**
- Feito: Verificação estática completa da Sprint 5 — 12 itens do checklist analisados
- Decisões: VEREDICTO ESTÁTICO: LIBERADO. Nenhum bloqueante. JSON.stringify em cards-render.js linha 158 é legado pré-Sprint 5, com mitigação .replace, não introduzido nesta entrega.
- Artefatos: .claude/progress/current.md (atualizado), .claude/progress/log.md (esta entrada). Plano de smoke test manual (ST-01 a ST-08) entregue ao usuário.
- Pendências: Usuário deve executar smoke test manual no browser (ST-01 a ST-08) antes do commit.

---

**2026-06-27 — Senior Dev**
- Feito: Aplicados fixes DT-009 e DT-010 pré-smoke test. DT-009: removido bloco completo de código morto (5 funções + comentário de bloco) de `js/cards-modal.js` após grep confirmar zero referências externas. DT-010: adicionado `console.warn` antes do `continue` em `calcCategoriaRealizado` em `js/budget.js`.
- Decisões: remoção do DT-009 confirmada segura via grep em HTML e todos os JS — nenhuma referência externa encontrada.
- Artefatos: `js/cards-modal.js` (bloco CATEGORIAS CARTAO removido), `js/budget.js` (console.warn adicionado)
- Pendências: smoke test manual pelo QA; commit aguarda aprovação.

---

**2026-06-27 — Code Reviewer**
- O que foi feito: Code Review da Sprint 5 — Migração de Categorias para o Orçamento. Revisados 4 arquivos JS e index.html.
- Decisões: APROVADO COM RESSALVAS — nenhum bloqueante; 2 apontamentos importantes (DT-009 funções legadas em cards-modal.js, DT-010 gasto sem cartão silenciado em calcCategoriaRealizado); node --check passou em todos os arquivos; nenhuma violação de restrições técnicas.
- Artefatos: .claude/debt/backlog.md (DT-009 e DT-010 adicionados), .claude/progress/current.md (atualizado), .claude/progress/log.md (esta entrada)
- Pendências: Dev decide sobre DT-009 e DT-010 antes de passar para QA; DT-007 e DT-008 da Sprint 4b resolvidos automaticamente pela Sprint 5 (delta removido, seção Por Categoria lê budget)

---

**2026-06-27 — Senior Dev**
- Feito: Implementação completa da Sprint 5 — Migração de Categorias para o Orçamento em 4 arquivos JS
- Decisões: (1) `calcCategoriaRealizado` implementada como função síncrona pura recebendo arrays pré-carregados; (2) `onBudgetCategoriaToggle` como função auxiliar para atualizar o slug ao marcar toggle; (3) `#categorias-cartao-section` ocultado via `display:none` em vez de apenas esvaziar innerHTML, eliminando espaço visual residual; (4) `_popularCategoriaTx` extraída como função auxiliar reutilizada em `showAddModal` e `showEditModal`
- Artefatos: `js/budget.js` (toCategoriaKey, onBudgetCategoriaToggle, campo categoriaKey no modal, calcCategoriaRealizado, barra de progresso no renderBudget, categoriaKey em saveBudgetItem/saveBudgetEdit), `js/cards-render.js` (remoção do delta getCartaoBudgetItems, seção "Por Categoria" lê budgetAll, seção categorias removida), `js/cards-modal.js` (select #cg-categoria via budgetAll), `js/transactions.js` (select #f-categoria, _popularCategoriaTx, categoriaId em getFormValues/saveEntry/updateEntry)
- Pendências: Smoke test manual no browser (10 passos do DoD) — aguarda Code Reviewer antes do commit

---

**2026-06-27 — Product Owner**
- Feito: Leitura completa de `plan-sprint5-categorias-budget.md`, `db.js`, `budget.js`, `cards-render.js`, `cards-modal.js`, `transactions.js` e `projection.js`. Escrita da spec completa da Sprint 5.
- Decisões: (1) `calcCategoriaRealizado` deve receber dados pré-carregados como parâmetro para evitar múltiplos round-trips ao cache IDB dentro do loop de `renderBudget`; (2) `projection.js` confirmado como não precisando de alteração — usa apenas `citem.value` de `getCartaoBudgetItems`; (3) Orphans da Sprint 4b tratados silenciosamente em todos os contextos (budget, fatura, modais).
- Artefatos: `.claude/specs/sprint-5-categorias-budget.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendências: Implementação pela Fase 1 (`budget.js`) — aguarda Senior Dev

---
**2026-06-27 — Discovery Agent**
- Feito: Leitura completa de db.js, budget.js, cards-render.js, cards-modal.js, transactions.js e progress/current.md para entender o estado da Sprint 4b
- Decisões: Classificado como N2 (refatoração interna com dados reais, escopo delimitado); estratégia de orphan para dados antigos da categoriasCartao; store categoriasCartao mantida como legado sem ser deletada; sem bump de versão do IDB
- Artefatos: .claude/discovery/plan-sprint5-categorias-budget.md, .claude/progress/current.md atualizado
- Pendências: Aprovação do usuário; leitura de js/projection.js antes da implementação (risco identificado no plano)
---
**2026-06-27 — Senior Software Engineer**
- Feito: Sprint 4b implementado — categorias orçadas de cartão (store categoriasCartao, CRUD modal, select no gasto, seção Por Categoria na fatura, delta na projeção)
- Feito: Fix bug bloqueante saveRecorrenteEdit (DT-005) — declarações movidas antes das validações
- Feito: Fix erro de carregamento da aba Cartão — guard db.objectStoreNames.contains em categoriasCartaoAll() para retrocompatibilidade com banco v5
- Feito: SW bumpeado para v7 para forçar recarga dos arquivos
- Decisões: guard de store em db.js como solução de retrocompatibilidade enquanto SW antigo ainda serve arquivos em cache
- Artefatos: js/db.js, js/cards-modal.js, js/cards-render.js, index.html, sw.js
- Pendências: validação manual completa pelo usuário (32 CTs em sprint-4b-categorias-cartao-qa.md)
---
**2026-06-27 — QA Engineer**
- Feito: Verificação estática completa do Sprint 4b (db.js, cards-modal.js, cards-render.js, index.html) — 12/12 checks passaram; node --check exit 0 nos 3 JS; CRLF zerado confirmado; categoriaId antes do groupId confirmado; JSON.stringify apenas na linha pré-existente 175; guard !contains em todas as 8 stores; #categorias-cartao-section no index.html
- Feito: Plano de 32 casos de teste manuais cobrindo CA-01 a CA-07 (7 blocos) + RN-006
- Decisões: sort de gastos na fatura (linha 202) produz ordem crescente — não bloqueante pois pré-existente; registrado para débito técnico; veredicto estático = LIBERADO para testes manuais
- Artefatos: `.claude/specs/sprint-4b-categorias-cartao-qa.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendências: execução dos 32 CTs pelo usuário; veredicto final QA após execução; CT-029-031 requerem backup G:\Meu Drive\financas_backup_20260626.json
---
**2026-06-27 — Senior Software Engineer**
- Feito: Implementação completa da spec sprint-4b-categorias-cartao.md
- Decisões: IIFE síncrona dentro do template literal para seção "Por Categoria" (sem nested backtick); `cats` carregado UMA VEZ no início de `renderCards()` e reutilizado em toda a função; delta de projeção iterando `allGastos` diretamente (sem nova query async) para calcular `catGlobalTotals`
- Artefatos: `js/db.js` (bump 5→6, store categoriasCartao, 4 CRUD), `js/cards-modal.js` (modal categoria, select no modal gasto, categoriaId em saveGasto/saveGastoEdit), `js/cards-render.js` (seção gerenciamento topo, seção "Por Categoria" na fatura, delta getCartaoBudgetItems), `index.html` (container #categorias-cartao-section)
- Pendências: node --check passou exit 0 em todos os 3 JS; Code Reviewer e QA pendentes; teste de upgrade IndexedDB com backup real pendente

---
**2026-06-27 — Product Owner**
- Feito: Leitura de cards-modal.js, cards-render.js, db.js e plan-sprint4b-categorias.md para embasar spec
- Feito: Criação de `.claude/specs/sprint-4b-categorias-cartao.md` — spec completa com 7 blocos de CAs (CA-01 a CA-07) em BDD, 11 RNs, tabela de arquivos a modificar, DoD e 6 riscos documentados
- Decisões: seção de gerenciamento de categorias no topo da aba Cartão (fora do loop de cartões); lista de gastos mantém todos os itens + seção adicional "Por Categoria"; delta de projeção global (uma vez por categoria, não por cartão); `categoriaId` orphan tratado como null; select populado no setTimeout existente; onclick do modal via setTimeout seguindo padrão de showAddRecorrenteModal; risco crítico documentado sobre saveGastoEdit parcelado precisar capturar categoriaId antes do bloco groupId
- Artefatos: `.claude/specs/sprint-4b-categorias-cartao.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendências: Dev implementar nas 5 fases; testar upgrade IndexedDB com backup real; QA do Sprint 4 ainda pendente de execução
---

---
**2026-06-27 — Discovery Agent**
- Feito: Leitura de db.js, cards-modal.js, cards-render.js, projection.js para entender impacto da feature de categorias orçadas
- Feito: Elaboração do plano `plan-sprint4b-categorias.md` — N2 MVP, 5 fases, estimativa ~4h45min
- Decisões: nova store `categoriasCartao` (bump versão IndexedDB 5->6); campo `categoriaId` optional em gastos; delta de projeção calculado em `getCartaoBudgetItems()` sem alterar projection.js; categoria global (não por cartão)
- Artefatos: `.claude/discovery/plan-sprint4b-categorias.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendências: aprovação do plano pelo usuário; 3 perguntas em aberto sobre UI antes de iniciar Fase 2 e Fase 4
---

---
**2026-06-27 — QA Engineer**
- Feito: Verificação estática dos 4 arquivos do Sprint 4 (globals.js, projection.js, pessoas.js, index.html) — node --check aprovado nos 3 JS; sem violações de restrições técnicas introduzidas por esta sprint
- Feito: Elaboração de 24 casos de teste manuais cobrindo todos os 5 CAs da spec (CA-01 a CA-05) + RNs relevantes
- Decisões: nested template literals em pessoas.js linhas 55/60 são pré-existentes (git diff confirmado) — não bloqueiam esta sprint; formato de chave budgetDone em projection.js validado como consistente com db.js
- Artefatos: `.claude/specs/sprint-4-projecao-qa.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendências: execução dos testes manuais; veredicto final QA após execução
---

---
**2026-06-27 — Product Owner**
- Feito: Leitura de index.html, globals.js, projection.js, budget.js, transactions.js, db.js, utils.js, app.js para embasar spec do Sprint 4
- Feito: Criação de `.claude/specs/sprint-4-projecao.md` — spec completa com 3 mudanças, 5 blocos de CAs em BDD, 8 RNs, tabela de arquivos a modificar, DoD e 5 riscos documentados
- Decisões: usar `item.value` diretamente para items com `subRepeatStart` (não calcular subitems ativos — fora do escopo); items sem `pessoaId` excluídos quando filtro ativo (consistência com `renderBudget()`); chave localStorage `'projPeriods'` com fallback para 3 e validação de valor aceito
- Artefatos: `.claude/specs/sprint-4-projecao.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendências: Tech Lead validar acesso a `_budgetDoneAll()` e padrão de chamada única de budget/done antes do loop; Code Review + QA Sprint 3 ainda pendentes
---

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
