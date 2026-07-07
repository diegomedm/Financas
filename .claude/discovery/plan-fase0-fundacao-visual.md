# Plano de Desenvolvimento — Fase 0: Fundação Visual (Design Handoff)

**Versão:** 1.0
**Data:** 2026-07-07
**Status:** Aguardando aprovação
**Nível de complexidade:** 🔵 N2 MVP — refatoração/extensão de sistema visual existente, com usuário real, sem dados sensíveis novos, escopo bem delimitado

---

## 0. Origem e escopo deste plano

Este plano cobre exclusivamente a **Fase 0 — Fundação Visual** do handoff de design entregue em
`C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\README.md`.

As fases 1–6 do handoff (Aparência completa em Configurações, FAB speed dial, redesign de Cartões,
novas visões, planejamento, microinterações) **não fazem parte deste plano** e serão tratadas em
planos futuros, um a um, após aprovação individual — conforme decisão do usuário de seguir a ordem
0→1→2→3→4→5→6 com aprovação entre cada etapa.

O protótipo `Financas App.dc.html` é referência visual/comportamental — não é código a copiar. A
ROADMAP.md do handoff mostra status "[FEITO]" apenas dentro do protótipo de design; nenhuma dessas
features existe hoje no app real.

---

## 1. Inventário de Funcionalidades Atuais (regra de ouro — nada pode ser perdido)

Cruzamento dos itens INTOCÁVEIS do README.md do handoff contra o código real do repositório.

| # | Item INTOCÁVEL (README) | Onde vive no código real | Confirmado |
|---|--------------------------|---------------------------|------------|
| 1 | Persistência IndexedDB — schema, migrações, registros | `js/db.js` (schema v6, 8 stores), `.claude/architecture.md` documenta o schema | ✅ |
| 2 | Lançamentos: CRUD, tipos, data, subitens, recorrência, adiar/atrasar | `js/transactions.js` (~700 linhas) | ✅ |
| 3 | Orçamento: itens por mês, tipos, `budgetDone` (`id_AAAAMM`), recorrência always, categorias orçadas (`isCategoriaOnly`+`categoriaKey`) | `js/budget.js` (~1000 linhas), store `budget` e `budgetDone` em `db.js` | ✅ |
| 4 | Alfinete (mês de referência/pinado) | `refMonth`/`refYear` em `localStorage`, botão 📌 em todas as 5 abas (`js/app.js`), usado por `js/projection.js` e `js/budget.js` (categorias) | ✅ |
| 5 | Cartões: CRUD, fechamento/vencimento, limite, gastos, recorrências, parcelamento, fatura agregada, "Fatura <cartão>" no fluxo de caixa | `js/cards-modal.js` (~700), `js/cards-render.js` (~400) | ✅ |
| 6 | Projeção: N períodos (3/6/12), saldo acumulado | `js/projection.js` (~160) | ✅ |
| 7 | Filtros por pessoa (estado global) e por período (‹ mês ›) | `pessoaFilter` global (`js/globals.js`/`transactions.js`), month-nav em cada aba (`js/app.js`) | ✅ |
| 8 | Pessoas: nome + cor, propagação a pills/avatares | `js/pessoas.js` (~195) | ✅ |
| 9 | Configurações: atualizar app, histórico de atualizações | `js/config.js` (`forceRefresh`, `lastUpdateHistory` em localStorage) | ✅ |
| 10 | Tema claro E escuro | CSS inline em `index.html` linhas 16–41 (`:root` + `body.light`), `applyTheme()`/`toggleTheme()` em `js/app.js` linhas 25–32 | ✅ |

**Conclusão do inventário:** todos os 10 itens INTOCÁVEIS foram localizados e confirmados no código real. Nenhum gap de entendimento antes de propor mudanças na Fase 0.

### 1.1 Sistema de tema atual — detalhamento (relevante para Fase 0)

