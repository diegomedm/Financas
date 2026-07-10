# Plano de Desenvolvimento — Fase 1: Aparência (Configurações)

**Versão:** 1.0
**Data:** 2026-07-07
**Status:** Aguardando aprovação
**Nível de complexidade:** 🔵 N2 MVP — extensão de UI sobre fundação técnica já pronta (Fase 0), sem dados sensíveis novos, usuários reais já existentes (Diego/Camila), escopo grande porém bem delimitado e sem necessidade de arquitetura nova

---

## 0. Origem e escopo deste plano

Este plano cobre exclusivamente a **Fase 1 — Aparência (Configurações)** do handoff de design em
`C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\README.md`,
que depende da Fase 0 (fundação visual — já implementada, revisada e commitada em `153fb10`).

Fases 2–6 do handoff (FAB speed dial, redesign de Cartões, novas visões, planejamento, microinterações)
não fazem parte deste plano.

O protótipo `Financas App.dc.html` (+ `support.js`) é referência visual/comportamental — não é código a
copiar. Trechos relevantes lidos para este plano: linhas 738–866 (tela Configurações/Aparência),
1416–1665 (THEME_PRESETS, DARK_RAMPS/LIGHT_RAMPS, DARK_SEM/LIGHT_SEM, PESSOA_COLORS, `buildTokens()`,
`applyPreset()`, `persistLook()`, `_effTheme()`).

---

## 1. Inventário e Cruzamento — o que já existe vs. o que a Fase 1 adiciona

### 1.1 Fundação técnica já pronta (Fase 0 — `js/theme.js`)

| Peça | Estado atual |
|------|--------------|
| `buildTokens(theme, mood, surface, accent)` | Existe. Só `theme` (dark/light) e `accent` têm efeito real. `mood`/`surface` são aceitos mas ignorados (RN-03 da spec Fase 0) — só existe 1 mood (Profundo) e 1 surface (Cartões) implementados. |
| `applyLook(look)` | Existe. Aplica tokens via `style.setProperty`, sincroniza `#toggle-dark`, `<meta name="theme-color">`, persiste em `localStorage['financas-look']` e espelha em `localStorage['theme']` (compat). |
| `getSavedLook()` | Existe. Fallback correto para usuário legado sem `financas-look`. |
| Accent customizado | Troca só `--blue`. `--blue-bg`/`--blue-border` continuam hardcoded no tema base (RN-04 — fórmula real adiada explicitamente para esta fase). |
| `oled` | **Não existe** nenhum campo/flag hoje — nem em `buildTokens`, nem em `getSavedLook`, nem em `THEME_PRESETS`-equivalente (que também não existe). |
| `autoTheme` (tema por horário) | **Não existe.** |
| `heroStyle` (capa do saldo) | **Não existe.** Não há sequer o conceito de "hero"/card de saldo estilizável no CSS atual. |
| UI de seleção (toggles, swatches, temas prontos) | **Não existe nenhuma** — tela de Configurações hoje só tem o toggle de tema claro/escuro (`js/config.js`). |

### 1.2 Cor por pessoa — já existe parcialmente no app real

`js/pessoas.js` já implementa cor por pessoa: 6 swatches fixas (`PERSON_COLORS`), seleção via clique,
persistida no registro da pessoa (`pessoasPut`), propagada a avatares/pills/filtros. **Isto não é gap —
é feature existente.** O que falta, comparado ao protótipo:

- Seletor livre `input[type=color]` (círculo "arco-íris" via `conic-gradient`) além das 6 swatches fixas
- Paleta de swatches diverge: atual `PERSON_COLORS = ['#5b8eff','#3ddc84','#ff6b6b','#ffb547','#a78bfa','#2dd4bf']`
  vs. protótipo `PESSOA_COLORS = ['#5b8eff','#a78bfa','#22c55e','#f97316','#ec4899','#14b8a6']` — cores
  parecidas mas não idênticas (ver seção 3, decisão pendente).

### 1.3 Modelo dos "10 temas prontos" — como se relacionam com theme/mood/surface/accent

Trecho decisivo do protótipo (`Financas App.dc.html`, linhas 1423–1435):

