# Estado Atual do Projeto

**Atualizado em:** 2026-07-10
**Agente:** Sessão direta com o usuário (revisão minuciosa final do protótipo + regressão completa + UX de exclusão de gasto de cartão + card de lançamentos avulsos no Orçamento + explicação do cálculo da Projeção Mensal + correção do Previsto de categorias no resumo)
**Sessão:** Concluída a revisão minuciosa final do protótipo (`.dc.html` completo, 2.449 linhas),
implementadas as 2 divergências encontradas (pílula de status do Orçamento, legenda do Horizonte),
verificada regressão completa em 3 camadas (estática, smoke de 7 telas, inventário de 13 modais em
novo+edição) sem nenhuma perda encontrada, documentada a lógica da pílula de status para validação
futura do usuário, implementada exclusão de gasto de cartão (swipe-to-action + botão no modal +
confirmação estilizada) com patch cirúrgico completo em Cartões, adicionado um novo card
"Lançamentos avulsos do mês" na tela de Orçamento, adicionada explicação do cálculo do saldo
projetado na Projeção Mensal (rodapé + sheet de ajuda), e corrigido o "Previsto" de categorias
orçadas no resumo do mês para usar o Valor Orçado Mensal fixo em vez de variar com o gasto real.

## Correção: "Previsto" de categorias orçadas no resumo do mês

Usuário notou que o campo Previsto (Despesa) do resumo de Orçamento subia quando uma categoria
orçada estourava o valor planejado — ex.: categoria "Mercado" orçada em R$900, ao gastar R$1.200
reais o Previsto passava a refletir esse estouro em vez de ficar fixo em R$900. Causa raiz
(`_renderBudgetSummaryTable` em `js/budget.js`): o Previsto somava `catRealizado + catExpense`
(realizado da categoria + saldo restante limitado a não negativo) — quando o realizado ultrapassa
o orçado, `catExpense` zera mas `catRealizado` sozinho já excede o valor original, empurrando o
Previsto pra cima. Corrigido para somar o **Valor Orçado Mensal fixo** de cada categoria
(`catOrcado`, nova variável agregada em `renderBudget()`), que nunca varia com o gasto real.

Confirmado com o usuário que a mudança é **só no campo Previsto** — o Realizado continua usando
`catRealizado` normalmente (sobe com o gasto real, como deve). Verificado impacto em outros
campos: a Projeção Mensal (`js/projection.js`) tem fórmula própria e semanticamente diferente
(soma "saldo restante" ao lado do calcMonth, para projetar o que falta gastar — não é uma métrica
de "previsto/planejado"), então não foi tocada, corretamente. `catExpense` ficou órfão na nova
assinatura e foi removido (variável e cálculo mortos, não usados em nenhum outro lugar).

Validado com Playwright: categoria orçada em R$900, TX de R$1.400 lançada com `categoriaId`
vinculado — Despesa/Previsto permaneceu fixo em R$7.319,00 antes e depois (só a categoria mudou
de R$0 realizado para R$1.400), Despesa/Realizado subiu corretamente de R$190→R$1.590. Cleanup
restaurou o resumo ao estado original exato. Regressão do card de avulsos (que depende do mesmo
fluxo de `renderBudget`) re-testada, sem quebra. Zero pageerrors. `sw.js` → `financas-v67`.

## Novo: explicação do cálculo da Projeção Mensal

Usuário perguntou se a Projeção Mensal considera os lançamentos avulsos além dos itens previstos.
Confirmado no código (`calcMonth()` em `js/utils.js`, chamada por `renderProj()` em
`js/projection.js`): sim, TODAS as TXs do mês entram (avulsas ou vindas do Orçamento, sem
distinção — `calcMonth` filtra só por `year`/`month`, não por `fromBudget`), somadas a itens de
orçamento pendentes, faturas de cartão pendentes e saldo restante de categorias orçadas. Nenhuma
mudança de lógica foi necessária — só a comunicação estava incompleta.

Implementado: rodapé da tabela (antes "Inclui itens de orçamento pendentes") passou a dizer
"Inclui lançamentos já feitos e itens pendentes do orçamento" + botão `ⓘ` que abre um sheet
(`showProjHelp()`, reaproveitando `showConfirm()`) com os 4 componentes do cálculo em bullets:
lançamentos já feitos, itens de orçamento pendentes, faturas de cartão pendentes, saldo restante
de categorias. Mockup aprovado pelo usuário antes de implementar. Validado com Playwright: botão
presente, sheet abre com o texto certo, fecha ao clicar "Entendi", zero pageerrors.

