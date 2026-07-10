# Auditoria de Fidelidade Visual — Protótipo vs. Implementação Real

**Data:** 2026-07-07
**Fonte do protótipo:** `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\Financas App.dc.html`
**Método:** 5 sub-agentes em paralelo, um por fase do redesign, comparando trechos de código-fonte do protótipo (via `.claude/discovery/extracted-specs-fase*.md`) contra o código real implementado, item a item, valor a valor (cores, timings, easings, thresholds, textos).

> Nota: este documento consolida os 5 relatórios já entregues pelos sub-agentes. As 5 correções de maior prioridade identificadas aqui **já foram aplicadas** em sessão posterior (ver seção final).

---

## Tabela geral de status

| Fase | Item | Status | Observação |
|---|---|---|---|
| 0/1 | Ripple de tema (`themeRipple`) | 🟡 Parcial | Pronto, não conectado |
| 0/1 | Slot machine do saldo (`balSlot`) | 🟡 Parcial | Pronto, não conectado |
| 0/1 | 10 temas prontos (UI + drag) | ✅ Fiel | — |
| 0/1 | Cor por pessoa (swatches + picker) | ✅ Fiel | — |
| 0/1 | Capa do saldo (heroStyle, 4 estilos) | 🔵 Simplificado | Card hero virou quadrante de grid genérico |
| 0/1 | Sparkline do card de saldo | ❌ Faltando | Não existia no Dashboard |
| 0/1 | Badge de variação "▲X% vs mês ant." | ❌ Faltando | Elemento não existia |
| 0/1 | Botão de ocultar valores (olho) | ✅ Fiel | — |
| 2 | FAB speed dial (completo) | ✅ Fiel | Replicado literalmente |
| 2 | Priorização contextual do FAB | ✅ Fiel | Lógica e cores idênticas |
| 2 | Busca em lançamentos | ✅ Fiel | — |
| 2 | Duplicar lançamento | ✅ Fiel | — |
| 2 | Modo privacidade | 🟡 Parcial | Real persiste em localStorage (divergência deliberada) |
| 2 | Swipe em lançamentos | ✅ Fiel | Mecânica replicada 1:1 |
| 2 | Long-press no FAB | ✅ Fiel (ausência confirmada) | Não existe em nenhum dos dois lados |
| 3 | Gradiente do cabeçalho do cartão | ✅ Fiel | — |
| 3 | Chip do cartão físico | ✅ Fiel | — |
| 3 | Chevron animado (spring easing) | ✅ Fiel | — |
| 3 | Badge de pessoa no cabeçalho | ✅ Fiel | — |
| 3 | Animação de entrada em stagger | ❌ Faltando | `listItemIn` existia no CSS, não aplicada |
| 3 | Barra de limite de crédito | 🟡 Parcial | Easing simplificado (`.4s` linear vs `.5s cubic-bezier`) |
| 3 | Regra "primeiro aberto" | 🔵 Simplificado (superior) | Dinâmico em vez de hardcode `id===1` |
| 3 | Timeline por dia | ✅ Fiel | — |
| 3 | Subitens do gasto | ✅ Fiel | — |
| 3 | Feedback de toque (`:active`) | ✅ Fiel | — |
| 4 | Calendário mensal | ✅ Fiel | — |
| 4 | Comparado ao mês anterior | ✅ Fiel | — |
| 4 | Top 5 gastos | ✅ Fiel | — |
| 4 | % por categoria | ✅ Fiel | — |
| 4 | Recordes (3 tipos) | ✅ Fiel | — |
| 4 | Evolução patrimonial (SVG) | ✅ Fiel | Fórmulas de coordenadas idênticas |
| 4 | Categoria detail sheet | 🟡 Parcial | Faltava animação `barGrow` |
| 4 | Projeção dia a dia | ✅ Fiel | — |
| 4 | Horizonte de saldos | ✅ Fiel | Thresholds de cor idênticos |
| 4 | Resumo do orçamento (mini-tabela) | ✅ Fiel | — |
| 5/6 | Alertas inteligentes | ✅ Fiel | — |
| 5/6 | Limite de gasto livre | ✅ Fiel | — |
| 5/6 | Metas de economia | 🟡 Parcial | Duplicação de fórmula de cor (risco de manutenção, não visual) |
| 5/6 | Pull-to-refresh | 🟡 Parcial | Fórmulas idênticas; captura via `document` em vez de scroller dedicado |
| 5/6 | Flash de cor sincronizado | ✅ Fiel | — |
| 5/6 | 5 estados vazios ilustrados | 🟡 Parcial | 3/5 fiéis; Lançamentos e Calendário usavam padrão antigo |
| 5/6 | Tour guiado (4 balões) | ✅ Fiel | Textos idênticos |
| 5/6 | Splash screen | ✅ Fiel | Keyframes renomeados, timing idêntico (1650ms) |
| 5/6 | Micro-bounce do nav | ✅ Fiel | — |
| 5/6 | Dígitos slot machine | 🔵 Simplificado | Função pronta, não conectada ao card de saldo |
| 5/6 | Ícones de categoria (20 emojis) | ✅ Fiel | Lista e grid idênticos |