- **CSS custom properties** em `:root` (`index.html` linhas 16–29): `--bg`, `--bg2`, `--bg3`, `--bg4`, `--bg5`, `--border`, `--border2`, `--text`, `--text2`, `--text3`, cores semânticas (`--green`, `--red`, `--blue`, `--amber`, `--purple`, `--teal` + variantes `-bg`/`-border`), `--nav-bg`, `--radius`, `--radius-sm`, `--font`, `--mono`.
- **Tema claro** via `body.light{...}` (linhas 30–41) sobrescrevendo as mesmas variáveis.
- **Toggle**: `applyTheme(dark)` em `js/app.js` — `classList.toggle('light', !dark)`, atualiza `<meta name="theme-color">`, persiste em `localStorage.setItem('theme', dark?'dark':'light')`, sincroniza checkbox `#toggle-dark`.
- **Inicialização**: `app.js` linha 103 — `applyTheme((localStorage.getItem('theme')||'dark')==='dark')`.
- **Fontes**: `@import` do Google Fonts já carrega **DM Sans** (pesos 300/400/500/600) e **DM Mono** (400/500) — `index.html` linha 14. `--font` e `--mono` já usados consistentemente em ~15 seletores CSS.
- **Confirmação pedida pelo usuário**: sim, DM Sans/DM Mono já são as fontes do app real. Não há gap de fonte na Fase 0.

### 1.2 Paleta atual vs. tokens do protótipo (Design Tokens do README)

A paleta dark atual do app real (`:root`) é **numericamente idêntica** ao ramp `Profundo` (`DARK_RAMPS.Profundo`) do protótipo:
`--bg:#0d0f1a`, `--bg2:#151829`, `--bg3:#1c2038`, `--border:#323760`(vs `#232742` no README — pequena divergência a verificar), `--text:#eef0ff`.

Isso confirma que a base visual do app real já é o ponto de partida "Profundo/dark" do sistema de temas do protótipo — a Fase 0 é uma **extensão** do que já existe, não uma reescrita.

---

## 2. Objetivos e Critérios de Sucesso

| Objetivo | Métrica de sucesso | Prazo esperado |
|----------|--------------------|-----------------|
| Estrutura de tokens (ramps × tons × superfícies) implementada em CSS | `:root` gera variáveis a partir de combinação tema×tom×superfície sem quebrar nenhuma tela | Sprint única |
| Accent configurável tecnicamente disponível | Variável `--blue` (accent) pode ser trocada via função JS sem editar CSS | Sprint única |
| Persistência da aparência escolhida | Reload da página mantém tema/tom/superfície/accent escolhidos | Sprint única |
| Fontes confirmadas | DM Sans/DM Mono seguem carregando sem alteração de comportamento | Sprint única |
| Zero regressão funcional | Checklist da regra de ouro (seção 4 do README) roda 100% sem perda | Sprint única |

**Nota de escopo:** a Fase 0 entrega a **fundação técnica** (tokens + persistência). A **UI para o usuário escolher** tom/superfície/accent/10 temas prontos é da Fase 1 (Aparência em Configurações) — fora deste plano. Nesta fase, a estrutura fica pronta "por baixo", com o único controle visível ao usuário sendo o toggle de tema claro/escuro já existente (mantido como está).

---

## 3. Escopo

### ✅ Dentro do escopo

- Refatorar as CSS custom properties de `index.html` para nascerem de uma função de composição de tokens (tema `dark`/`light` × tom `Profundo`/`Neutro`/`Quente` × superfície `Cartões`/`Minimal`/`Contraste`), preservando os valores atuais como padrão (`dark` + `Profundo` + `Cartões`) — zero mudança visual perceptível ao usuário nesta fase.
- Introduzir variável de accent configurável (`--blue` e derivados `--blue-bg`/`--blue-border`) computável via função JS, mantendo `#5b8eff` como valor padrão atual.
- Persistir a escolha de aparência (tema, tom, superfície, accent) em `localStorage`, sob uma chave nova e explícita (ex.: `financas-look`), sem colidir com a chave `theme` já existente.
- Manter compatibilidade retroativa: se não houver nada salvo na nova chave, o app continua funcionando com o comportamento atual (`theme` = dark/light).
- Confirmar e manter DM Sans/DM Mono sem alteração de import ou fallback.
- Testes manuais de regressão cobrindo os 10 itens INTOCÁVEIS do inventário (seção 1).

### 🔜 Fora do escopo agora (futuro — fases seguintes)

- UI de seleção de tema/accent/tom/superfície em Configurações (Fase 1)
- Tema automático por horário, modo OLED, capa do saldo, 10 temas prontos, cor por pessoa (Fase 1)
- Qualquer mudança em FAB, busca, swipe, cartões, calendário, relatórios, metas, alertas, onboarding (Fases 2–6)

### ❌ Explicitamente fora do escopo

- Migração ou alteração de dados em IndexedDB
- Mudança de comportamento do toggle de tema atual (`toggleTheme`) — continua funcionando exatamente como hoje
- Qualquer alteração de UX visível ao usuário nesta fase (a fundação é invisível por design — só habilita as fases seguintes)

---

## 4. Módulos / Componentes Afetados