## Novo: card "Lançamentos avulsos do mês" (Orçamento)

Usuário percebeu que o "Realizado" do resumo de Orçamento só contava itens marcados como
realizados via o próprio fluxo de Orçamento — TXs lançadas direto pela aba Lançamentos, sem vínculo
a nenhum item, não apareciam em lugar nenhum do resumo. Planejado e decidido junto ao usuário
(3 rodadas de perguntas): TXs já vinculadas a uma categoria orçada (`categoriaId`) ficam de fora
do novo card (já contadas no card de Categorias Orçadas, evita duplicar); apresentação em card
separado (não linha extra na tabela existente); resumo Previsto×Realizado original fica intocado
(métrica de "aderência ao plano"); o card novo mostra Receita/Despesa/Saldo dos avulsos MAIS um
"Saldo total do mês" (planejado + avulsos) no rodapé, sem misturar as duas métricas.

Implementado:
1. **`_getAvulsosDoMes(todasTx,tm,ty,pFilter)`** (`js/budget.js`) — filtra TXs do mês sem
   `fromBudget` (não veio de "marcar item de orçamento como realizado" — campo já existia,
   setado por `toggleBudgetDone`) e sem `categoriaId` (já contabilizada em Categorias Orçadas),
   respeitando o filtro de pessoa ativo na tela.
2. **`_renderBudgetAvulsosCard(avulsos,saldoPlanejado)`** — renderiza o card `#budget-avulsos-card`
   (novo, em `index.html`, logo abaixo do resumo): Receita/Despesa/Saldo dos avulsos, lista dos
   itens com scroll (max-height 180px), e "Saldo total do mês" = saldoPlanejado + saldoAvulsos.
   Estado vazio: mensagem "Nenhum lançamento fora do orçamento neste período." (card permanece
   visível, não oculto, a pedido do usuário).
3. `_renderBudgetSummaryTable()` passou a **retornar `bRealSaldo`** (antes só fazia side-effect no
   DOM) — reaproveitado como `saldoPlanejado` sem duplicar a fórmula em dois lugares.
4. Integrado em `renderBudget()` logo após a chamada do resumo, reaproveitando `todasTxRender` já
   carregado (sem round-trip extra ao IndexedDB).
5. Validado com Playwright: TX avulsa pura aparece no card ✓; TX com `categoriaId` NÃO aparece
   (fica só em Categorias) ✓; TX com `fromBudget:true` NÃO aparece (já é do fluxo de Orçamento) ✓;
   Saldo total = saldo do resumo + saldo dos avulsos bate exatamente (-280+6.400=+6.120,
   confirmado) ✓; estado vazio mostra a mensagem pedida ✓; zero pageerrors.

## Ajuste de UX: exclusão de gasto de cartão

Usuário reportou que não havia mais como excluir um gasto lançado em Cartões (o "X" que lembrava
vinha do protótipo de design, não do app real — confirmado por busca no histórico do git, que nunca
teve swipe ou botão de exclusão ali). Decisão junto ao usuário: seguir o padrão já usado em
Lançamentos/Orçamento (swipe-to-action), não o padrão do protótipo (botão no modal).

Implementado:
1. **Swipe-to-action em `.cc-gasto-card`** (`gastoCardHtml()` em `js/cards-render.js`) — arrastar
   pra esquerda revela Editar/Excluir, reaproveitando `swipeDown/swipeMove/swipeUp` genéricos já
   existentes em `transactions.js`. Patch cirúrgico via `patchGastoCard(id)` (cache
   `_gastoCardCache`), confirmado por teste que marca nós do DOM: cabeçalho do cartão e outros
   gastos mantêm o mesmo nó (não recriados) ao abrir/fechar o swipe de um item.
2. **Botão "Excluir" no modal de edição de gasto** (`showAddGastoModal` em `js/cards-modal.js`),
   igual ao padrão já usado em Recorrências — só aparece em modo edição.
3. **Confirmação de exclusão padronizada**: `deleteGasto()` usava `window.confirm()` nativo
   (destoava do resto do app); trocado para `showConfirm()` (mesmo sheet estilizado usado por
   `deleteRecorrente`), a pedido do usuário para manter consistência visual.