```js
const THEME_PRESETS=[
  {name:'Meia-noite',theme:'dark',  mood:'Profundo',accent:'#5b8eff',surface:'Cartões',  oled:false},
  {name:'Papel',     theme:'light', mood:'Neutro',  accent:'#5b8eff',surface:'Minimal',  oled:false},
  {name:'Café',      theme:'dark',  mood:'Quente',  accent:'#f97316',surface:'Cartões',  oled:false},
  {name:'Neon',      theme:'dark',  mood:'Neutro',  accent:'#ec4899',surface:'Contraste',oled:false},
  {name:'Breu',      theme:'dark',  mood:'Neutro',  accent:'#14b8a6',surface:'Minimal',  oled:true },
  {name:'Oceano',    theme:'dark',  mood:'Profundo',accent:'#14b8a6',surface:'Cartões',  oled:false},
  {name:'Floresta',  theme:'dark',  mood:'Neutro',  accent:'#22c55e',surface:'Cartões',  oled:false},
  {name:'Rosé',      theme:'light', mood:'Quente',  accent:'#ec4899',surface:'Cartões',  oled:false},
  {name:'Lavanda',   theme:'light', mood:'Profundo',accent:'#a855f7',surface:'Minimal',  oled:false},
  {name:'Âmbar',     theme:'light', mood:'Quente',  accent:'#f97316',surface:'Contraste',oled:false},
];
```

**Resposta objetiva (item 4 do pedido):** os 10 temas prontos **não introduzem uma 5ª dimensão** — são
**combinações pré-definidas** dos 5 campos já modelados no protótipo: `theme` + `mood` + `accent` +
`surface` + `oled`. `oled` é o único campo desses 5 que ainda não existe no app real (nem no `theme.js`
da Fase 0, nem em `getSavedLook`/`buildTokens`). Ele se comporta como um **6º parâmetro boolean** que,
quando `true` e `theme==='dark'`, força `--bg:'#000000'` por cima do ramp escolhido (visto na função
`buildTokens` do protótipo, linha 1542: `if(dark&&oled)R['--bg']='#000000'`).

Consequência prática para este plano: `buildTokens()` do app real precisa aceitar um 5º parâmetro
`oled` (boolean), e a estrutura de "temas prontos" é apenas **dados** (array de objetos), aplicados
chamando `applyLook({theme, mood, surface, accent, oled})` já existente — nenhuma função nova de
composição é necessária além de adicionar suporte a `oled` em `buildTokens`/`applyLook`/`getSavedLook`.

### 1.4 Fórmula real de accent → `--blue-bg`/`--blue-border` (resolve pendência RN-04 da Fase 0)

Protótipo, linha 1555: `'--blue':accent,'--blue-bg':accent+'22','--blue-border':accent+'55'` — ou seja,
hex + canal alfa de 2 dígitos (`22` ≈ 13% opacidade, `55` ≈ 33% opacidade) concatenado ao hex de 6
dígitos do accent. **Esta é a fórmula que resolve o adiamento explícito da Fase 0** (RN-04) e deve ser
implementada nesta fase, já que os 10 temas prontos e a troca de accent dependem dela para não deixar
`--blue-bg`/`--blue-border` incoerentes com o accent escolhido.

### 1.5 Mood (Profundo/Neutro/Quente) e Surface (Cartões/Minimal/Contraste) — precisam de ramps reais

Hoje `buildTokens()` no app real ignora `mood`/`surface` (só entrega o ramp "Profundo"/"Cartões"
hardcoded). O protótipo tem os 3 ramps de mood completos para dark e light (`DARK_RAMPS`/`LIGHT_RAMPS`,
linhas 1437–1446) e os valores semânticos fixos por tema (`DARK_SEM`/`LIGHT_SEM`, independem de mood).
**Surface (Cartões/Minimal/Contraste)** não aparece como objeto de tokens de cor no trecho lido — é
tratado separadamente como estilo estrutural (bordas/contraste de cards), não como paleta. Isto precisa
de investigação adicional durante a spec (ver seção 10 — Perguntas em Aberto).

---

## 2. Objetivos e Critérios de Sucesso