**Resumo quantitativo:** de ~45 itens auditados, a esmagadora maioria (~33) ficou ✅ Fiel — cores, timings, easings e textos replicados literalmente, muitas vezes caractere por caractere. Os problemas reais concentraram-se em **conexões faltando** (funções prontas mas nunca chamadas) e **um componente estrutural simplificado** (o card hero de saldo), não em fórmulas erradas ou trabalho malfeito.

---

## Top 5 prioridades de correção (por impacto visual percebido)

Esta foi a lista usada para as correções já aplicadas em sessão subsequente:

1. **Card de saldo do Dashboard rebaixado a stat-card genérico** (Fase 0/1) — maior perda: sem sparkline, sem badge de variação, tipografia 18px em vez de 38px. É o primeiro elemento que o usuário vê ao abrir o app.
2. **Falta de stagger de entrada nos cards de cartão** (Fase 3) — keyframe `listItemIn` já existia no CSS mas nunca foi aplicado; itens apareciam instantaneamente em vez de em cascata.
3. **Ripple de tema e slot machine prontos mas nunca chamados** (Fase 0/1 e 5/6) — código funcional, zero linhas de integração faltando.
4. **Empty states de Lançamentos e Calendário no padrão antigo** (Fase 5/6) — inconsistência visível: 3 das 5 telas (Cartões, Categorias, Orçamento) já tinham o padrão rico ilustrado; Lançamentos e Calendário ficaram para trás.
5. **Duas animações CSS pontuais faltando**: `barGrow` no gráfico de evolução de categoria (Fase 4) e o easing correto (`.5s cubic-bezier` vs `.4s` linear) na barra de limite de cartão (Fase 3).

---

## Status: CORREÇÕES APLICADAS

As 5 prioridades acima foram implementadas em sessão posterior a esta auditoria:
- Novo card hero de saldo (`#hero-saldo-card`) com sparkline real, badge de variação calculado, tipografia 38px e dígitos slot-machine.
- `listItemIn` aplicado com delay escalonado em cards de cartão, grupos-dia da timeline e itens de lançamento.
- `fireThemeRipple()` conectado em `toggleTheme()`, `onAutoThemeToggle()` e `applyThemePreset()`.
- `emptyStateTxHtml()` e `emptyStateCalendarioHtml()` criadas e aplicadas, unificando os 5 estados vazios no mesmo padrão.
- Keyframe `barGrow` adicionado e aplicado ao gráfico de categoria; easing da barra de limite corrigido.

Todos os 17 arquivos JS passam em `node --check` após as correções. `sw.js` bumpado para v15.

### Itens conhecidos que permanecem como divergência aceita (não corrigidos, por serem decisões deliberadas ou de baixo impacto)
- Persistência do modo privacidade em localStorage (Fase 2) — decisão de produto razoável para um PWA de uso contínuo.
- Regra "primeiro aberto" dinâmica em vez de hardcode de id (Fase 3) — melhoria sobre o protótipo, não regressão.
- Pull-to-refresh capturando via `document`/`scrollY` em vez de scroller dedicado (Fase 5/6) — adaptação estrutural necessária, já que o app real não tem um container de scroll por página como o protótipo.
- Duplicação da fórmula de cor em metas de economia (Fase 5/6) — resultado visual idêntico hoje; é um risco de manutenção futura, não um bug visível.