4. **Patch cirúrgico real em `toggleCardExpand`/`toggleShowAllGastosCard`**: usuário notou que
   expandir um cartão reanimava TODOS os cartões, e "Ver mais gastos" reanimava TODOS os gastos já
   visíveis, não só os revelados. Causa raiz: ambos chamavam `renderCards()` completo. Refatorado
   `renderCards()` para extrair `_cartaoCardHtml(cartao,idx,ctx)` reutilizável, com cache
   `_cardsRenderCtx` do contexto do último render. `toggleCardExpand` agora usa
   `patchCartaoCard(id)` (só recria o cartão clicado). `toggleShowAllGastosCard` usa
   `patchCartaoTimeline(id)`, que faz reconciliação de verdade: grupos de dia (`.cc-day-group`)
   já visíveis no DOM são identificados por `data-day-key` e mantidos com `animation:none`; só os
   grupos recém-revelados entram com `animation:listItemIn`. Validado via `getComputedStyle().
   animationName` — grupos pré-existentes reportam `"none"`, grupo novo reporta `"listItemIn"`.
5. **Fluidez do swipe corrigida**: usuário notou que o swipe de gasto era menos fluido que o de
   Lançamentos/Orçamento. Causa raiz: `.cc-gasto-card` tinha `transition:transform .15s` +
   `:active{transform:scale(.98)}` na classe CSS base (efeito de toque pensado para clique simples,
   antes do swipe existir) — esse `transform` da classe competia com o `transform:translateX()`
   inline do gesto de arraste, travando o gesto. `.tx-item`/`.budget-item` nunca tiveram esse
   conflito (usam só `opacity:.85` no `:active`). Corrigido: `.cc-gasto-card` trocado para
   `transition:background .15s` + `:active{opacity:.85}` (igual aos outros dois), e o `transition`
   inline do swipe alinhado para incluir `,opacity .15s`. Validado via `getComputedStyle()
   .transition` idêntico entre `.cc-gasto-card` e `.tx-item` após a correção.
6. Todos os patches validados com Playwright checando marcação de nós DOM (mesmo elemento
   preservado = não recriado) e `animationName`/`transition` computados, não só presença visual —
   zero pageerrors em todas as execuções. `sw.js` em `financas-v64`.

## Em andamento

- **Revisão minuciosa final do protótipo — CONCLUÍDA.** ~40 itens verificados por grep dirigido.
  2 divergências encontradas e corrigidas:
  1. **Pílula de status dos itens de Orçamento** (`_budgetStatusPill()` em `js/budget.js`): "✓ Pago",
     "↪ Atrasado", "⚠ Atrasado" (vencimento passado), "Vence em Xd" (≤5 dias), "Pendente". Avisos por
     data só ativam quando o pin 📌 = mês real do sistema (decisão de adaptação minha, não existe no
     protótipo — ver spec dedicada abaixo). Mudanças derivadas: "✅ Realizado" virou "✓ Pago"; badge
     antigo de delayed removido (pílula cobre); `.color-green-nowrap` órfã removida do CSS.
  2. **Legenda do Horizonte de saldos** refeita conforme protótipo (quadrados 8px + swatch "Hoje").
- **⚠️ PENDENTE DE VALIDAÇÃO DO USUÁRIO: pílula de status do Orçamento.** Usuário avisou que
  provavelmente pedirá ajustes depois de testar. Spec completa com as 5 regras, a decisão de
  adaptação e 3 alternativas já mapeadas em `.claude/specs/status-pill-orcamento.md` — ler antes de
  qualquer ajuste futuro no tema.
- **Regressão completa verificada em 3 camadas, nenhuma perda encontrada:**
  1. Checagem estática: 109 handlers `on*=` referenciados em `index.html`/templates JS, todos com
     função global definida.
  2. Smoke Playwright das 7 telas principais + FAB contextual + persistências — zero pageerrors.
  3. Inventário completo de 13 modais (10 tipos, novo+edição onde aplicável) via `#modal-content`
     real — todos os campos/labels/botões da spec do protótipo presentes, incluindo casos
     condicionais (toggle "Mover para o período" só em edição de item atrasado, duplicar ⧉ só em
     edição de TX).
- **Nenhum commit foi feito ainda** — usuário pediu para não subir nada até autorização explícita.

## Próximo passo esperado