| Objetivo | Métrica de sucesso | Prazo esperado |
|----------|--------------------|-----------------|
| Seção Aparência funcional em Configurações | Todos os controles (tema, automático, OLED, accent, mood, surface, capa do saldo) aplicam mudança visual real e persistem | Por sub-fase (ver seção 6) |
| 10 temas prontos aplicáveis num toque | Clique no card aplica `theme+mood+accent+surface+oled` simultaneamente, sem quebrar nenhuma tela | Sub-fase 1b |
| Cor por pessoa com seletor livre | Usuário escolhe qualquer cor via `input[type=color]`, além das 6 swatches | Sub-fase 1c |
| Capa do saldo com 4 estilos | Dashboard aplica Gradiente/Sólido/Mesh/Aurora no card de saldo | Sub-fase 1d |
| Divergência `--border` resolvida | Decisão documentada e aplicada de forma consistente (ver seção 3) | Sub-fase 1a |
| Zero regressão funcional | Checklist dos 10 itens INTOCÁVEIS (README) roda 100% sem perda, em cada sub-fase | Contínuo |

---

## 3. Decisão — Divergência `--border` (#323760 vs #232742)

**Investigação feita nesta sessão:** o protótipo real (`Financas App.dc.html`, `DARK_RAMPS.Profundo`,
linha 1438) usa `'--border':'#323760'` — **idêntico ao valor já implementado no app real** (`js/theme.js`
Fase 0) e **idêntico ao `:root` original do `index.html`**. O valor `#232742` citado no `README.md`
(linha 87, seção "Cores (tema escuro, tom Profundo — base)") está **desatualizado/incorreto** em relação
ao código-fonte real do protótipo — não é uma decisão de design divergente, é um erro de transcrição na
documentação.

**Decisão deste plano:** manter `#323760` (já implementado, já correto, já bate com o protótipo real).
Nenhuma migração de código necessária. Recomenda-se sinalizar ao autor do handoff que o README.md tem
um valor de `--border` desatualizado, para eventual correção da documentação (fora do escopo de código
deste plano).

---

## 4. Escopo

### ✅ Dentro do escopo

- **Toggle tema automático por horário** (claro 6h–18h, escuro fora disso) — `autoTheme` boolean,
  recalcula tema efetivo dinamicamente (sem sobrescrever a escolha manual do usuário quando ele desliga
  o automático).
- **Modo OLED** — toggle boolean, força `--bg:#000000` quando tema escuro ativo. `--navBg` herda o efeito
  por espelhar `--bg`; `--bg2`/`--bg3`/`--bg4` (cards) **não** são afetados — confirmado na investigação
  técnica (seção 11.1.2).
- **Cor de destaque (accent)** — 6 swatches fixas + fórmula real `accent+'22'`/`accent+'55'` para
  `--blue-bg`/`--blue-border` (resolve RN-04 pendente da Fase 0).
- **Tom das cores (mood)** — seletor real Profundo/Neutro/Quente, com os 3 ramps completos (dark e
  light) portados do protótipo para `js/theme.js`.
- **Estilo de superfície (surface)** — seletor real Cartões/Minimal/Contraste, com efeito visual
  confirmado na investigação técnica (seção 11.1.1): transformação pós-ramp de mood sobre
  `--bg2`/`--bg3`/`--bg4`/`--border`/`--border2`.
- **10 temas prontos** — fileira horizontal arrastável (drag sem capturar clique), aplicando presets
  pré-definidos combinando theme+mood+accent+surface+oled.
- **Cor por pessoa — seletor livre** — `input[type=color]` como círculo arco-íris, adicional às 6
  swatches já existentes.
- **Capa do saldo (heroStyle)** — 4 estilos (Gradiente/Sólido/Mesh/Aurora) aplicados ao card de saldo do
  Dashboard.
- Extensão de `buildTokens()`/`applyLook()`/`getSavedLook()` em `js/theme.js` para aceitar `oled`,
  `autoTheme`, `heroStyle` e ramps reais de mood.
- Nova UI em Configurações (`js/config.js` ou extração para módulo dedicado — a decidir com Tech Lead)
  para todos os controles acima.
- Testes manuais de regressão cobrindo os 10 itens INTOCÁVEIS a cada sub-fase entregue.

### 🔜 Fora do escopo agora (futuro — fases seguintes do handoff)

