# Log de Progresso — Financas

> Arquivo append-only. Nunca editar entradas existentes. Sempre adicionar no topo.

---

**2026-07-10 — Sessão direta (commit, push e deploy autorizados pelo usuário)**
- Feito: usuário autorizou explicitamente commit + push, encerrando o ciclo de trabalho acumulado
  (redesign visual completo + correções de dados + novas features de Orçamento) que vinha sendo
  segurado desde o início do redesign, a pedido do próprio usuário.
- Commit `f3e6817` — "feat: redesign visual completo + correções de dados + novas features de
  Orçamento" (30 arquivos, +8432/-758 linhas). Revisão de diff feita antes do commit (scan por
  segredos/tokens, checagem de arquivos staged) — nada suspeito encontrado.
- Push para `origin/main` bem-sucedido (`c8af194..f3e6817`).
- GitHub Pages atualizado automaticamente (sem workflow custom, deploy direto da branch main) —
  **usuário confirmou a atualização testando pelo celular real**.
- Decisões: a partir de agora, testes passam a ser feitos no dispositivo real (produção) em vez de
  só Playwright — ajustes subsequentes devem ser validados no ambiente de dev local antes de sugerir
  novo commit/push, mantendo a mesma regra de nunca commitar sem autorização explícita.
- Pendências: usuário vai reportar ajustes ao vivo testando pelo celular (sessão em andamento);
  validação da pílula de status do Orçamento pelo usuário (spec em
  `.claude/specs/status-pill-orcamento.md`) ainda pendente.

---

**2026-07-10 — Sessão direta (correção do "Previsto" de categorias no resumo do Orçamento)**
- Feito: usuário notou que o campo Previsto (Despesa) do resumo de Orçamento subia quando uma
  categoria orçada estourava o valor planejado, em vez de ficar fixo no Valor Orçado Mensal
  cadastrado. Investigação em `_renderBudgetSummaryTable` (`js/budget.js`) confirmou: o Previsto
  somava `catRealizado + catExpense` (realizado + saldo restante limitado a não-negativo) — quando
  o gasto real ultrapassa o orçado, `catExpense` zera mas `catRealizado` sozinho já excede o valor
  original, empurrando o Previsto pra cima junto com o estouro.
- Corrigido: Previsto passou a somar o Valor Orçado Mensal fixo de cada categoria (`catOrcado`,
  nova variável agregada no loop de `renderBudget()`), que nunca varia com o gasto real. Realizado
  continua usando `catRealizado` normalmente, intocado — confirmado com o usuário que o ajuste
  deveria ser só no campo Previsto.
- Verificado impacto em outros campos (pedido explícito do usuário): a Projeção Mensal tem fórmula
  própria e semanticamente diferente (soma "saldo restante" para projetar o que falta gastar, não
  uma métrica de planejado), corretamente não tocada. `catExpense` ficou órfão na nova assinatura
  de `_renderBudgetSummaryTable` e foi removido (variável/cálculo morto).
- Artefatos: `js/budget.js` (`_renderBudgetSummaryTable` com nova assinatura, loop de agregação em
  `renderBudget`). Validado com Playwright: categoria orçada em R$900 com TX de R$1.400 vinculada —
  Previsto ficou fixo (R$7.319 antes/depois), Realizado subiu corretamente (R$190→R$1.590);
  cleanup restaurou o resumo exato; card de avulsos re-testado sem quebra; zero pageerrors.
  `sw.js` → `financas-v67`.
- Pendências: validação da pílula de status do Orçamento pelo usuário; teste em dispositivo móvel
  real (só depois de commit/push); commit/push aguardando autorização explícita do usuário.

---