1. **Ajuste na aba Cartões — CONCLUÍDO.** Exclusão de gasto (swipe + botão no modal + confirmação
   estilizada), patch cirúrgico de expandir cartão e "Ver mais gastos", e correção de fluidez do
   swipe — tudo implementado e validado (ver seção acima).
2. **Validação da pílula de status pelo usuário** (ver acima) — pode gerar ajustes no código.
3. **Testar as correções em dispositivo móvel real** — usuário confirmou que isso só acontece depois
   do commit + push, fica por último.
4. **Só depois: commit + push** (usuário explicitamente pediu para não subir nada até então).

## Débitos técnicos conhecidos (não bloqueiam nada, registrados para referência)

Ver `.claude/debt/backlog.md` para detalhes de DT-001 (cards-render.js/cards-modal.js grandes),
DT-002 (CSS inline em index.html), DT-003 (sem testes automatizados formais), DT-005 (validação
morta em saveRecorrenteEdit), DT-006 (deleteBudgetItem não invalida cache de budgetDone), DT-009
(funções legadas de categoria em cards-modal.js), DT-010 (calcCategoriaRealizado silencia gasto de
cartão deletado). Também: "Metas de economia" nunca recebeu auditoria visual com o mesmo rigor das
outras telas; nenhuma mudança do redesign passou por Code Review/QA formal *externo*.

## Contexto crítico

- **Como testar visualmente:** Playwright + Chromium já instalados no ambiente
  (`ms-playwright/chromium-1228`). Scripts de teste ficam no diretório de scratchpad da sessão,
  usando `chromium.launchPersistentContext()` com `userDataDir` fixo (mantém IndexedDB entre
  execuções). `lib.js` no scratchpad força `Cache-Control: no-cache` em toda requisição. Preview
  local roda em `http://127.0.0.1:3000/index.html`. Nomes de página reais para `showPage()`: `dash`,
  `tx` (não `transactions`), `cards`, `proj`, `budget` — conferir `onclick` dos `.nav-btn` em
  `index.html` antes de escrever um script novo.
- **Estrutura real do modal:** `#modal-overlay` > `#modal` > `#modal-content`, visibilidade via
  classe `.open` no overlay. Funções de abertura reais: `showAddModal`/`showEditModal` (TX),
  `showBudgetAddModal`/`showBudgetEditById` (Orçamento), `showAddGastoModal(cartaoId,cartao,gasto)`
  (Gasto — mesma função cobre novo e edição), `showAddCartaoModal(cartao=null)` (Cartão),
  `showAddCategoriaModal`/`showEditCategoriaModal` (Categoria — funções separadas), `openGoalModal`
  (Meta), `showAddPessoaModal`/`showEditPessoaModal` (Pessoa).
- **Conceito "mês de referência" vs "data real do sistema":** `refMonth`/`refYear` no localStorage
  (definido pelo usuário via pin 📌) é a fonte de verdade para "qual mês é hoje" na visão do app —
  nunca usar `new Date()` diretamente para essa decisão em código de projeção/orçamento.
- **Conceito `dueMonthOffset`:** campo em item de orçamento indicando que o vencimento cai em mês
  diferente do mês em que foi orçado — é só informativo (badge de data), o item continua contando
  no saldo do mês em que foi orçado. Nunca usar para filtrar o item fora de uma lista.
- **`_budgetItemAppliesTo(item,y,m)` é a função canônica** para decidir se um item de orçamento se
  aplica a um mês — qualquer código novo que precise dessa lógica deve reutilizá-la, não duplicar.
- **Padrão de bug recorrente:** re-renderizar uma lista inteira (`innerHTML=items.map(...).join('')`)
  reinicia animações CSS em todos os itens, não só no que mudou. Solução estabelecida: reconciliar
  via `document.getElementById` + `replaceWith()`, aplicando `animation:none` no nó que está sendo
  substituído (ver `_reconcileBudgetList` em `js/budget.js`).
- **Padrão de bug recorrente #2:** `animation` (com keyframe terminando em `opacity:1` ou outro
  valor) aplicada no MESMO elemento que também tem uma classe de estado com opacity diferente causa
  a animação vencer o CSS. Solução: sempre aplicar `animation` num wrapper externo, nunca no
  elemento que muda de opacidade dinamicamente por classe de estado.
- `sw.js` em `financas-v67`.
- `node --check` passa em todos os arquivos `.js` do projeto ao final desta sessão.