- FAB speed dial, busca, duplicar lançamento, modo privacidade, swipe (Fase 2)
- Redesign de Cartões (Fase 3)
- Calendário, relatório mensal, evolução patrimonial, detalhe de categoria, projeção dia a dia (Fase 4)
- Alertas inteligentes, limite de gasto livre, metas de economia (Fase 5)
- Microinterações, splash, ripple, onboarding, ícones por categoria (Fase 6)

### ❌ Explicitamente fora do escopo

- Migração ou alteração destrutiva de dados em IndexedDB
- Seletor de fonte numérica (G1 — pulado a pedido do usuário conforme ROADMAP.md)
- Avatar/foto por pessoa (G2 — pulado a pedido do usuário)
- Qualquer mudança em telas fora de Configurações e do card de saldo do Dashboard (heroStyle é a única
  exceção pontual, pois "capa do saldo" vive visualmente no Dashboard embora configurada em Aparência)

---

## 5. Módulos / Componentes Afetados

| Módulo | Responsabilidade nesta fase | Complexidade | Dependências |
|--------|------------------------------|---------------|---------------|
| `js/theme.js` | Estender `buildTokens()` (5º/6º parâmetro `oled`, ramps reais de mood, fórmula `accent+alpha`), estender `getSavedLook()`/`applyLook()` para `oled`/`autoTheme`/`heroStyle`/`mood`/`surface` reais, nova função de recálculo de tema efetivo (`autoTheme` → hora do dia) | Alta | Fase 0 (base já pronta) |
| `js/config.js` | Nova seção "Aparência" — toggles, swatches, seletores de mood/surface/heroStyle, fileira de 10 temas prontos | Alta | `theme.js` |
| `js/pessoas.js` | Adicionar `input[type=color]` livre ao lado das 6 swatches; decidir sobre paleta `PERSON_COLORS` (seção 3/10) | Baixa-Média | Nenhuma nova (extensão de código existente) |
| `index.html` (CSS inline) | Novas classes/estilos para: fileira de temas arrastável, círculo color-picker arco-íris, card de capa do saldo (Gradiente/Sólido/Mesh/Aurora), toggles adicionais | Média | Nenhuma |
| Dashboard (dentro de `app.js`/`transactions.js`, onde o card de saldo é renderizado) | Aplicar classe/estilo conforme `heroStyle` salvo | Média | `theme.js` (fonte do heroStyle) |

---

## 6. Recomendação de Sub-fases

A Fase 1 introduz volume grande de UI nova em uma única tela (Configurações) mais uma mudança pontual no
Dashboard (capa do saldo). Recomenda-se **dividir em 4 sub-fases entregáveis independentemente**,
cada uma com seu próprio ciclo PO → Dev → Code Review → QA, seguindo o mesmo padrão da Fase 0:

### 1a — Toggles simples + Tom das cores + Estilo de superfície (base)
**Por quê primeiro:** menor risco, sem UI de arrasto ou seletor de cor livre, resolve pendências
técnicas da Fase 0 (fórmula accent, ramps de mood) que todas as sub-fases seguintes dependem.
- Tema automático por horário (`autoTheme`)
- Modo OLED
- Cor de destaque — 6 swatches (accent já existe desde a Fase 0; aqui entra a fórmula real de
  `--blue-bg`/`--blue-border`)
- Tom das cores (mood) — seletor real com os 3 ramps
- Estilo de superfície (surface) — seletor real (efeito a definir na spec)
- Extensão de `theme.js`: `oled`, `autoTheme`, ramps de mood, fórmula accent+alpha

### 1b — 10 temas prontos
**Por quê depois de 1a:** depende de `oled`/mood/surface já funcionando de verdade — um preset que
aplica um mood/surface que ainda não tem efeito visual seria enganoso.
- Fileira horizontal arrastável (drag sem capturar clique — ponto de atenção de UX/acessibilidade)
- Card 74×68px com dot do accent + nome
- Array de 10 presets fixos, aplicados via `applyLook()` já estendida

### 1c — Cor por pessoa (seletor livre)
**Por quê pode ser paralela a 1b:** não depende de theme/mood/surface/oled — é uma feature isolada em
`pessoas.js`, já parcialmente implementada. Pode rodar em paralelo à 1b se houver capacidade.
- `input[type=color]` círculo arco-íris
- Decisão sobre paleta `PERSON_COLORS` (manter atual vs. adotar a do protótipo — ver seção 10)

