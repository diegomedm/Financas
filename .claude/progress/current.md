# Estado Atual do Projeto

**Atualizado em:** 2026-07-10
**Agente:** Sessão direta com o usuário (fechamento do ciclo de redesign visual + commit/push/deploy)
**Sessão:** Concluído todo o ciclo desta rodada: revisão minuciosa final do protótipo, regressão
completa em 3 camadas, exclusão de gasto de cartão com patch cirúrgico em Cartões, card de
lançamentos avulsos no Orçamento, explicação do cálculo da Projeção Mensal, correção do Previsto
de categorias no resumo. **Commit e push feitos e autorizados pelo usuário** — GitHub Pages já
atualizado e confirmado pelo usuário no celular. Próximo passo: ajustes ao vivo testando no
dispositivo móvel real.

## Commit/push/deploy — CONCLUÍDO

- Commit `f3e6817` — "feat: redesign visual completo + correções de dados + novas features de
  Orçamento" (30 arquivos alterados, 8432 inserções, 758 remoções).
- Push para `origin/main` feito com sucesso.
- GitHub Pages atualizado — **usuário confirmou que já está refletindo no celular**.
- `sw.js` em `financas-v67` no momento do commit.

## Próximo passo esperado

**Sessão de ajustes ao vivo, testando pelo celular real.** Usuário vai reportar itens conforme for
usando o app no dispositivo — tratar cada um seguindo a metodologia já estabelecida (extrair
spec/entender causa raiz → corrigir → validar com Playwright quando possível → `node --check` →
bump `sw.js` → **não commitar/dar push de novo sem autorização explícita**, mesma regra de sempre).

Pendências que ainda não foram endereçadas nesta sessão:
- **Validação da pílula de status do Orçamento pelo usuário** — ele avisou que provavelmente vai
  pedir ajustes depois de usar de verdade. Spec completa com as 5 regras, decisão de adaptação do
  mês de referência e 3 alternativas já mapeadas em `.claude/specs/status-pill-orcamento.md` — ler
  antes de qualquer ajuste futuro no tema.

## Débitos técnicos conhecidos (não bloqueiam nada, registrados para referência)

Ver `.claude/debt/backlog.md` para detalhes de DT-001 (cards-render.js/cards-modal.js grandes),
DT-002 (CSS inline em index.html), DT-003 (sem testes automatizados formais), DT-005 (validação
morta em saveRecorrenteEdit), DT-006 (deleteBudgetItem não invalida cache de budgetDone), DT-009
(funções legadas de categoria em cards-modal.js), DT-010 (calcCategoriaRealizado silencia gasto de
cartão deletado). Também: "Metas de economia" nunca recebeu auditoria visual com o mesmo rigor das
outras telas; nenhuma mudança do redesign passou por Code Review/QA formal *externo*.

## Contexto crítico

- **Como testar visualmente (ambiente de dev):** Playwright + Chromium já instalados
  (`ms-playwright/chromium-1228`). Scripts de teste ficam no diretório de scratchpad da sessão,
  usando `chromium.launchPersistentContext()` com `userDataDir` fixo (mantém IndexedDB entre
  execuções). `lib.js` no scratchpad força `Cache-Control: no-cache` em toda requisição. Preview
  local roda em `http://127.0.0.1:3000/index.html`. Nomes de página reais para `showPage()`: `dash`,
  `tx` (não `transactions`), `cards`, `proj`, `budget` — conferir `onclick` dos `.nav-btn` em
  `index.html` antes de escrever um script novo.
- **A partir de agora, o usuário testa no celular real** (produção, via GitHub Pages) — ajustes
  reportados vêm de uso real, não de screenshot de Playwright. Ainda assim, validar cada correção
  no ambiente de dev local antes de sugerir novo commit/push.
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
  substituído (ver `_reconcileBudgetList` em `js/budget.js`, `patchGastoCard`/`patchCartaoCard`/
  `patchCartaoTimeline` em `js/cards-render.js`).
- **Padrão de bug recorrente #2:** `animation` (com keyframe terminando em `opacity:1` ou outro
  valor) aplicada no MESMO elemento que também tem uma classe de estado/transform dinâmico causa
  conflito (a animação ou o outro `transform` vencem de forma imprevisível). Solução: sempre aplicar
  `animation` num wrapper externo, e nunca deixar uma classe base com `:active{transform:...}` num
  elemento que também recebe `transform:translateX()` inline de um gesto de swipe.
- `sw.js` em `financas-v67` (última versão commitada).
- `node --check` passa em todos os arquivos `.js` do projeto.