**2026-07-10 — Sessão direta (explicação do cálculo da Projeção Mensal)**
- Feito: usuário perguntou se a Projeção Mensal considera os lançamentos avulsos além dos itens
  previstos do orçamento. Investigação no código confirmou que sim — `calcMonth()` (`js/utils.js`)
  soma TODAS as TXs do mês sem distinguir origem (`fromBudget` ou não), então avulsos já entravam
  na projeção; o problema era só a comunicação (nota do rodapé incompleta: "Inclui itens de
  orçamento pendentes"). Mockup em artifact aprovado pelo usuário antes de implementar.
- Implementado: rodapé da tabela atualizado para "Inclui lançamentos já feitos e itens pendentes
  do orçamento" + botão `ⓘ` que abre `showProjHelp()` (reaproveita `showConfirm()`), detalhando em
  bullets os 4 componentes do cálculo: lançamentos já feitos, itens de orçamento pendentes,
  faturas de cartão pendentes, saldo restante de categorias orçadas.
- Decisões: nenhuma mudança de lógica de cálculo — só de comunicação/UI. Reaproveitado
  `showConfirm()` (já usado pelas confirmações de exclusão) em vez de criar um componente de
  tooltip novo, por consistência visual e menor superfície de código.
- Artefatos: `js/projection.js` (`showProjHelp()`, rodapé de `renderProj()`). Validado com
  Playwright: botão presente no rodapé, sheet abre com o conteúdo correto, fecha ao clicar
  "Entendi", zero pageerrors. `sw.js` → `financas-v66`.
- Pendências: validação da pílula de status do Orçamento pelo usuário; teste em dispositivo móvel
  real (só depois de commit/push); commit/push aguardando autorização explícita do usuário.

---

**2026-07-10 — Sessão direta (card "Lançamentos avulsos do mês" no Orçamento)**
- Feito: usuário percebeu que o "Realizado" do resumo de Orçamento só contava itens do fluxo de
  Orçamento (marcados via `toggleBudgetDone`) — TXs lançadas direto pela aba Lançamentos, sem
  vínculo a nenhum item, não apareciam em nenhum resumo. Planejamento em 2 rodadas de perguntas
  (Skill de brainstorming implícito via AskUserQuestion) definiu: TXs com `categoriaId` ficam de
  fora do novo bloco (já contadas em Categorias Orçadas, evita duplicar); apresentação em card
  separado, não linha na tabela existente; resumo original fica intocado (métrica de aderência ao
  plano); card novo soma um "Saldo total do mês" (planejado + avulsos) sem misturar as métricas;
  estado vazio com mensagem textual, card permanece visível.
- Implementado: `_getAvulsosDoMes()` (filtra por `!fromBudget && !categoriaId`, respeitando
  pessoaFilter), `_renderBudgetAvulsosCard()` (renderiza `#budget-avulsos-card`, novo em
  `index.html`), `_renderBudgetSummaryTable()` passou a retornar `bRealSaldo` (reaproveitado como
  saldo planejado, evita duplicar a fórmula).
- Decisões: usar o campo `fromBudget` (já existente, setado por `toggleBudgetDone`) como
  discriminador de origem da TX — nenhum campo novo foi necessário no schema.
- Artefatos: `js/budget.js` (`_getAvulsosDoMes`, `_renderBudgetAvulsosCard`, retorno de
  `_renderBudgetSummaryTable`, integração em `renderBudget`), `index.html` (`#budget-avulsos-card`).
  Validado com Playwright: TX avulsa aparece, TX com categoria/fromBudget não aparece (evita
  duplicidade), saldo total bate matematicamente, estado vazio mostra a mensagem, zero pageerrors.
  `sw.js` → `financas-v65`.
- Pendências: validação da pílula de status do Orçamento pelo usuário; teste em dispositivo móvel
  real (só depois de commit/push); commit/push aguardando autorização explícita do usuário.

---

**2026-07-10 — Sessão direta (exclusão de gasto de cartão + patch cirúrgico em Cartões)**
- Feito: usuário reportou não conseguir mais excluir um gasto lançado em Cartões (lembrava de um
  "X" que não existe mais). Investigação no histórico do git confirmou que o app real NUNCA teve
  swipe ou botão de exclusão ali — o "X" lembrado vinha do protótipo de design (que usa botão
  Excluir no modal), não de uma versão anterior do app real. Optamos pelo padrão já usado em
  Lançamentos/Orçamento (swipe-to-action), não o padrão do protótipo, por consistência com o
  restante do app.
- Implementado: (1) swipe-to-action em `.cc-gasto-card` reaproveitando `swipeDown/swipeMove/
  swipeUp` genéricos, com patch cirúrgico via `patchGastoCard(id)`; (2) botão "Excluir" no modal de
  edição de gasto, igual ao padrão de Recorrências; (3) confirmação de exclusão trocada de
  `window.confirm()` nativo para `showConfirm()` (sheet estilizado), a pedido do usuário para
  manter consistência visual com o resto do app.
- Durante a validação, usuário reportou dois problemas de fluidez adicionais: expandir um cartão
  reanimava TODOS os cartões da lista, e "Ver mais gastos" reanimava TODOS os gastos já visíveis
  (não só os revelados) — ambos porque `toggleCardExpand`/`toggleShowAllGastosCard` chamavam
  `renderCards()` completo. Refatorado `renderCards()` extraindo `_cartaoCardHtml()` reutilizável
  com cache `_cardsRenderCtx`; `toggleCardExpand` passou a usar `patchCartaoCard(id)` (só recria o
  cartão clicado); `toggleShowAllGastosCard` passou a usar `patchCartaoTimeline(id)`, que faz
  reconciliação real dos grupos de dia (`.cc-day-group` identificados por `data-day-key`) — grupos
  já visíveis mantêm `animation:none`, só os recém-revelados ganham `animation:listItemIn`.
- Usuário também notou que o swipe de gasto estava "menos fluido" que os de Lançamentos/Orçamento.
  Causa raiz: `.cc-gasto-card` tinha `transition:transform .15s` + `:active{transform:scale(.98)}`
  na classe CSS base (efeito de toque de clique simples, herdado de antes do swipe existir) — esse
  `transform` da classe competia com o `translateX()` inline do gesto de arraste. Corrigido para o
  mesmo padrão de `.tx-item`/`.budget-item` (`transition:background .15s` + `:active{opacity:.85}`).
- Decisões: manter o padrão de swipe do app real (não do protótipo) para gasto de cartão; qualquer
  patch cirúrgico futuro em listas aninhadas deve seguir o padrão de reconciliação por chave (aqui
  `data-day-key`), não recriação completa — reaproveitável em outras listas agrupadas do app.
- Artefatos: `js/cards-render.js` (refatoração grande: `_cartaoCardHtml`, `_cartaoTimelineHtml`/
  `_cartaoTimelineGroups`/`_cartaoDayGroupHtml`, `patchCartaoCard`, `patchCartaoTimeline`,
  `gastoCardHtml`, `patchGastoCard`, `onSwipeEditGasto`), `js/cards-modal.js` (botão Excluir no
  modal de gasto, `showConfirm` em vez de `confirm()` nativo), `index.html` (CSS de
  `.cc-gasto-card` corrigido). Validado com Playwright checando marcação de nós DOM e
  `animationName`/`transition` computados (não só presença visual) — zero pageerrors em todas as
  execuções. `sw.js` de `financas-v61` até `financas-v64`, incremental e validado a cada lote.
- Pendências: validação da pílula de status do Orçamento pelo usuário; teste em dispositivo móvel
  real (só depois de commit/push); commit/push aguardando autorização explícita do usuário.

---

**2026-07-10 — Sessão direta (inventário completo de todos os modais, novo + edição)**
- Feito: usuário pediu para confirmar que a checagem de regressão anterior cobriu TODOS os campos
  de TODOS os modais em ambos os modos (novo e edição), não só presença superficial de alguns.
- Rodado script Playwright (`audit_modais.js`, scratchpad da sessão) que abre cada modal via as
  funções reais do app (`showAddModal`/`showEditModal`, `showBudgetAddModal`/`showBudgetEditById`,
  `showAddGastoModal` com/sem gasto, `showAddCartaoModal` com/sem cartão,
  `showAddCategoriaModal`/`showEditCategoriaModal`, `openGoalModal`, `showAddPessoaModal`/
  `showEditPessoaModal`) e inventaria via `#modal-content` — a estrutura real do modal é
  `#modal-overlay` > `#modal` > `#modal-content`, com visibilidade controlada pela classe `.open`
  no overlay (não achar isso na primeira tentativa foi o motivo do script anterior falhar com
  "modal not found" em todos os casos).
- Resultado: **13 modais inventariados (10 tipos, novo+edição onde aplicável), zero pageerrors,
  todos os campos/labels/botões da spec do protótipo presentes** — incluindo casos condicionais
  como o toggle "Mover para o período" (só aparece em edição de item de orçamento com `delayed`)
  e o botão duplicar ⧉ (só aparece em edição de TX). Nenhuma perda encontrada nesta camada.
- Artefatos: nenhum código de produto alterado; script de auditoria no scratchpad da sessão.
- Pendências: validação da pílula de status pelo usuário; commit/push aguardando autorização.

---

**2026-07-08 — Sessão direta (divergência de saldos + code review formal + auditoria de Pessoas)**
- Feito: corrigidas três causas raiz distintas de divergência de saldo entre Orçamento, Projeção
  Mensal, Projeção Diária e Horizonte de saldos — todas as 4 telas agora batem para o mesmo mês.
  Tratados os 8 findings de um code review formal pendente de sessão anterior. Corrigida opacidade
  do item de fatura de cartão marcado como "realizado" no Orçamento. Concluída auditoria de
  fidelidade visual de todos os componentes "Pessoa" (avatar/tag/chip) em Lançamentos, Orçamento,
  Cartões e Configurações contra a spec do protótipo.
- Decisões: manter `_budgetItemAppliesTo()` como função canônica única para aplicabilidade de item
  de orçamento por mês (Horizonte tinha lógica própria divergente, corrigido para reusar); ao
  reconciliar listas re-renderizadas, mover/atualizar nós existentes em vez de recriar
  (`_reconcileBudgetList`) para não reanimar itens que não mudaram; sempre aplicar `animation` CSS
  num wrapper externo, nunca no elemento que muda de opacidade por classe de estado dinâmica.
- Artefatos: `js/budget.js` (resumo do orçamento, `_reconcileBudgetList`, card de fatura com
  wrapper de animação separado, catches vazios com `console.warn`, `Promise.allSettled` em
  `renderBudget`, tags de pessoa com `fontSize:8`), `js/projection.js` (mês de referência em
  `renderProjDaily`/`renderHorizon`, remoção do filtro incorreto de `dueMonthOffset`, uso de
  `_budgetItemAppliesTo` no Horizonte), `js/cards-modal.js` (validação de cartão órfão em
  `saveGasto`/`saveGastoEdit`), `js/pessoas.js` (`personAvatarHtml` com parâmetro `fontSize`
  opcional), `js/transactions.js` e `js/cards-render.js` (tags/chips de pessoa com `fontSize:8`),
  `index.html` (CSS `.person-tag` ajustado para bater com a spec do protótipo). `sw.js` bumpado de
  `financas-v53` até `financas-v60` incrementalmente, validado a cada lote.
- Pendências: decisão sobre `chart.min.js` órfão; investigar seletor de cartão ausente no modal de
  gasto; teste em dispositivo móvel real (só depois de commit/push); commit/push aguardando
  autorização explícita do usuário.

---

**2026-07-08 — Sessão direta (spec da pílula documentada + regressão ampla do app real)**
- Feito: (1) spec da pílula de status documentada em `.claude/specs/status-pill-orcamento.md`
  para validação futura do usuário (que antecipou necessidade de ajustes) — inclui as 5 regras,
  a decisão de adaptação do mês de referência e 3 alternativas de ajuste já mapeadas.
  (2) Verificação ampla de que nada do app real se perdeu com os ajustes de fidelidade ao
  protótipo, em 3 camadas:
  - Checagem estática: 109 handlers `on*=` referenciados em `index.html` + templates JS,
    todos com função global definida — nenhuma função perdida em refactor.
  - Smoke Playwright completo: 7 telas renderizam (Dashboard com hero/donut/sparkline;
    Lançamentos com busca filtrando 4→1 e calendário; Cartões com 2 cards e modal de gasto
    com picker+categoria; Projeção mensal com gráfico+input custom, diária com 30 dias+Final,
    Horizonte com 256 células; Orçamento com 4 itens+resumo+categorias e modal completo com
    recorrência/atrasado/mês de venc./subitens; Configurações com todos os 16 controles;
    Relatório com as 5 seções). FAB contextual prioriza corretamente ("Item de orçamento"
    primeiro na tela de Orçamento). Zero pageerrors em todas as execuções.
  - Features exclusivas do app real (sem equivalente no protótipo): Export/Import (QA das 10
    etapas já aprovado), CRUD de pessoas, modal de cartão (cc-name/cc-fech/cc-venc/cc-limite),
    duplicar ⧉ (presente em modo edição, como no protótipo), metas em `financas-goals`,
    persistências (look/refMonth/lastUpdateHistory) — tudo íntegro.
- Resultado: **nenhuma perda encontrada.**
- Artefatos: `.claude/specs/status-pill-orcamento.md` (novo); scripts de teste no scratchpad.
- Pendências: validação da pílula de status pelo usuário; commit/push aguardando autorização.

---

**2026-07-08 — Sessão direta (implementação das 2 divergências finais do protótipo)**
- Feito: implementadas as 2 divergências mapeadas na revisão final. (1) Pílula de status dos itens
  de Orçamento — nova função `_budgetStatusPill()` em `budget.js` (fórmulas das linhas 2134-2141 do
  protótipo): "✓ Pago" quando realizado, "↪ Atrasado" para delayed explícito, "⚠ Atrasado" quando o
  vencimento passou (mês atual/passado), "Vence em Xd/hoje" quando ≤5 dias, "Pendente" nos demais.
  Aplicada nos dois tipos de card (item normal e fatura de cartão). (2) Legenda do Horizonte
  refeita conforme o protótipo (quadrados 8px raio 2px + swatch "Hoje" com fundo `var(--text)`,
  borda tracejada superior).
- Decisão de adaptação: avisos por proximidade de data ("Vence em Xd"/"⚠ Atrasado") só ativam
  quando o mês de referência (pin 📌) É o mês real do sistema — com pin em outro mês, comparar
  contra o relógio real marcaria tudo como atrasado; nesses casos o item mostra "Pendente" neutro.
  Segue a convenção estabelecida de refMonth/refYear como fonte de verdade.
- Mudanças visíveis derivadas (informadas ao usuário): rótulo "✅ Realizado" virou pílula "✓ Pago";
  badge antigo "⚠️ Atrasado" de delayed removido (a pílula cobre, e quando pago a pílula "✓ Pago"
  vence — comportamento do protótipo); classe CSS `.color-green-nowrap` órfã removida.
- Validação: Playwright em dois cenários — pin=Jun (≠mês real): tudo "Pendente" neutro ✓;
  pin=Jul (=mês real): "⚠ Atrasado" (venc. dia 5, vermelho), "Vence em 2d" (dia 10, âmbar),
  "Pendente" (dia 17) ✓; marcar como pago criou TX + toast ✓; ramos ✓ Pago/↪ Atrasado/Pendente
  validados unitariamente in-page ✓; grid e legenda do Horizonte ✓; resumo do mês íntegro ✓;
  sem pageerrors ✓; `node --check` passa em todos os .js. Dados de teste restaurados (TX órfã e
  budgetDone criados pelo teste removidos). `sw.js` → `financas-v61`.
- Artefatos: `js/budget.js`, `index.html`, `sw.js`.
- Pendências: commit/push aguardando autorização explícita; teste em dispositivo móvel real depois.

---

**2026-07-08 — Sessão direta (revisão minuciosa final do protótipo completo)**
- Feito: releitura integral do protótipo `.dc.html` (2.449 linhas — template das 7 telas + toda a
  lógica JS de estado) com verificação item a item contra o código real via grep dirigido.
  ~40 itens candidatos verificados: sparkline com drawLine no hero, "toque para marcar", input
  custom de meses (1-60) na Projeção, aviso de saldo negativo, nota "Inclui itens de orçamento
  pendentes", sublabel "atual", legenda da Diária, dia expandido, ícone mixed, Repetir último,
  Limpar histórico, toggle Atrasado + Mover para o período, select de Categoria em TX/Gasto,
  projLabel das metas, "Ver mais N gastos", confirm sheet custom, numpad, FAB contextual, presets,
  accent/mood/surface/heroStyle, OLED, tema automático, export/import — todos presentes e fiéis.
- **2 divergências mapeadas (aguardando decisão do usuário):**
  1. Badge de status dos itens de Orçamento — protótipo tem pílula de status calculada por data
     ("✓ Pago" / "↪ Atrasado" / "⚠ Atrasado" por vencimento passado / "Vence em Xd" quando ≤5 dias /
     "Pendente"); real só mostra "✅ Realizado", "⚠️ Atrasado" (apenas para delayed explícito) e
     badge "📅 dia" — a lógica de proximidade/estouro de vencimento não existe.
  2. Legenda do Horizonte de saldos — real usa círculos + texto "Texto sólido = Hoje"
     (index.html:807-810); protótipo usa quadrados 8px raio 2px incluindo um swatch "Hoje" com
     fundo var(--text), igual à legenda da Diária (que está fiel).
- Artefatos: nenhum código de produto alterado nesta varredura; `.claude/architecture.md` atualizado
  (chart.min.js removido da ordem de carregamento e débitos; seletor de cartão marcado resolvido).
- Pendências: decisão do usuário sobre as 2 divergências; commit/push aguardando autorização.

---

**2026-07-08 — Sessão direta (registro: chart.min.js e seletor de cartão concluídos)**
- Feito: usuário confirmou que os dois débitos pendentes já foram resolvidos em sessão anterior —
  `chart.min.js` órfão removido (deletado do working tree, sem referências em `index.html`/`sw.js`)
  e o seletor de cartão no modal de gasto tratado.
- Decisões: iniciar revisão minuciosa final do protótipo `.dc.html` completo, elemento a elemento,
  para mapear qualquer item ainda não coberto pelas auditorias anteriores — output será uma lista
  consolidada para o usuário decidir o que fazer com cada item.
- Artefatos: `.claude/progress/current.md` e este log.
- Pendências: revisão final do protótipo em andamento; teste em dispositivo móvel real (só depois
  de commit/push); commit/push aguardando autorização explícita do usuário.

---

**2026-07-08 — Sessão direta (QA das 10 etapas de Export/Import v6)**
- Feito: smoke test via Playwright das 10 etapas de import descritas em `architecture.md`
  (Pessoas → TX → Budget 1º passe → Budget 2º passe/`delayedFromId` → Cartões → Gastos → TX 2º
  passe/`fromCartao` → Recorrentes → BudgetDone/prefixo `cartao_` → lastUpdateHistory), em duas
  rodadas: dataset real do app (todos os counts dobraram corretamente ao reimportar o mesmo
  payload) e dataset sintético dedicado aos 3 remaps mais complexos (`delayedFromId`, `fromCartao`,
  `budgetDone` com chave composta `cartao_ID_yyyymm`), todos validados como corretos.
- Resultado: **nenhuma regressão** — a lógica de `js/config.js` (export/import) não foi alterada
  por nenhuma correção desta ou de sessões anteriores do redesign visual, e o teste confirma que as
  10 etapas continuam produzindo IDs remapeados consistentes, sem exceções.
- Decisões: nenhuma mudança de código necessária.
- Artefatos: nenhum arquivo de produto alterado. Scripts de teste no scratchpad da sessão
  (`test_export_import.js`, `test_export_import_edgecases.js`), não versionados.
- Pendências: decisão sobre `chart.min.js` órfão; investigar seletor de cartão ausente no modal de
  gasto; teste em dispositivo móvel real (só depois de commit/push); commit/push aguardando
  autorização explícita do usuário.

---

**2026-07-08 — Sessão direta (auditoria da tela Relatório)**
- Feito: auditoria elemento-a-elemento da tela Relatório (`page-report`, `js/report.js`) contra a
  spec do protótipo (linhas 869-958 do `.dc.html`) — última das 7 telas principais a receber esse
  nível de detalhe.
- Resultado: **nenhuma divergência encontrada.** As 5 seções (Comparado ao mês anterior — 3 cards
  com seta de variação; Maiores gastos do mês — top 5; Por categoria — barras de %; Recordes —
  maior gasto individual/melhor mês em receita/maior economia mensal; Evolução patrimonial 12
  meses — gráfico SVG com área de gradiente, linha e ponto final) já estavam implementadas com
  fórmulas idênticas à spec extraída, incluindo casos de borda (`prevHasData` para "sem dados no
  mês anterior", `patCrossesZero` para linha de zero pontilhada no gráfico). Título, header com
  botão Voltar (já usando a classe `.page-back-btn` corrigida em sessão anterior) e estilos de
  card/card-title conferem exatamente.
- Decisões: nenhuma mudança de código necessária — sessão de auditoria pura, validada com
  screenshots reais (dark e light theme, topo/meio/fim da rolagem) via Playwright.
- Artefatos: nenhum arquivo de código alterado. Servidor de preview local precisou ser reiniciado
  (`http.server` na porta 3000) — estava desligado desde a sessão anterior.
- Pendências: com Relatório confirmado, a auditoria visual elemento-a-elemento está **concluída em
  todas as 7 telas principais**. Restam: testar em dispositivo móvel real as correções de
  scroll/reload da sessão anterior; Code Review formal; QA dos 10 itens intocáveis; decisão sobre
  `chart.min.js` órfão; investigar seletor de cartão ausente no modal de gasto; commit/push
  aguardando autorização explícita do usuário.

---

**2026-07-08 — Sessão direta (bugs de scroll/reload reportados pelo usuário)**
- Feito: investigados e corrigidos três comportamentos "não-nativos" reportados pelo usuário após
  testar o preview no navegador desktop.
- Bug corrigido: indicador de pull-to-refresh (`#ptr-indicator`) aparecia sempre visível no topo da
  tela, sumindo só depois de um clique. Causa raiz: o elemento nunca tinha `opacity` inicial
  definida — ficava com o padrão do navegador (`1`, visível) até o primeiro evento de pointer
  disparar `_ptrIndicatorUpdate()` (`micro.js`) pela primeira vez, que só então setava
  `opacity:0`. Corrigido definindo `opacity:0` como estado inicial inline no HTML.
- Investigado: scroll aparecendo abaixo da bottom nav ao navegar entre telas (relatado como
  possivelmente específico do browser/preview). Não foi possível reproduzir overflow horizontal
  real via teste automatizado (Playwright) — `overflow-x` já era `visible` sem vazamento de
  largura detectável. Adicionado `overflow-x:hidden` em `html,body` como proteção defensiva
  (mudança segura, não afeta scroll vertical) — hipótese é reflow do navegador desktop durante a
  animação `translateX` da transição de tela introduzida na sessão anterior.
- Bug corrigido: fileira "Temas prontos" em Configurações mostrava barra de rolagem horizontal
  visível abaixo dos cards. Causa raiz: a classe `.ph-scroll` (usada no HTML para esconder a
  scrollbar mantendo o scroll funcional) existia no protótipo mas nunca tinha sido portada para o
  CSS real — ficava sem nenhum efeito. Adicionadas as regras (`scrollbar-width:none` para Firefox,
  `::-webkit-scrollbar{width:0}` para Chrome/Safari), único uso real da classe no código.
- Decisões: nenhuma decisão arquitetural nova — os três bugs eram lacunas de CSS/estado inicial,
  não decisões de design.
- Artefatos: `index.html` alterado (3 mudanças de CSS/HTML pontuais). `sw.js` v42 → v43.
- Pendências: as mesmas da entrada anterior — auditoria elemento-a-elemento da tela Relatório;
  Code Review formal; QA dos 10 itens intocáveis; decisão sobre `chart.min.js` órfão; investigar
  seletor de cartão ausente no modal de gasto; usuário ainda não testou as correções desta sessão
  em dispositivo móvel real (só preview de navegador desktop); commit/push aguardando autorização
  explícita.

---

**2026-07-08 — Sessão direta (auditoria de telas restantes + animações)**
- Feito: auditoria elemento-a-elemento concluída em Projeção, Orçamento e Configurações
  (Dashboard/Lançamentos/Cartões já haviam sido feitos em sessão anterior). Correções incluíram:
  gráfico SVG de saldo acumulado (ausente na Projeção mensal), ícones de movimento e cores de linha
  na Projeção diária, botão Horizonte com design correto, swipe-to-edit/delete em Orçamento
  (substituindo botões de emoji fixos), subitens de fatura de cartão migrados para o layout
  full-width, filtro de Pessoas reescrito (pills de texto coloridos por pessoa, sem avatares,
  fiel a `pessoaPillStyle()` do protótipo) aplicado nas 5 telas que o usam, remoção de padding
  duplicado no `body` que causava espaço extra de rolagem no Dashboard, card "Histórico de
  atualizações" movido do local errado (estava em Orçamento) para Aplicativo, seletor "Cor de
  destaque" implementado do zero em Configurações, reordenação dos cards de Configurações e dos
  controles de Aparência para bater com a ordem exata do protótipo, correção do bug que impedia o
  Tour guiado de aparecer (`display:none` inline vencendo `.open{display:flex}`).
- Feito: auditoria dedicada de animações em duas rodadas. Primeira rodada (keyframes/transições):
  transição direcional de tela por `navDir`, toast com scale+fade+barra de progresso encolhendo
  (+ clicável para fechar antes do tempo, pedido à parte), `listItemIn` corrigido e estendido a
  itens de Orçamento/Categorias (não tinham animação de entrada), `sheetUp`/`slideUp` com leve
  overshoot ao assentar, `popIn` em confirm dialog e expansão de item na projeção diária. Segunda
  rodada (estados `:active`/feedback de toque): descoberta de que classes genéricas inteiras
  (`.btn-ghost`, `.btn-danger`, `.tab`, `.nav-btn`) não tinham nenhum `:active` — afetava dezenas
  de botões. Corrigido também: FAB principal e menu, numpad customizado (bug real — usava
  `var(--bg5)`, nunca recriada por `buildTokens()`, perdendo feedback após troca de tema), toggle
  lista/calendário, células de calendário, alertas do Dashboard, card de Relatório, swatches de
  cor de pessoa, seletores de Aparência, ícones de categoria, itens de Metas de economia.
- Bug encontrado e corrigido (relatado pelo usuário): swipe em Lançamentos/Orçamento chamava
  `renderTx()`/`renderBudget()` completos a cada abrir/fechar, reiniciando a animação de entrada em
  TODOS os itens da lista simultaneamente ("parece que recarrega tudo"). Corrigido com patch
  cirúrgico por item — `patchTxCard(id)`/`patchBudgetCard(id)` substituem só o wrapper do item
  afetado via `outerHTML`, usando um cache do último array renderizado (`_txListCache`,
  `_budgetListCache`+`_budgetListCtx`). Validado via teste automatizado: os demais itens da lista
  preservam identidade de nó DOM durante o swipe.
- Bug encontrado e corrigido (relatado pelo usuário): botão FAB "pouco fluido". Causa raiz:
  `renderFab()` recriava `#fab-root` inteiro a cada toggle do menu, incluindo o
  `<svg id="fab-icon">` — o ícone nascia já na rotação final (`+`→`×`) em vez de a `transition`
  CSS animar suavemente. Corrigido: botão principal + ícone viraram nós DOM persistentes entre
  renders; só o submenu (que de fato entra/sai) é recriado via um container interno separado.
- Bug encontrado e corrigido (relatado pelo usuário): ripple de troca de tema nunca aparecia.
  Causa raiz idêntica a um bug já corrigido no Tour guiado numa sessão anterior mas não
  generalizado: `#theme-ripple-overlay` e `#flash-overlay` tinham `display:none` inline no HTML,
  que vence a regra CSS `.on{display:block}` mesmo com a classe aplicada via JS — o flash de
  conclusão de toast também estava quebrado pelo mesmo motivo. Corrigido movendo `display:none`
  para dentro da regra CSS base de cada overlay. Efeito confirmado visualmente (círculo expandindo
  do canto superior direito).
- Decisões: nova regra arquitetural documentada — overlays controlados por `classList.add()` nunca
  podem ter `display:none` inline no HTML; e listas que sofrem atualização de um único item
  (swipe, toggle) devem usar patch cirúrgico do nó específico em vez de re-render completo.
- Artefatos: `index.html`, `js/app.js`, `js/transactions.js`, `js/budget.js`, `js/projection.js`,
  `js/pessoas.js`, `js/appearance-ui.js`, `js/micro.js`, `js/planning.js`, `js/utils.js` alterados.
  `.claude/architecture.md` e `.claude/progress/current.md` atualizados. `sw.js` de v26 a v42
  (bump a cada lote de mudanças visuais/funcionais validado).
- Pendências: auditoria elemento-a-elemento da tela Relatório (única ainda não revisada); Code
  Review formal; QA dos 10 itens intocáveis; decisão sobre remover `chart.min.js` órfão;
  investigar se falta o seletor de cartão no modal de gasto (existe no protótipo, não confirmado
  no real); usuário pediu explicitamente para não fazer commit/push até completar validação.

---

**2026-07-07 — Sessão direta (auditoria visual + correções do Dashboard)**
- Feito: com as 7 fases do redesign visual implementadas, iniciada auditoria de fidelidade visual
  usando screenshots reais (Playwright + Chromium já disponíveis no ambiente) em vez de só leitura
  de código — usuário reportou que o preview local mostrava divergências que a auditoria estática
  anterior não pegou.
- Feito: reescrita completa da tela Dashboard (`index.html` `#page-dash`, `renderDash()` em
  `js/transactions.js`) para bater elemento a elemento com o protótipo: header com saudação + pin
  de mês embutido no label, hero de saldo, card Entradas/Saídas (novo), donut CSS de composição
  (substituiu Chart.js), Por Responsável com barra de progresso (novo), histórico 6 meses em barras
  CSS (substituiu Chart.js). `js/chart.min.js` ficou órfão — nenhum `new Chart()` restante.
- Bug encontrado e corrigido: hero de saldo usava `<button>` aninhado dentro de outro `<button>`
  (HTML inválido — navegador fecha automaticamente o elemento pai ao encontrar o filho), causando o
  card aparecer visualmente cortado (só o cabeçalho ficava dentro da borda/fundo; valor, sparkline e
  rodapé vazavam sem estilo). Corrigido trocando o container externo para `<div role="button"
  tabindex="0">`.
- Bug encontrado e corrigido: no tema claro, o gradiente do hero de saldo terminava em `bg2`
  (branco puro), quase idêntico ao fundo da página — card ficava com contraste insuficiente/quase
  invisível. Reforçada opacidade do accent e força da borda especificamente no tema claro em
  `js/theme.js` (`heroAlphaBg`/`heroAlphaBorder`/`heroDest`), preservando fidelidade no tema escuro.
- Decisões: metodologia de teste visual mudou de "ler código e inferir" para "screenshot real via
  Playwright com perfil de browser persistente" — sessões efêmeras de browser resetam o IndexedDB a
  cada execução, gerando falsos alarmes (ex.: investigação de "pessoas cadastradas sumindo" que era
  só perfil de browser novo, não bug real).
- Artefatos: `.claude/architecture.md` (reescrito, refletindo os 17 módulos JS reais e o Dashboard
  novo), `.claude/progress/current.md` (reescrito). `index.html`, `js/transactions.js`,
  `js/theme.js`, `js/globals.js`, `js/app.js` alterados. `sw.js` em v18.
- Pendências: auditoria visual detalhada nas demais telas (só Dashboard recebeu esse nível de
  detalhe); Code Review formal; QA dos 10 itens intocáveis; decisão sobre remover `chart.min.js`
  órfão; usuário pediu explicitamente para não fazer commit/push até completar validação.

---

**2026-07-07 — Senior Dev**
- Feito: retomada de sessão anterior interrompida por cota (Fase 5/6 do redesign) — nada havia sido
  implementado ainda (confirmado: `js/planning.js`/`js/micro.js` não existiam). Implementação completa
  de ambas as fases conforme `.claude/discovery/extracted-specs-fase56.md`. **Fase 5** (`js/planning.js`
  novo): alertas inteligentes no Dashboard (3 tipos — fatura ≤3 dias, categoria estourada, saldo
  projetado negativo em 12 meses; máx 3 exibidos); limite mensal de gasto livre (localStorage, card em
  Configurações → Orçamento, barra no Dashboard com thresholds 70%/100%); metas de economia (CRUD via
  bottom sheet, cálculo de ritmo médio/projeção de conclusão idêntico à spec). **Fase 6** (`js/micro.js`
  novo): pull-to-refresh customizado (fórmulas exatas — threshold 48px, resistência dy*0.5 capada em
  84px — adaptado para `document`/`window.scrollY` já que o app não tem um container `.ph-scroll` único
  como o protótipo); flash de cor sincronizado com toast (`fireFlash`, 2 linhas adicionadas em
  `toast()` de `js/utils.js`); 3 estados vazios ilustrados com CTA (Cartões, Categorias orçadas,
  Orçamento — textos exatos da spec; Lançamentos/Calendário já tinham empty state próprio de outras
  fases, não tocados); tour guiado (4 balões, textos exatos, acessível via Configurações → Aplicativo);
  splash screen (~1650ms, SVG sparkline com draw-on); micro-bounce no ícone do nav (1 linha em
  `showPage()` de `js/app.js`); dígitos "slot machine" (`renderSlotDigits`, pronta mas não substituindo
  o card de saldo existente — ver decisões); 20 ícones de categoria orçada (grid no modal, campo `icon`
  opcional persistido em `budget` — descobriu-se que `openCategoriaDetail`/lista já consumiam
  `cat.icon||'🏷️'`, implementado por outra fase em paralelo, então só faltava o picker de seleção).
- Decisões: (1) **Metas de economia em localStorage** (array JSON `financas-goals`), não IndexedDB —
  dados pequenos e não-transacionais, evita bump de versão em `js/db.js` compartilhado com risco de
  concorrência de outras fases rodando em paralelo na mesma sessão; (2) `renderSlotDigits()` implementada
  e pronta para uso mas **não aplicada** ao card de saldo do Dashboard — Fases 2/3 já tocaram esse card
  (gradiente `--hero-bg`, classe `.stat-value`) e reescrevê-lo é fora do escopo mínimo pedido; (3) ripple
  de tema (`fireThemeRipple()`) implementado e funcional, mas **não integrado** ao botão de toggle —
  `js/theme.js`/`js/appearance-ui.js` são de outra fase em paralelo nesta sessão, documentado como TODO
  no rodapé de `js/micro.js`.
- Artefatos: `js/planning.js` (novo), `js/micro.js` (novo), `index.html` (containers de alertas/limite/
  metas no Dashboard, card "Limite de gasto livre" e linha "Tour guiado" em Configurações, overlays de
  flash/ripple/splash/tour/pull-to-refresh, keyframes CSS novos), `js/transactions.js` (1 linha em
  `renderDash()`), `js/config.js` (preenchimento do input de limite em `renderCfg()`), `js/utils.js`
  (2 linhas em `toast()`), `js/app.js` (1 linha em `showPage()`, 1 linha em `init()`),
  `js/cards-render.js`/`js/budget.js` (troca de 3 empty states + picker de ícone no modal de categoria),
  `sw.js` (bump `financas-v13`→`financas-v14`, `js/planning.js`+`js/micro.js` adicionados ao cache).
  `node --check` passou nos 17 arquivos `.js` do projeto.
- Pendências: nenhum commit foi feito (aguardando aprovação). Smoke test manual do usuário, Code
  Reviewer e QA ainda pendentes para Fases 5 e 6, assim como para as pendências já herdadas de sessões
  anteriores (Fase 3 Cartões, sub-fase 1a Aparência). TODO documentado em `js/micro.js`: integrar
  `fireThemeRipple()` ao botão de toggle de tema quando `js/theme.js`/`js/appearance-ui.js` estiverem
  livres de outras fases em paralelo.

---

**2026-07-07 — Senior Dev**
- Feito: retomada de sessão anterior interrompida por cota (Fase 4 — Novas Visões) — leitura
  completa de `js/transactions.js` confirmou que o calendário mensal já estava 100% implementado
  no disco (função `renderTxCalendar`); faltava só o hook em `renderTx()`. Implementado tudo que
  faltava: `js/report.js` (novo — Relatório mensal: comparação com mês anterior, top 5 gastos, %
  por categoria, 3 recordes, evolução patrimonial 12 meses em SVG puro com fórmulas exatas da
  spec); detalhe de categoria orçada em bottom sheet (`openCategoriaDetail` em `js/budget.js`,
  reaproveitando `openModal()`); mini-tabela Previsto x Realizado no Orçamento
  (`_renderBudgetSummaryTable`); toggle Mensal/Dia a dia + Horizonte de saldos em `js/projection.js`
  (`renderProjDaily`, `renderHorizon`, thresholds de cor por 7% da receita/piso R$150). `index.html`
  e `sw.js` atualizados (nova página `#page-report`, `<script src="js/report.js">` entre
  projection.js e theme.js, bump `financas-v12`→`v13`).
- Decisões: reaproveitado o padrão de bottom sheet já existente (`openModal`/`closeModal`) para o
  detalhe de categoria, em vez de criar nova infraestrutura de sheet (`sheetUp`/`fadeBg` não
  existiam no CSS do projeto); tela de Relatório usa o mesmo padrão `cfg-open` de Configurações
  (fora da bottom nav, botão Voltar próprio)
- Artefatos: `js/report.js` (novo), `js/transactions.js`, `js/budget.js`, `js/projection.js`,
  `js/app.js`, `index.html`, `sw.js` — `node --check` passou em todos os `.js` do projeto
- Pendências: smoke test manual do usuário, Code Reviewer, QA Engineer, e commit aguardando
  aprovação explícita — nenhum commit foi feito nesta sessão; `sw.js` não lista `js/planning.js`/
  `js/micro.js` (arquivos de outro processo, fora do escopo desta sessão)

---

**2026-07-07 — Senior Dev**
- Feito: retomada de sessão anterior interrompida por cota — leitura completa de
  `js/transactions.js`, `js/app.js`, `js/utils.js`, `js/globals.js`, `index.html` confirmou que a
  **lógica JS** das 5 seções da Fase 2 (`.claude/discovery/extracted-specs-fase2.md`) já estava 100%
  implementada (FAB speed dial, busca, duplicar, modo privacidade, swipe), mas faltava a **integração
  HTML**: `#fab-root` não existia no DOM, a caixa de busca de Lançamentos não existia, o ícone de olho no
  card "Saldo" do dashboard não existia, e o botão fixo antigo "+ Novo" ainda não tinha sido removido.
  Completadas as 3 lacunas com edições cirúrgicas (não reescrita de arquivos inteiros), respeitando
  trabalho concorrente de outros processos (Fase 4 integrou `#tx-calendar`/`#tx-view-toggle` na mesma
  região do HTML durante a sessão, sem conflito)
- Decisões: seletor CSS `#hide-values-btn` (que não correspondia a nenhum id real gerado) trocado para
  classe `.hide-values-btn-el`, aplicada ao próprio `#hide-values-icon` (elemento populado por
  `updateHideValuesIcon()`); `updateHideValuesIcon()` passou a ser chamada também dentro de `renderDash()`
  (não só no `init()`), pois o card é recriado via `innerHTML` a cada render; botões `+ Item`/`+ Cartão`
  mantidos intocados por estarem fora do escopo literal da spec da Fase 2
- Artefatos: `index.html` (`#fab-root`, caixa de busca em Lançamentos, remoção do `+ Novo`, ajuste de
  seletor CSS), `js/transactions.js` (botão de olho no card Saldo + chamada de sincronização em
  `renderDash()`) — `node --check` passou em todos os `.js` do projeto, verificado duas vezes
- Pendências: smoke test manual do usuário, Code Reviewer, QA Engineer, commit aguardando aprovação —
  nenhum commit foi feito nesta sessão

---

**2026-07-07 — Senior Dev**
- Feito: implementação completa da sub-fase 1a (Aparência Base) conforme `.claude/specs/fase1a-aparencia-base.md`
  (v1.1) — `js/theme.js` reescrito com os 3 ramps completos (`DARK_RAMPS`/`LIGHT_RAMPS`) e cores semânticas
  fixas (`DARK_SEM`/`LIGHT_SEM`), `buildTokens()` seguindo o pseudocódigo de 8 passos (OLED antes de
  surface, correção RN-1a-06 aplicada — `R0` é o ramp do mood ativo sem OLED, nunca o ramp Profundo),
  fórmula real de accent (`accent+'22'`/`accent+'55'`), nova `getEffectiveTheme(look)` (RN-1a-13);
  `applyLook`/`getSavedLook` estendidos para persistir/restaurar `oled` e `autoTheme` com fallback campo a
  campo; novo módulo `js/appearance-ui.js` com UI de toggles (autoTheme, OLED) e seletores (mood, surface);
  `js/app.js` — `toggleTheme` desliga `autoTheme` (RN-1a-11), `showPageCfg` recalcula tema efetivo ao abrir
  Configurações (RN-1a-14); `index.html` com os novos controles no card Aparência; `sw.js` bump
  `financas-v11`→`financas-v12`
- Decisões: nenhum desvio da spec — pseudocódigo de 8 passos e as 17 regras de negócio seguidos
  literalmente; nenhuma migração de IndexedDB necessária
- Artefatos: `js/theme.js`, `js/appearance-ui.js` (novo), `js/config.js`, `js/app.js`, `index.html`, `sw.js`
  — `node --check` passou em todos os 5 arquivos JS alterados/criados
- Pendências: smoke test manual do usuário (13 passos da spec), Code Reviewer, QA Engineer, e commit
  aguardando aprovação explícita do usuário — nenhum commit foi feito nesta sessão

---

**2026-07-07 — Tech Lead**
- Feito: validação técnica completa da spec da sub-fase 1a (`.claude/specs/fase1a-aparencia-base.md`) —
  leitura de `js/theme.js`, `js/config.js`, `js/app.js` (estado atual pós-Fase 0), `architecture.md`, e
  conferência literal do código-fonte do protótipo (`Financas App.dc.html`, `buildTokens`, linhas
  1537–1558) contra as regras de negócio da spec
- Decisões: (1) **correção crítica** — RN-1a-06/Story 5 tinham um erro herdado do plano do Discovery Agent:
  diziam que `surface='Minimal'` usa o "ramp Profundo original (R0)" para `--bg3/--bg4/--border2`; o
  código-fonte real mostra que `R0 = ramps[mood]` é o ramp do **mood ativo sem OLED**, nunca o Profundo —
  corrigido em RN-1a-06, nos 3 cenários da Story 5 e na tabela de riscos; (2) extração de UI de aparência
  para novo módulo `js/appearance-ui.js`, carregado entre `js/theme.js` e `js/config.js` — `config.js` hoje
  é quase todo export/import/clear, aparência é responsabilidade distinta e cresce bastante nesta sub-fase;
  (3) adicionado pseudocódigo de composição de 8 passos para `buildTokens`, eliminando ambiguidade de ordem
  OLED→surface; (4) persistência (RN-1a-15/16) e recálculo de `autoTheme` (RN-1a-14) aprovados sem ressalvas
- Artefatos: `.claude/specs/fase1a-aparencia-base.md` atualizada para v1.1 (status "Aprovada com ajustes"),
  `.claude/progress/current.md` atualizado
- Pendências: nenhuma — spec v1.1 pronta para o Senior Dev implementar

---

**2026-07-07 — Product Owner**
- Feito: escrita da spec da sub-fase 1a (`.claude/specs/fase1a-aparencia-base.md`) — toggles simples
  (autoTheme, OLED), fórmula real de accent (`accent+'22'`/`accent+'55'`), tom das cores (mood, 3 ramps
  completos dark/light) e estilo de superfície (surface, 3 comportamentos). Valores reais de
  `DARK_RAMPS`/`LIGHT_RAMPS`/`DARK_SEM`/`LIGHT_SEM` extraídos por leitura direta de
  `Financas App.dc.html` (linhas 1437–1448) e documentados na spec com tabelas completas.
- Decisões: nenhuma decisão nova de produto — spec formaliza em BDD as decisões já tomadas pelo usuário
  e pela investigação técnica do plano (seções 11, 11.1, 11.2, 12 do `plan-fase1-aparencia.md`)
- Artefatos: `.claude/specs/fase1a-aparencia-base.md` criado — 17 regras de negócio (RN-1a-01 a
  RN-1a-17), 7 user stories com critérios de aceite em Given/When/Then, tabela de arquivos a modificar,
  DoD com smoke test de 13 passos, DoR completo, 6 riscos mapeados
- Pendências: aprovação técnica do Tech Lead (viabilidade/estimativa) antes de acionar o Senior Dev;
  decisão de extrair "Aparência" para módulo dedicado vs. inflar `js/config.js` delegada ao Tech
  Lead/Dev; sub-fases 1b/1c/1d seguem sem spec própria (aguardando 1a ser implementada e validada)

---

**2026-07-07 — Discovery Agent (sessão 2)**
- Feito: fechamento das pendências técnicas do plano da Fase 1 — investigação direta em `Financas App.dc.html` (função `buildTokens`, linhas 1537–1558, e pontos de uso relacionados) para resolver os 3 pontos técnicos levantados na sessão anterior (efeito de surface, escopo de OLED, specs de Mesh/Aurora); registro das 2 decisões do usuário (migrar paleta de cor por pessoa; ordem de sub-fases confirmada)
- Decisões: (1) migrar `PERSON_COLORS` para a paleta do protótipo (`#5b8eff #a78bfa #22c55e #f97316 #ec4899 #14b8a6`), aplicável na sub-fase 1c, sem efeito retroativo em pessoas já cadastradas; (2) ordem de sub-fases confirmada sem mudança: 1a → (1b + 1c em paralelo) → 1d; (3) surface é transformação pós-ramp de mood (não paleta própria) sobre `--bg2/--bg3/--bg4/--border/--border2`, com 3 comportamentos mapeados (Cartões/Minimal/Contraste); (4) OLED afeta apenas `--bg` (e `--navBg` por herança), cards não mudam; (5) Mesh/Aurora mapeados como `--heroBg`/`--heroBorder` via radial-gradients decorativos — detalhamento completo fica para spec de 1d
- Artefatos: `.claude/discovery/plan-fase1-aparencia.md` atualizado (seções 11, 11.1, 12, 13 novas/reescritas) — sub-fase 1a sem pendências bloqueantes, pronta para o Product Owner
- Pendências: aprovação explícita do usuário sobre o plano completo ainda não recebida nesta sessão; detalhamento fino de Mesh/Aurora (nomes finais de tokens, acessibilidade de contraste) permanece para a spec da sub-fase 1d

---

**2026-07-07 — Discovery Agent**
- Feito: elaborado plano da Fase 1 (Aparência em Configurações) do handoff de design — inventário/cruzamento entre fundação técnica da Fase 0 (`js/theme.js`) e o protótipo (`Financas App.dc.html`/`support.js`), classificação de complexidade N2, recomendação de divisão em 4 sub-fases entregáveis (1a toggles+tom+superfície, 1b 10 temas prontos, 1c cor por pessoa, 1d capa do saldo)
- Decisões: (1) divergência `--border` #323760 vs #232742 resolvida — protótipo real usa #323760 (idêntico ao já implementado), README.md do handoff está desatualizado nesse valor; nenhuma migração de código necessária; (2) 10 temas prontos confirmados como combinações pré-definidas dos 5 eixos já modelados (theme+mood+accent+surface+oled) — `oled` é o único campo novo, não existe 5ª/6ª dimensão além dele; (3) fórmula real de accent→`--blue-bg`/`--blue-border` identificada no protótipo (`accent+'22'`/`accent+'55'`), resolve pendência RN-04 deixada em aberto pela Fase 0
- Artefatos: `.claude/discovery/plan-fase1-aparencia.md` (v1.0, aguardando aprovação)
- Pendências: aprovação do usuário; 5 perguntas em aberto no plano (paleta PERSON_COLORS, efeito visual de "surface", alcance do modo OLED além de `--bg`, especificação de Mesh/Aurora, confirmação da ordem/paralelismo das sub-fases)

---

**2026-07-07 — Senior Dev**
- Feito: implementação completa da Fase 0 (Fundação Visual) conforme `.claude/specs/fase0-fundacao-visual.md` — `js/theme.js` criado (`buildTokens`, `applyLook`, `getSavedLook`); `applyTheme`/`toggleTheme` em `js/app.js` unificados via `applyLook` (RN-08/RN-09), `init()` lê `getSavedLook()` (RN-10); `index.html` com `<script src="js/theme.js">` entre `projection.js` e `config.js`; `sw.js` bump `financas-v10`→`financas-v11` com `js/theme.js` em `urlsToCache`
- Decisões: seguidas as 3 decisões já validadas pelo Tech Lead na sessão anterior — `applyTheme` removida sem alias; `applyLook` chamada na mesma posição síncrona de `init()`; fórmula de accent customizado não implementada (accent troca apenas `--blue`, `--blue-bg`/`--blue-border` seguem hardcoded)
- Artefatos: `js/theme.js` (novo), `js/app.js`, `index.html`, `sw.js` — `node --check` passou em `theme.js`, `app.js` e `sw.js`
- Pendências: smoke test manual do usuário (8 passos da spec), Code Reviewer, QA Engineer, e commit aguardando aprovação explícita do usuário

---

**2026-07-07 — Tech Lead**
- Feito: validação técnica dos 3 pontos abertos da spec Fase 0 (`fase0-fundacao-visual.md`), com leitura de `js/app.js` (linhas 1-111) e `index.html` (`:root`/`body.light`)
- Decisões: (1) `applyTheme` removida sem alias, confirmado via `grep -rn "applyTheme"` (só 2 chamadas internas); (2) chamar `applyLook` na mesma posição síncrona atual de `applyTheme` em `init()` é suficiente para evitar FOUC — sem inline script no `<head>`, pois `:root`/`body.light` já cobrem o primeiro paint; (3) fórmula de derivação de accent customizado adiada para a Fase 1, não implementar nesta fase
- Artefatos: `.claude/specs/fase0-fundacao-visual.md` (seção "Pontos abertos" atualizada com decisões), `.claude/progress/current.md` (atualizado)
- Pendências: nenhuma — spec aprovada para o Senior Dev implementar

---

**2026-07-07 — Product Owner**
- Feito: leitura de `architecture.md` e `plan-fase0-fundacao-visual.md` (plano aprovado); escrita da spec detalhada da Fase 0 seguindo o formato padrão do projeto (ver `sprint-5-categorias-budget.md` como referência de formato)
- Decisões: 14 regras de negócio numeradas (RN-01 a RN-14) cobrindo composição de tokens, persistência dupla (`financas-look` + `theme` sincronizadas), unificação de `toggleTheme`/`applyLook`, e compatibilidade retroativa via fallback; 6 user stories com critérios de aceite em BDD, incluindo Story 5 dedicada a validar os 10 itens INTOCÁVEIS sem regressão
- Artefatos: `.claude/specs/fase0-fundacao-visual.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendências: 3 pontos sinalizados para validação do Tech Lead antes/durante a implementação (remoção vs. alias de `applyTheme`; estratégia de mitigação de FOUC; confirmação de que fórmula de derivação de accent customizado não é necessária nesta fase). Nada implementado — próximo passo é o Senior Dev, após validação do Tech Lead
---

**2026-07-07 — Discovery Agent**
- Feito: leitura do handoff de design (README.md, ROADMAP.md, trechos de `Financas App.dc.html`) em `CLAUDE DESIGN - App Finanças`; inventário dos 10 itens INTOCÁVEIS cruzados contra código real (`js/*.js`, `index.html`) — todos confirmados, sem gaps; elaboração do plano da Fase 0 (Fundação Visual: tokens de tema, accent configurável, persistência)
- Decisões: classificado como N2 MVP; recomendado `js/theme.js` novo (não estender `config.js`); recomendado unificar `toggleTheme()` com nova função `applyLook()` já na Fase 0 para evitar dessincronização de chaves localStorage; Fase 0 não renomeia nenhuma CSS var existente, apenas compõe por cima; UI de seleção de aparência fica para a Fase 1
- Artefatos: `.claude/discovery/plan-fase0-fundacao-visual.md` (criado), `.claude/progress/current.md` (atualizado)
- Pendências: aprovação do usuário sobre o plano da Fase 0; 3 perguntas em aberto no plano (arquivo novo vs. estender config.js; unificação do toggle já na Fase 0; divergência de `--border` entre app real e README do handoff)
---

**2026-06-27 — Encerramento de sessão**
- Feito: melhorias pós-Sprint 5 entregues e em produção; .claude atualizado (architecture, backlog, archive); roadmap documentado
- Decisões: ordem do roadmap definida — UX/UI review → Onboarding → OFX/QFX importer; Claude Design será usado na etapa de UX/UI (quando disponível)
- Artefatos: .claude/progress/current.md (roadmap documentado), .claude/progress/log.md (esta entrada)
- Pendências: nenhuma — próxima sessão começa pelo roadmap

---

**2026-06-27 — Senior Dev**
- Feito: Melhorias pós-Sprint 5 — botão 📌 em todas as 5 abas (visibility:hidden no month-nav); categorias ocultas da lista de orçamento (isCategoriaOnly filter); saldo restante de categorias na projeção (refMonth em diante); resumo de orçamento atualizado com realizado e total das categorias; SW v10
- Decisões: saldo restante = max(0, orçado - realizado); meses < refMonth ignorados na projeção; realizado das categorias entra no X do resumo, restante entra no Y
- Artefatos: index.html, js/app.js, js/budget.js, js/projection.js, sw.js — commitados e em produção (main)
- Pendências: esclarecer comportamento de TX avulsas com categoria para usuário; OFX/QFX importer e Onboarding pendentes

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