### 1d — Capa do saldo (heroStyle)
**Por quê por último:** é a única peça que toca uma tela fora de Configurações (Dashboard), e depende
de decisões visuais (gradientes, mesh, aurora) que merecem validação isolada antes de mexer no
componente mais visível do app (o card de saldo é a primeira coisa que o usuário vê).
- 4 estilos: Gradiente / Sólido / Mesh / Aurora
- Aplicação no card de saldo do Dashboard

**Ordem recomendada:** 1a → 1b (+1c em paralelo se houver capacidade) → 1d.

Cada sub-fase é aprovável e entregável isoladamente — o usuário pode aprovar 1a e revisar 1b depois,
sem re-abrir uma spec monolítica de "Fase 1" inteira.

---

## 7. Stack Sugerida

| Camada | Tecnologia sugerida | Justificativa |
|--------|----------------------|-----------------|
| Tokens de tema | CSS custom properties + JS puro (`style.setProperty`), extensão de `js/theme.js` | Mesmo padrão da Fase 0 — sem framework, sem build |
| Drag da fileira de temas | Pointer events nativos (`onpointerdown/move/up`), sem lib externa | Protótipo já demonstra o padrão (`presetRowDown/Move/Up`) sem dependência — replicável em vanilla JS |
| Color picker livre | `<input type="color">` nativo do navegador | Zero dependência, suporte universal em mobile/desktop |
| Persistência | `localStorage['financas-look']` (já existe, será estendida) | Mesmo mecanismo da Fase 0 |

---

## 8. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-----------------|----------|-----------|
| Fileira de temas arrastável capturar o clique do card (drag vs. tap) | Média | Médio | Replicar a lógica de threshold do protótipo (`_psMoved`) — só dispara `onClick` se o pointer não se moveu além de um limiar |
| `autoTheme` conflitar com toggle manual de tema (usuário liga automático, depois clica manual — qual vence?) | Média | Médio | Formalizar em BDD na spec: toggle manual desliga `autoTheme` automaticamente (padrão do protótipo, linha 1628: `toggleTheme()` seta `autoTheme:false`) |
| Modo OLED + accent customizado + mood diferente de Profundo gerar combinações visuais não testadas (contraste ruim) | Média | Médio | QA cobre pelo menos os 10 presets prontos como casos de teste de combinação, já que representam os cenários "aprovados" pelo design |
| Ramps de mood (Neutro/Quente) alterarem também cores semânticas (verde/vermelho/etc.) e quebrar legibilidade de status financeiro (receita/despesa) | Baixa | Alto | Confirmado na leitura do protótipo: `DARK_SEM`/`LIGHT_SEM` são fixos por tema, independem de mood — cores semânticas não mudam com o tom. Sem risco real, mas validar no QA |
| `heroStyle` tocar o componente mais visível do app (saldo) pode introduzir regressão perceptível de legibilidade dos números | Média | Alto | Sub-fase isolada (1d), com QA dedicado antes de considerar a Fase 1 completa |
| Paleta `PERSON_COLORS` divergente do protótipo gerar confusão entre "cor sugerida" e "cor real" se o usuário comparar com o handoff | Baixa | Baixo | Decisão explícita do usuário na seção 10 — manter ou migrar |
| Volume de UI grande em uma única PR aumentar risco de regressão e dificultar revisão | Alta (se não dividido) | Médio | Mitigado pela divisão em sub-fases (seção 6) |

---

## 9. Processo e Agentes Ativos