| Módulo | Responsabilidade nesta fase | Complexidade | Dependências |
|--------|------------------------------|---------------|---------------|
| `index.html` (CSS inline) | Reestruturar `:root`/`body.light` em tokens compostos, sem mudar valores padrão | Média | Nenhuma |
| `js/config.js` ou novo `js/theme.js` | Função `buildTokens()`/`applyLook()` que aplica variáveis CSS via `style.setProperty`, persistência em localStorage | Média | `index.html` (tokens base) |
| `js/app.js` | Ajustar `applyTheme()`/inicialização para coexistir com a nova função de composição sem duplicar lógica de persistência | Baixa | `theme.js`/`config.js` |

**Decisão a validar com Tech Lead/Dev na implementação:** criar `js/theme.js` novo (mais limpo, sem inflar `config.js` que já tem ~215 linhas) vs. estender `config.js`. Recomendação deste plano: **novo arquivo `js/theme.js`**, inserido na ordem de carregamento antes de `config.js` (ex.: entre `projection.js` e `config.js`), respeitando a regra de `<script src>` sequencial documentada em `architecture.md`.

---

## 5. Stack Sugerida

| Camada | Tecnologia sugerida | Justificativa |
|--------|----------------------|-----------------|
| Tokens de tema | CSS custom properties + JS puro (`style.setProperty`) | Já é o padrão do app; sem framework, sem build — consistente com arquitetura vigente |
| Persistência | `localStorage` (chave nova `financas-look`) | Já é o mecanismo usado para `theme`, `refMonth`, `refYear`, `lastUpdateHistory` |
| Fontes | DM Sans + DM Mono via Google Fonts (mantido) | Já implementado e correto — nenhuma mudança necessária |

---

## 6. Fases de Desenvolvimento (internas a esta Fase 0)

### Sub-fase 0.1 — Extração e composição de tokens
**Entregáveis:**
- [ ] Função `buildTokens(theme, mood, surface, accent)` isolada (`js/theme.js` novo) reproduzindo os valores atuais como default
- [ ] `index.html` `:root`/`body.light` continuam existindo como fallback estático (não remover — apenas passam a ser sobrescritos em runtime pela função, se houver preferência salva)
**Estimativa:** 2–3h

### Sub-fase 0.2 — Persistência e aplicação em runtime
**Entregáveis:**
- [ ] `applyLook()` aplica tokens via `style.setProperty` no `documentElement` ou `body`
- [ ] Persistência em `localStorage['financas-look']` (JSON: `{theme, mood, surface, accent}`)
- [ ] Inicialização em `app.js` lê a nova chave; se ausente, usa fallback do `theme` atual (compatibilidade)
**Estimativa:** 2h

### Sub-fase 0.3 — Validação de regressão
**Entregáveis:**
- [ ] Checklist manual dos 10 itens INTOCÁVEIS (criar/editar/excluir lançamento com subitens, marcar orçamento realizado, alternar alfinete, trocar filtro pessoa/mês em todas as telas, dados antigos do IndexedDB aparecendo)
- [ ] Confirmar toggle claro/escuro atual continua idêntico visualmente
**Estimativa:** 1h

**Estimativa total: ~5–6h**

---

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-----------------|----------|-----------|
| Duplicação de fonte de verdade entre `:root` CSS estático e tokens aplicados via JS pode gerar flash de estilo incorreto (FOUC) ao carregar | Média | Médio | Aplicar `applyLook()` o mais cedo possível no `<head>` (antes do primeiro paint), ou aceitar pequeno delay controlado já que o app é PWA cacheado |
| Nova chave `localStorage['financas-look']` pode ficar dessincronizada da chave antiga `theme` se o usuário trocar tema pelo toggle atual sem atualizar a nova chave | Alta | Médio | `toggleTheme()` deve atualizar as duas chaves nesta fase, ou a Fase 0 unifica a leitura sob uma única função — decisão a formalizar na spec do PO |
| CSS inline em `index.html` tem ~2k linhas com muitas referências a `var(--bg)` etc. — qualquer renomeação de variável quebra em cascata | Baixa (mitigado por não renomear) | Alto se ocorrer | Este plano **não renomeia nenhuma variável existente** — apenas adiciona composição por cima. Nomes atuais (`--bg`, `--blue`, etc.) são preservados |
| `--border` no app real (`#323760`) diverge do valor documentado no README do handoff (`#232742`) | Baixa | Baixo | Sinalizado na seção 1.2. Não é bloqueante — a Fase 0 não aplica o ramp do protótipo, apenas prepara a estrutura. Divergência de cor exata será resolvida na Fase 1, quando os temas prontos forem de fato aplicados |
| SW cache-first pode servir versão antiga do `index.html`/JS durante o rollout, mostrando UI inconsistente até o usuário forçar refresh | Média | Baixo | Bump de versão do SW (`financas-vNN`) obrigatório neste ciclo, como já é praxe no projeto |
| Risco de escopo "invisível" gerar sensação de nenhum progresso ao usuário | Baixa | Baixo | Comunicar claramente que Fase 0 é fundação técnica sem mudança visual perceptível — a Fase 1 é onde a experiência muda |