| Agente | Ativo neste plano? | Quando | Disponível em |
|--------|---------------------|--------|-----------------|
| Product Manager | Não | N2 não exige | — |
| Product Owner | Sim | Uma spec por sub-fase (1a, 1b, 1c, 1d) com Critérios de Aceite em BDD | local |
| UX Architect | Recomendado (opcional formal em N2, mas volume de UI justifica) | Validar padrão de drag-sem-capturar-clique, hierarquia visual dos novos controles em Configurações, acessibilidade do color picker | local |
| Software Architect | Não | Não necessário em N2 | — |
| Tech Lead | Sim | Validar extração de "Aparência" para módulo dedicado vs. inflar `config.js` (~215 linhas hoje); revisar oled/autoTheme/heroStyle na composição de tokens | local |
| Senior Dev | Sim | Implementação de cada sub-fase | local |
| Code Reviewer | Sim | Revisão por sub-fase — foco em regressão de tokens, drag/tap, persistência | local |
| QA Engineer | Sim (básico) | Checklist dos 10 itens INTOCÁVEIS + casos de combinação (10 presets) a cada sub-fase | local |
| Test Runner | Não | Sem harness automatizado (DT-003 conhecido) — validação manual | — |
| Infra/DevOps | Não | Deploy já é push-to-main → GitHub Pages | — |
| Retrospective | Não | Reservado para fim de ciclo maior (todas as fases do handoff) | — |

**Gates obrigatórios neste nível (N2), por sub-fase:**

| Gate | Aplicado? |
|------|-----------|
| Aprovação do plano | ✅ obrigatório (deste plano + de cada sub-fase antes de implementar) |
| DoR antes do sprint | ❌ |
| Code Review | ✅ recomendado (mesmo racional da Fase 0 — risco de regressão em tokens visuais) |
| QA formal | Smoke test / checklist manual dos 10 itens INTOCÁVEIS + casos de combinação de tema |
| ADRs | ❌ (decisões registradas nas specs de sub-fase, não ADR formal) |
| Contratos de API | ❌ (não aplicável) |
| Observabilidade | ❌ |
| Smoke pós-deploy | ✅ checklist manual pós-deploy no GitHub Pages |

---

## 10. Gaps de Skill Identificados

Nenhum gap identificado. Os agentes necessários já existem localmente. UX Architect é recomendado mas
não obrigatório em N2 — decisão final de acioná-lo ou não fica com o usuário/Orchestrator no início de
cada sub-fase.

---

## 11. Decisões do Usuário (registradas nesta sessão)

- [x] **Paleta `PERSON_COLORS`** — **DECIDIDO: migrar** para a paleta do protótipo
      (`#5b8eff #a78bfa #22c55e #f97316 #ec4899 #14b8a6`), substituindo a paleta atual do app real
      (`#5b8eff #3ddc84 #ff6b6b #ffb547 #a78bfa #2dd4bf`). Pessoas já cadastradas mantêm a cor gravada no
      próprio registro — a migração troca apenas as opções oferecidas ao usuário a partir de agora, sem
      efeito retroativo em pessoas existentes. Aplica-se à sub-fase **1c**.
- [x] **Ordem das sub-fases** — **DECIDIDO E CONFIRMADO, sem mudança**: 1a primeiro (toggles simples +
      tom das cores + estilo de superfície + fórmula real de accent) → depois 1b (10 temas prontos) e 1c
      (cor por pessoa) em paralelo → por último 1d (capa do saldo).

---

## 11.1 Investigação Técnica — Pontos Resolvidos por Leitura Direta do Protótipo

Os 3 pontos abaixo foram investigados diretamente em `Financas App.dc.html` (função `buildTokens`,
linhas 1537–1558, e pontos de uso relacionados) nesta sessão. Não dependem de decisão do usuário — são
fatos de comportamento do protótipo, documentados aqui para uso direto na spec de 1a (e 1d).

### 11.1.1 Efeito real de "Estilo de superfície" (Cartões / Minimal / Contraste)

Confirmado: `surface` **não é paleta de cor** (não tem ramp próprio como `mood`) — é um pós-processamento
aplicado em cima dos tokens de `bg2/bg3/bg4/border/border2` já resolvidos pelo `mood`. Trecho exato
(`buildTokens`, linhas 1543–1545):

```js
let bg2=R['--bg2'],bg3=R['--bg3'],bg4=R['--bg4'],border=R['--border'],border2=R['--border2'];
if(surface==='Minimal'){
  bg2=R['--bg'];bg3=R0['--bg2'];bg4=R0['--bg3'];border='transparent';border2=R0['--border'];
}
else if(surface==='Contraste'){
  border=R['--border2'];border2=R['--border2'];
}
// 'Cartões' (default): nenhuma alteração — usa bg2/bg3/bg4/border/border2 do ramp de mood como estão
```

Tradução prática por estilo:
- **Cartões** (default/baseline) — nenhuma transformação. Cards usam `--bg2`/`--border` normais do mood
  ativo — é o comportamento já implementado hoje no app real (Fase 0).
- **Minimal** — cards "somem" no fundo: `--bg2` passa a ser igual ao `--bg` (cor de fundo geral, sem
  destaque de card), `--border` fica `transparent` (sem contorno visível). `--bg3`/`--bg4`/`--border2`
  usam os valores do ramp **Profundo original** (`R0`, não o ramp do mood ativo) como base para
  hover/estados internos — ou seja, Minimal "achata" a hierarquia de camadas para reduzir a separação
  visual entre card e fundo.
- **Contraste** — cards ganham borda mais forte: `--border` e `--border2` passam a usar o valor de
  `--border2` do ramp ativo (a borda "secundária", normalmente mais forte/visível que `--border`) —
  aumenta o contraste de contorno dos cards sem alterar cor de fundo.

Consequência para `theme.js`: `buildTokens()` precisa de um 3º parâmetro `surface` (string) aplicado
**depois** de resolver o ramp de `mood`, alterando apenas `--bg2`/`--bg3`/`--bg4`/`--border`/`--border2`
finais — não é um ramp próprio, é uma transformação condicional simples (if/else if, 2 branches + default).

### 11.1.2 Escopo real do Modo OLED

Confirmado: OLED afeta **apenas `--bg`**, e somente quando `theme==='dark'`. Trecho exato
(`buildTokens`, linha 1542):

```js
if(dark&&oled)R['--bg']='#000000';
```

Isso acontece **antes** de `bg2`/`bg3`/`bg4` serem lidos do ramp (linha 1543) — ou seja, OLED **não**
propaga `#000000` para `--bg2`/`--bg3`/`--bg4`/`--nav-bg` diretamente. Porém, `--navBg` no retorno final
(linha 1556: `'--navBg':R['--bg']`) **herda** o `--bg` já sobrescrito por OLED — então a barra de
navegação também fica preta absoluta quando OLED está ativo, mas isso é efeito colateral de `--navBg`
espelhar `--bg`, não uma regra separada para nav. Cards (`--bg2`) continuam com a cor normal do ramp —
o "preto absoluto" é só o fundo geral e a nav, não os cards, o que preserva a separação visual entre
card e fundo mesmo em OLED. Confirma a hipótese de "preto absoluto" citada no plano original, mas restrita
a `--bg`/`--navBg`, não a toda a superfície.

Consequência para `theme.js`: `buildTokens()` precisa aplicar `oled` como override de `--bg` **antes**
de resolver `bg2/bg3/bg4` a partir do ramp, e o token `--nav-bg` (nome real a confirmar no `theme.js`
atual) deve ser derivado do `--bg` já sobrescrito, replicando `--navBg':R['--bg']` do protótipo.

### 11.1.3 Pistas para "Mesh"/"Aurora" (capa do saldo — detalhar na spec de 1d)

Confirmado: os 4 estilos de `heroStyle` (`Gradiente`/`Sólido`/`Mesh`/`Aurora`) são resolvidos em
`buildTokens()` (linhas 1548–1553) como `--heroBg` (background) e `--heroBorder` (borda), consumidos
pelo card de saldo via CSS custom properties — não são classes CSS separadas, é tudo gradiente inline
calculado em JS. Trecho exato:

```js
const hs=heroStyle||'Gradiente';
let heroBg,heroBorder;
if(hs==='Sólido'){heroBg=bg2;heroBorder=border2;}
else if(hs==='Mesh'){
  heroBg='radial-gradient(120% 90% at 15% 0%,'+accent+'40 0%,transparent 55%),radial-gradient(110% 90% at 95% 15%,#a855f733 0%,transparent 55%),linear-gradient('+bg2+','+bg2+')';
  heroBorder=accent+'44';
}
else if(hs==='Aurora'){
  heroBg='radial-gradient(100% 80% at 0% 100%,#14b8a62e 0%,transparent 60%),radial-gradient(120% 90% at 100% 0%,'+accent+'3d 0%,transparent 55%),radial-gradient(90% 70% at 60% 100%,#a855f72a 0%,transparent 60%),linear-gradient('+bg2+','+bg2+')';
  heroBorder=accent+'44';
}
else{ // 'Gradiente' (default)
  heroBg='linear-gradient(160deg,'+accent+'22 0%,'+bg2+' 70%)';
  heroBorder=accent+'55';
}
```