---

## 8. Processo e Agentes Ativos

| Agente | Ativo neste plano? | Quando | Disponível em |
|--------|---------------------|--------|-----------------|
| Product Manager | Não | — | anthropic-skills local (gap não aplicável a N2) |
| Product Owner | Sim | Escrever spec detalhada (BDD) para Fase 0 após aprovação deste plano | local (`.claude` cascade) |
| UX Architect | Não | Fase 0 não tem UI nova visível — retorna na Fase 1 | local |
| Software Architect | Não | Não necessário em N2 | — |
| Tech Lead | Opcional | Validar decisão `js/theme.js` novo vs. estender `config.js`, e ordem de carregamento no `<script src>` | local |
| Senior Dev | Sim | Implementação de `theme.js`, ajustes em `app.js`/`index.html` | local |
| Code Reviewer | Sim | Revisão pós-implementação (mudança em arquitetura de tokens merece revisão mesmo em N2, dado o risco de FOUC/dessincronização listado acima) | local |
| QA Engineer | Sim (básico) | Checklist de regressão dos 10 itens INTOCÁVEIS | local |
| Test Runner | Não | Sem harness automatizado no projeto (DT-003 conhecido) — validação manual | — |
| Infra/DevOps | Não | Deploy já é push-to-main → GitHub Pages, sem mudança de pipeline | — |
| Retrospective | Não | Reservado para fim de ciclo maior (todas as 7 fases), não por sub-fase | — |

**Gates obrigatórios neste nível (N2):**

| Gate | Aplicado? |
|------|-----------|
| Aprovação do plano | ✅ obrigatório |
| DoR antes do sprint | ❌ |
| Code Review | ✅ recomendado dado o risco arquitetural (tokens/CSS runtime) mesmo sendo N2 |
| QA formal | Smoke test / checklist manual dos 10 itens INTOCÁVEIS |
| ADRs | ❌ (decisão de arquivo novo pode ser registrada em nota de spec, não ADR formal) |
| Contratos de API | ❌ (não aplicável — sem API) |
| Observabilidade | ❌ |
| Smoke pós-deploy | ✅ — checklist manual pós-deploy no GitHub Pages |

---

## 9. Gaps de Skill Identificados

Nenhum gap identificado. Os agentes necessários (Product Owner, Senior Dev, Code Reviewer, QA Engineer) já existem localmente em `.claude/agents/` (ou via cascata do CLAUDE.md global) e cobrem integralmente o escopo desta fase.

---

## 10. Decisões do Usuário (2026-07-07)

- [x] **`js/theme.js` novo** — arquivo dedicado, inserido antes de `config.js` na ordem de carregamento.
- [x] **Unificar `toggleTheme()` com `applyLook()` já na Fase 0** — evita dessincronização entre as chaves `theme` e `financas-look`. `toggleTheme()` passa a delegar para `applyLook()` internamente, ou é absorvido por ela, mantendo o mesmo comportamento externo (checkbox `#toggle-dark`, `<meta name="theme-color">`).
- [x] **Divergência de `--border`** — usuário não sabe a origem; não bloqueia a Fase 0 (que não aplica o ramp do protótipo ainda). Revisitar na Fase 1 quando os temas prontos forem aplicados de fato.

---

## 11. Próximos Passos (após aprovação)

1. Usuário aprova este plano
2. Product Owner escreve spec detalhada (`.claude/specs/fase0-fundacao-visual.md`) com Critérios de Aceite em BDD, cobrindo especialmente a persistência e a compatibilidade com o toggle atual
3. Senior Dev implementa conforme spec
4. Code Reviewer revisa (foco: FOUC, dessincronização de chaves localStorage, zero regressão)
5. QA Engineer roda checklist dos 10 itens INTOCÁVEIS + smoke test pós-deploy
6. Usuário aprova a Fase 0 concluída → Discovery Agent é acionado novamente para elaborar o plano da Fase 1 (Aparência em Configurações)