Resumo por estilo:
- **Sólido** — sem gradiente, `heroBg` = `bg2` puro (cor de card normal), `heroBorder` = `border2`.
- **Gradiente** (default) — `linear-gradient` diagonal simples de `accent` (13% opacidade, alfa `22`) para
  `bg2`, borda com accent a 33% opacidade (alfa `55`).
- **Mesh** — 2 `radial-gradient`s decorativos (accent a 25% opacidade no canto superior esquerdo + roxo
  fixo `#a855f7` a 20% opacidade no canto superior direito) sobrepostos a um `linear-gradient` sólido de
  `bg2`→`bg2` (efeito de "manchas" de luz sobre fundo de card), borda accent a 27% opacidade (alfa `44`).
- **Aurora** — 3 `radial-gradient`s decorativos (verde-água `#14b8a6` no canto inferior esquerdo, accent
  no canto superior direito, roxo `#a855f7` no centro-inferior, todos com opacidades baixas 16–24%)
  sobrepostos ao mesmo `linear-gradient` de `bg2`→`bg2`, borda accent a 27% opacidade (alfa `44`).

Todos os 4 estilos resultam em `--heroBg`/`--heroBorder` — dois tokens CSS aplicados ao card de saldo do
Dashboard, sem necessidade de classes CSS condicionais adicionais além dessas 2 custom properties. Detalhe
suficiente para não ser "mistério" agora; especificação completa (nomes finais de token no app real,
tratamento em telas com poucos dados, acessibilidade de contraste do texto sobre gradiente) fica para a
spec da sub-fase 1d.

---

## 11.2 Decisão do Usuário — Conflito `autoTheme` vs. toggle manual (2026-07-07)

- [x] **Toggle manual desliga o automático** — confirmado igual ao protótipo (linha 1628:
      `toggleTheme()` seta `autoTheme:false`). Ao clicar manualmente no tema, `autoTheme` vira `false` e
      o tema escolhido fica fixo até o usuário reativar o automático explicitamente na seção Aparência.
      Aplica-se à sub-fase **1a**.

## 12. Fase 1a — Pronta para o Product Owner — APROVADA PELO USUÁRIO (2026-07-07)

Com as decisões do usuário (seção 11) e a investigação técnica (seção 11.1) registradas, **não restam
pendências bloqueantes para a sub-fase 1a**. Os únicos itens que seguem em aberto (Mesh/Aurora detalhado,
confirmação de nomes finais de tokens no `theme.js`) pertencem à sub-fase **1d** e não bloqueiam o início
de 1a.

**Escopo confirmado da spec de 1a** (Product Owner pode iniciar a escrita da spec):
- Tema automático por horário (`autoTheme`)
- Modo OLED — override de `--bg` (e `--navBg` por herança), conforme seção 11.1.2
- Fórmula real de accent (`accent+'22'`/`accent+'55'` para `--blue-bg`/`--blue-border`) — seção 1.4
- Tom das cores (mood) — 3 ramps completos (dark/light)
- Estilo de superfície (surface) — transformação pós-ramp conforme seção 11.1.1
- Extensão de `theme.js`: `buildTokens()` ganha parâmetros `surface` e `oled`, `getSavedLook()`/
  `applyLook()` passam a persistir e restaurar ambos

---

## 13. Próximos Passos (após aprovação)

1. Usuário aprova este plano (decisões já registradas na seção 11 e 11.1 — pendências técnicas resolvidas)
2. Product Owner escreve spec da sub-fase **1a** primeiro (`.claude/specs/fase1a-aparencia-base.md`)
3. Ciclo Dev → Code Review → QA para 1a
4. Repetir para 1b e 1c (em paralelo, conforme decisão confirmada na seção 11) e depois 1d
5. Ao final das 4 sub-fases, considerar a Fase 1 completa → Discovery Agent acionado para Fase 2
   (Navegação e ações rápidas)
