# Spec — Sub-fase 1a: Toggles simples + Tom das cores + Estilo de superfície

**Versão:** 1.1
**Data:** 2026-07-07
**Status:** Aprovada com ajustes pelo Tech Lead — pronta para implementação
**Agente:** Product Owner (v1.0) + Tech Lead (v1.1 — correção técnica e decisões de arquitetura)
**Plano base:** `.claude/discovery/plan-fase1-aparencia.md` (seções 11, 11.1, 11.2 e 12 — decisões finais e investigação técnica)
**Spec anterior (fundação):** `.claude/specs/fase0-fundacao-visual.md`

---

## Contexto

A Fase 0 entregou a fundação técnica de tokens de tema (`js/theme.js`: `buildTokens()`, `applyLook()`,
`getSavedLook()`), mas deixou `mood` e `surface` como parâmetros aceitos e ignorados (RN-03 da Fase 0),
sem `oled` nem `autoTheme`, e com a fórmula de `--blue-bg`/`--blue-border` para accent customizado
adiada (RN-04 da Fase 0). Hoje a tela de Configurações (`js/config.js`) só expõe um toggle simples de
tema claro/escuro — nenhuma das capacidades abaixo é visível ou configurável pelo usuário.

**Job-to-be-done:** "Quando eu abro Configurações → Aparência, eu quero controlar tema automático, modo
OLED, tom das cores e estilo de superfície, para personalizar a aparência do app sem depender de um
tema fixo, mantendo tudo funcionando perfeitamente em ambos os temas."

**Métrica de sucesso:** os 4 novos controles (autoTheme, OLED, mood, surface) aplicam mudança visual
real e persistem entre sessões; os 10 itens INTOCÁVEIS do inventário da Fase 0 continuam funcionando
sem regressão (regra de ouro, ver seção "DoD" abaixo).

---

## Escopo

### Dentro do escopo

1. **Tema automático por horário** (`autoTheme` boolean) — claro das 6h às 18h (exclusive), escuro no
   restante do dia. Toggle manual de tema **sempre** desliga `autoTheme` (seta para `false`); o tema
   escolhido manualmente fica fixo até o usuário reativar o automático explicitamente na UI.
2. **Modo OLED** (`oled` boolean) — quando `true` **e** `theme==='dark'`, força `--bg:'#000000'`.
   `--nav-bg` herda o efeito por espelhar `--bg` já sobrescrito. Cards (`--bg2/--bg3/--bg4`) **não** são
   afetados.
3. **Fórmula real de accent** — resolve RN-04 da Fase 0: `--blue-bg = accent + '22'` (hex + alfa 2
   dígitos, ~13% opacidade), `--blue-border = accent + '55'` (~33% opacidade). Substitui a lógica atual
   que mantinha `--blue-bg`/`--blue-border` hardcoded independente do accent escolhido.
4. **Tom das cores (mood)** — seletor real Profundo/Neutro/Quente, com os 3 ramps completos para dark e
   light, extraídos do protótipo (ver seção "Ramps de mood" abaixo). Cores semânticas (verde, vermelho,
   âmbar, roxo, teal) são **fixas por tema** e não mudam com `mood`.
5. **Estilo de superfície (surface)** — seletor real Cartões (default) / Minimal / Contraste. Transformação
   pós-ramp sobre `--bg2/--bg3/--bg4/--border/--border2`, não é paleta própria (fórmula na seção
   "Regras de negócio").
6. Extensão de `js/theme.js`:
   - `buildTokens()` ganha `surface` e `oled` com efeito real (parâmetros já existiam mas eram ignorados).
   - `getSavedLook()`/`applyLook()` persistem e restauram `oled`, `autoTheme`, `mood` real (3 valores) e
     `surface` real (3 valores).
   - Nova função de cálculo de tema efetivo a partir de `autoTheme` + hora do sistema.
7. UI nova em Configurações: toggles para `autoTheme` e `oled`, seletor de mood (3 opções), seletor de
   surface (3 opções).

### Fora do escopo desta sub-fase

- 10 temas prontos (sub-fase 1b)
- Cor por pessoa — seletor livre e migração de `PERSON_COLORS` (sub-fase 1c)
- Capa do saldo / `heroStyle` (sub-fase 1d)
- Qualquer migração ou alteração de dados em IndexedDB
- Qualquer mudança em telas fora de Configurações

---

## Ramps de mood — extraídos diretamente do protótipo

Fonte: `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\Financas App.dc.html`,
linhas 1437–1448 (`DARK_RAMPS`, `LIGHT_RAMPS`, `DARK_SEM`, `LIGHT_SEM`). Valores confirmados por leitura
direta do código-fonte do protótipo — não são estimativas.

### DARK_RAMPS (tema escuro)

| Token | Profundo (atual/default) | Neutro | Quente |
|-------|---------------------------|--------|--------|
| `--bg` | `#0d0f1a` | `#101012` | `#14100c` |
| `--bg2` | `#151829` | `#18181b` | `#1d1813` |
| `--bg3` | `#1c2038` | `#202023` | `#251f18` |
| `--bg4` | `#242848` | `#2a2a2e` | `#2f2820` |
| `--border` | `#323760` | `#34343a` | `#3d3328` |
| `--border2` | `#3e4470` | `#45454d` | `#4c4030` |
| `--text` | `#eef0ff` | `#f0f0f2` | `#f4efe8` |
| `--text2` | `#9ba3d4` | `#a8a8b0` | `#b8a890` |
| `--text3` | `#5a6294` | `#66666e` | `#6e6354` |

### LIGHT_RAMPS (tema claro)

| Token | Profundo (atual/default) | Neutro | Quente |
|-------|---------------------------|--------|--------|
| `--bg` | `#f5f6fa` | `#f5f5f6` | `#faf7f2` |
| `--bg2` | `#ffffff` | `#ffffff` | `#ffffff` |
| `--bg3` | `#f0f1f8` | `#f1f1f3` | `#f5f0e8` |
| `--bg4` | `#e8eaf5` | `#e8e8ea` | `#ece4d8` |
| `--border` | `#d0d4ea` | `#dcdce0` | `#e0d6c6` |
| `--border2` | `#bcc0dc` | `#c6c6cc` | `#ccc0ac` |
| `--text` | `#1a1d36` | `#1c1c1f` | `#241f18` |
| `--text2` | `#5a6090` | `#5e5e66` | `#6e6354` |
| `--text3` | `#9499c0` | `#9a9aa2` | `#a89a86` |

### DARK_SEM / LIGHT_SEM — cores semânticas (FIXAS por tema, independem de mood)

| Token | Dark | Light |
|-------|------|-------|
| `--green` | `#3ddc84` | `#1a8a4a` |
| `--green-bg` | `#0d2e1e` | `#e8f8ee` |
| `--green-border` | `#1a4a2a` | `#b0dfc0` |
| `--red` | `#ff6b6b` | `#d63c3c` |
| `--red-bg` | `#2e0d0d` | `#fdeaea` |
| `--red-border` | `#4a1a1a` | `#f0b0b0` |
| `--amber` | `#ffb547` | `#c47800` |
| `--amber-bg` | `#2e1f0d` | `#fff8e8` |
| `--amber-border` | `#4a2a0d` | `#f0d080` |
| `--purple` | `#a78bfa` | `#6d3fdc` |
| `--purple-bg` | `#1a0d3d` | `#f0ebff` |
| `--purple-border` | `#2a1a4a` | `#c8b0f8` |
| `--teal` | `#2dd4bf` | `#0e9e8c` |
| `--teal-bg` | `#0d2e2a` | `#e8faf8` |
| `--teal-border` | `#1a4a44` | `#b0e0da` |

**Nota:** os valores de "Profundo" acima são **idênticos** aos já hardcoded em `js/theme.js` (Fase 0) e em
`index.html` `:root`/`body.light` — confirma que o mood atual do app já é "Profundo" por padrão, sem
necessidade de migração de dados para usuários existentes (RN-1a-10).

---

## Regras de negócio

| ID | Regra | Exemplo | Origem |
|----|-------|---------|--------|
| RN-1a-01 | `buildTokens(theme, mood, surface, accent, oled)` resolve o ramp base a partir de `theme` + `mood` (`DARK_RAMPS`/`LIGHT_RAMPS`), usando `Profundo` como fallback se `mood` for inválido ou ausente | `buildTokens('dark', 'Quente', ...)` usa `DARK_RAMPS.Quente` | Investigação técnica — seção 11.1 do plano |
| RN-1a-02 | Cores semânticas (`--green*`, `--red*`, `--amber*`, `--purple*`, `--teal*`) vêm de `DARK_SEM`/`LIGHT_SEM`, fixas por `theme`, e **nunca** variam com `mood` | `mood='Quente'` no dark não altera `--red` (permanece `#ff6b6b`) | Confirmado no protótipo — seção 1.5 do plano |
| RN-1a-03 | Quando `oled===true` e `theme==='dark'`, `--bg` é sobrescrito para `#000000` **antes** de `--bg2/--bg3/--bg4` serem lidos do ramp — cards não são afetados | `oled=true, theme='dark'` → `--bg='#000000'`, `--bg2` continua o valor do ramp de mood ativo | Seção 11.1.2 do plano |
| RN-1a-04 | `oled===true` quando `theme==='light'` não tem efeito nenhum (OLED é exclusivo do tema escuro) | `oled=true, theme='light'` → `--bg` permanece o valor normal do ramp light | Investigação técnica — comportamento implícito de `dark&&oled` no protótipo |
| RN-1a-05 | `--nav-bg` é derivado do `--bg` **já sobrescrito** por OLED (herança, não regra própria) | `oled=true, theme='dark'` → `--nav-bg` reflete preto absoluto também | Seção 11.1.2 do plano |
| RN-1a-06 | **[CORRIGIDO pelo Tech Lead — ver nota de correção após a tabela]** `surface='Minimal'` transforma pós-ramp: `--bg2 = --bg` (do ramp do mood ativo, já com OLED se aplicável), `--border = 'transparent'`, `--bg3`/`--bg4`/`--border2` usam os valores **do ramp do mood ativo SEM o override de OLED** (`R0 = ramps[mood]`, mesmo mood selecionado pelo usuário — `R0` e `R` diferem *apenas* pelo `--bg` sobrescrito por OLED, nunca pelo mood) | `mood='Quente', surface='Minimal', theme='dark', oled=false` → `--bg3` usa `DARK_RAMPS.Quente['--bg2']` (idêntico a `R['--bg2']` porque OLED não altera `--bg2`); `oled=true` → `--bg2` vira `'#000000'` mas `--bg3`/`--bg4`/`--border2` continuam vindo de `DARK_RAMPS.Quente`, nunca de `DARK_RAMPS.Profundo` | Código-fonte do protótipo, `buildTokens`, linha 1537–1545 — verificado literalmente pelo Tech Lead |
| RN-1a-07 | `surface='Contraste'` transforma pós-ramp: `--border` e `--border2` recebem ambos o valor de `--border2` do ramp ativo (mood atual, não Profundo) | `mood='Neutro', surface='Contraste'` → `--border = --border2 = DARK_RAMPS.Neutro['--border2']` | Seção 11.1.1 do plano |
| RN-1a-08 | `surface='Cartões'` (default) não aplica nenhuma transformação — `--bg2/--bg3/--bg4/--border/--border2` permanecem exatamente os valores do ramp de mood ativo | `surface='Cartões'` (ou ausente) → comportamento idêntico ao já implementado hoje (Fase 0) | Seção 11.1.1 do plano |
| RN-1a-09 | `accent` sobrescreve `--blue`, e `--blue-bg`/`--blue-border` são recalculados por concatenação de string: `accent + '22'` e `accent + '55'` respectivamente — substitui os valores hardcoded usados como fallback na Fase 0 | `accent='#f97316'` → `--blue-bg='#f9731622'`, `--blue-border='#f9731655'` | Seção 1.4 do plano — resolve RN-04 da Fase 0 |
| RN-1a-10 | Chamar `buildTokens('dark')` sem os demais parâmetros (ou com `mood='Profundo'`, `surface='Cartões'`, `oled=false`) deve reproduzir exatamente os mesmos valores hoje aplicados — nenhuma regressão para usuários que nunca tocarem nos novos controles | `buildTokens('dark')` → idêntico ao resultado da Fase 0 | Regra de ouro — zero regressão |
| RN-1a-11 | Alternar o tema manualmente (`toggleTheme`/checkbox `#toggle-dark` ou equivalente na nova UI) sempre seta `autoTheme:false`, independente do valor anterior | Usuário com `autoTheme:true` clica no toggle manual → `autoTheme` vira `false`, tema fica fixo no valor escolhido | Decisão do usuário — seção 11.2 do plano |
| RN-1a-12 | Ativar `autoTheme` (toggle dedicado) recalcula o tema efetivo imediatamente a partir da hora do sistema, sem exigir reload | Usuário ativa `autoTheme` às 20h → tema muda para escuro na hora | Seção 12 do plano |
| RN-1a-13 | Cálculo do tema efetivo por horário: hora `>= 6` e `< 18` → `'light'`; caso contrário → `'dark'` | `14h` → light; `19h` → dark; `5h59` → dark; `6h00` → light; `17h59` → light; `18h00` → dark | Confirmado no protótipo (`_effTheme`, linha 1621) |
| RN-1a-14 | Quando `autoTheme===true`, o tema efetivo é recalculado a cada vez que `applyLook`/render de aparência rodar (ex.: abrir o app, focar a aba) — não precisa de timer contínuo nesta sub-fase, apenas recálculo nos pontos de entrada já existentes (inicialização, troca de aba Configurações) | Usuário deixa o app aberto passando de 17h59 para 18h00 sem interação → tema só muda na próxima ação que dispare `applyLook` (não é requisito de "tempo real"/polling) | Decisão de escopo — evita over-engineering (timer/setInterval) sem necessidade comprovada pelo protótipo |
| RN-1a-15 | `applyLook(look)` persiste `oled`, `autoTheme`, `mood` e `surface` reais em `localStorage['financas-look']`, além dos campos já existentes (`theme`, `accent`) | `applyLook({theme:'dark', mood:'Quente', surface:'Minimal', accent:'#5b8eff', oled:true, autoTheme:false})` → JSON persistido reflete todos os 6 campos | Extensão de RN-06 da Fase 0 |
| RN-1a-16 | `getSavedLook()` aplica fallback individual por campo ausente: `mood` ausente → `'Profundo'`; `surface` ausente → `'Cartões'`; `oled` ausente → `false`; `autoTheme` ausente → `false` — usuário existente da Fase 0 (sem esses campos no `financas-look` salvo) não perde nada e não quebra | `financas-look` salvo só com `{theme,accent}` (formato Fase 0) → `getSavedLook()` completa com os 4 defaults acima | Extensão de RN-10 da Fase 0 — compatibilidade retroativa |
| RN-1a-17 | Quando `autoTheme===true` está salvo, `getSavedLook()`/inicialização usam o tema efetivo (RN-1a-13) para aplicar os tokens visuais, mas o campo `theme` persistido no `financas-look` continua guardando a última escolha manual (ou default), não o valor calculado — evita que o cálculo por horário sobrescreva permanentemente a preferência manual anterior | Usuário salvou `theme:'dark'` manualmente e depois ativa `autoTheme` às 10h (efetivo=light) → app mostra tema claro, mas `financas-look.theme` continua `'dark'` até o usuário desligar `autoTheme` e escolher manualmente de novo | Decisão técnica — replica `_effTheme(state)` do protótipo, que sempre deriva do `state.theme` gravado, nunca sobrescreve `theme` com o valor efetivo |

---

## Validação técnica — Tech Lead (2026-07-07)

### Correção crítica em RN-1a-06 / Story 5 — `R0` NÃO é o ramp Profundo

Ao conferir literalmente o código-fonte do protótipo (`Financas App.dc.html`, `buildTokens`, linhas
1537–1545), identifiquei que a spec (herdando um erro do plano, seção 11.1.1) descrevia `R0` como "ramp
Profundo original". **Isso está incorreto.** O código-fonte é:

```js
buildTokens(themeName,accent,surface,mood,oled,heroStyle){
  const ramps = dark ? DARK_RAMPS : LIGHT_RAMPS;
  const R0 = ramps[mood] || ramps.Profundo;   // <- ramp do MOOD ATIVO, sem fallback pra Profundo exceto se mood for inválido
  const R  = {...R0};
  if(dark && oled) R['--bg'] = '#000000';      // <- única diferença entre R0 e R é o --bg (OLED)
  ...
  if(surface==='Minimal'){
    bg2 = R['--bg'];       // usa R (com OLED aplicado)
    bg3 = R0['--bg2'];     // usa R0 (SEM OLED) — mas ainda é o ramp do MOOD ATIVO
    bg4 = R0['--bg3'];     // idem
    border = 'transparent';
    border2 = R0['--border']; // idem
  }
  else if(surface==='Contraste'){
    border = R['--border2'];
    border2 = R['--border2'];
  }
```

`R0` só cai no ramp Profundo se `mood` for inválido/ausente (fallback padrão, igual RN-1a-01) — nunca por
causa de `surface`. A diferença real entre `R0` e `R` é **exclusivamente o override de OLED em `--bg`**,
não o mood. RN-1a-06, os cenários da Story 5 e a nota da tabela de riscos foram corrigidos acima para
refletir o comportamento real do protótipo. **Sem esta correção, o Dev implementaria `surface='Minimal'`
sempre "achatando" para o tom Profundo em qualquer mood não-default — bug visível e fácil de notar no
smoke test (passo 8), mas que teria custado um ciclo de retrabalho se não pego agora.**

### Pseudocódigo de composição — ordem de aplicação em `buildTokens` (resolve ponto 2)

Para eliminar qualquer ambiguidade de ordem para o Dev, a sequência exata dentro de `buildTokens(theme,
mood, surface, accent, oled)` deve ser:

```
1. R0 = (theme==='dark' ? DARK_RAMPS : LIGHT_RAMPS)[mood] || ramps.Profundo   // RN-1a-01
2. R = {...R0}                                                                // cópia
3. SE theme==='dark' E oled===true: R['--bg'] = '#000000'                     // RN-1a-03/04
4. bg2,bg3,bg4,border,border2 = R['--bg2'],R['--bg3'],R['--bg4'],R['--border'],R['--border2']  // default = surface 'Cartões', RN-1a-08
5. SE surface==='Minimal':                                                     // RN-1a-06
     bg2 = R['--bg']       (usa R, JÁ com OLED se aplicável)
     bg3 = R0['--bg2']     (usa R0, ramp do mood ativo SEM OLED)
     bg4 = R0['--bg3']     (idem)
     border = 'transparent'
     border2 = R0['--border']  (idem)
   SENÃO SE surface==='Contraste':                                             // RN-1a-07
     border = R['--border2']
     border2 = R['--border2']
6. sem = theme==='dark' ? DARK_SEM : LIGHT_SEM                                 // RN-1a-02, fixo
7. blueBg = accent + '22'; blueBorder = accent + '55'                          // RN-1a-09
8. retorno = {...R, --bg2:bg2, --bg3:bg3, --bg4:bg4, --border:border, --border2:border2,
              ...sem, --blue:accent, --blue-bg:blueBg, --blue-border:blueBorder,
              --nav-bg: R['--bg'] (herda OLED, RN-1a-05)}
```

Passos 3→4→5 são estritamente sequenciais: OLED (passo 3) precisa já ter alterado `R['--bg']` antes do
passo 4 ler os defaults e antes do passo 5 ler `R['--bg']`/`R0[...]` para Minimal. Inverter 3 e 5 quebra a
combinação OLED+Minimal (risco já mapeado na spec). Esta sequência está agora inequívoca — nenhuma
interpretação alternativa é válida.

### Decisão — módulo dedicado `js/appearance-ui.js`

`config.js` hoje tem 215 linhas quase inteiramente dedicadas a export/import/clear/forceRefresh; a
"aparência" ocupa hoje só as 4 linhas finais de `renderCfg()`. Esta sub-fase adiciona: wiring de 2
toggles, 2 seletores (3 opções cada), leitura/gravação de estado ao abrir a aba, e chamadas para
`buildTokens`/`applyLook`/`getSavedLook`. Isso é maior e mais coeso do que o que já existe hoje em
`config.js`, e é uma responsabilidade claramente distinta (UI de aparência vs. import/export/manutenção de
dados) — mesmo critério que já levou à divisão de `cards.js` em `cards-modal.js`/`cards-render.js` quando
cresceu além de uma responsabilidade única.

**Decisão: extrair para `js/appearance-ui.js`** (novo arquivo), com:
- `renderAppearanceCfg()` — lê `getSavedLook()`, popula os 2 toggles e os 2 seletores na aba Configurações
- Handlers dos novos controles (`onAutoThemeToggle`, `onOledToggle`, `onMoodSelect`, `onSurfaceSelect`) —
  cada um monta o `look` atualizado e chama `applyLook(look)`
- Função de cálculo de tema efetivo por horário (`getEffectiveTheme(look)`, RN-1a-13/14) — usada tanto na
  inicialização (`app.js`) quanto ao reabrir a aba Configurações

`renderCfg()` em `config.js` permanece o orquestrador único da aba (não duplicar essa responsabilidade) —
apenas ganha uma chamada a `renderAppearanceCfg()` no final, mesmo padrão que já usa para
`renderPessoasConfig()`.

**Ordem de `<script src>` em `index.html`:**
```
...projection.js → theme.js → appearance-ui.js → config.js → app.js
```
`appearance-ui.js` depende de `buildTokens`/`applyLook`/`getSavedLook` (definidos em `theme.js`) — deve
vir depois de `theme.js`. Não depende de nada em `config.js`, mas por convenção de leitura (áreas de
Configurações agrupadas) fica antes dele. `app.js` continua por último pois `init()` chama
`applyLook(getSavedLook())` e pode precisar de `getEffectiveTheme()` do novo módulo — deve vir depois de
`appearance-ui.js`.

**Atualizar `sw.js`**: incluir `js/appearance-ui.js` em `urlsToCache` junto do bump de versão já previsto.

### Confirmação — persistência não quebra formato Fase 0 (ponto 3)

RN-1a-16 já cobre corretamente: `getSavedLook()` aplica fallback individual por campo ausente
(`mood→'Profundo'`, `surface→'Cartões'`, `oled→false`, `autoTheme→false`). Conferido contra o código atual
de `js/theme.js` (linhas 72–97): a implementação da Fase 0 já faz fallback campo a campo (`parsed.mood ||
'Profundo'`, `parsed.surface || 'Cartões'`), então basta estender o mesmo padrão para `oled`/`autoTheme`
sem quebrar nada — **aprovado sem ressalvas**. Único ajuste necessário: RN-1a-17 exige que `theme`
persistido nunca seja sobrescrito pelo valor efetivo calculado por `autoTheme` — confirmar que
`applyLook()` grava `look.theme` (a escolha manual) e não `getEffectiveTheme(look)` no `financas-look`;
apenas usa o valor efetivo para aplicar tokens visuais. Isso já está implícito na spec mas deve ficar
explícito no code review.

### Confirmação — recálculo de `autoTheme` (ponto 4)

RN-1a-14 já resolve isso corretamente e evita over-engineering: recalcula nos pontos de entrada existentes
(boot via `init()`, abertura da aba Configurações via `showPageCfg()`/`renderCfg()`), sem `setInterval`
nem listener de tempo real. Coerente com o próprio protótipo, que também não usa polling. Nenhum ajuste
necessário — **aprovado sem ressalvas**. Fica documentado que "app aberto atravessando a virada 6h/18h sem
interação" não muda o tema até a próxima navegação — comportamento aceitável e já sinalizado como risco
baixo na spec.

---

## User Stories

### Story 1 — Tema automático por horário

```
Como usuário do app
Quero que o tema mude automaticamente entre claro e escuro conforme o horário
Para não precisar alternar manualmente ao longo do dia
```

**Critérios de aceite:**

```gherkin
Cenário: Ativar tema automático às 14h
  Dado que o relógio do sistema marca 14h
  Quando o usuário ativa o toggle "Tema automático" em Configurações
  Então o tema aplicado é claro
  E localStorage['financas-look'] passa a ter autoTheme:true

Cenário: Ativar tema automático às 20h
  Dado que o relógio do sistema marca 20h
  Quando o usuário ativa o toggle "Tema automático"
  Então o tema aplicado é escuro

Cenário: Limites exatos do horário (6h e 18h)
  Dado que autoTheme está ativo
  Quando o relógio marca exatamente 6h00
  Então o tema efetivo é claro
  E quando o relógio marca exatamente 18h00
  Então o tema efetivo é escuro

Cenário: Toggle manual de tema desliga o automático
  Dado que autoTheme está ativo (true)
  Quando o usuário clica no toggle manual de tema (claro/escuro)
  Então autoTheme é definido como false
  E o tema escolhido manualmente fica fixo
  E localStorage['financas-look'] reflete autoTheme:false

Cenário: Reativar o automático após desligar manualmente
  Dado que autoTheme está false (usuário desligou manualmente antes)
  Quando o usuário ativa novamente o toggle "Tema automático" em Configurações
  Então autoTheme volta a true
  E o tema efetivo é recalculado pelo horário atual imediatamente
```

**Regras associadas:** RN-1a-11, RN-1a-12, RN-1a-13, RN-1a-14, RN-1a-17

---

### Story 2 — Modo OLED

```
Como usuário de dispositivo com tela OLED
Quero um modo de fundo totalmente preto no tema escuro
Para economizar bateria e ter mais contraste
```

**Critérios de aceite:**

```gherkin
Cenário: Ativar OLED com tema escuro ativo
  Dado que o tema atual é escuro
  Quando o usuário ativa o toggle "Modo OLED"
  Então --bg é aplicado como #000000
  E --nav-bg reflete o mesmo preto absoluto
  E os cards (--bg2/--bg3/--bg4) mantêm a cor normal do ramp de mood ativo

Cenário: Ativar OLED com tema claro ativo
  Dado que o tema atual é claro
  Quando o usuário ativa o toggle "Modo OLED"
  Então nenhuma mudança visual ocorre (OLED não afeta tema claro)
  E o valor oled:true é salvo mesmo assim (fica pronto para quando o usuário for para o escuro)

Cenário: Alternar para escuro com OLED já ativo
  Dado que oled:true está salvo e o tema atual é claro
  Quando o usuário alterna manualmente para tema escuro
  Então --bg é aplicado como #000000 imediatamente (sem precisar reativar OLED)

Cenário: Desativar OLED
  Dado que oled:true e tema escuro ativos, --bg em #000000
  Quando o usuário desativa o toggle "Modo OLED"
  Então --bg volta ao valor normal do ramp de mood ativo
```

**Regras associadas:** RN-1a-03, RN-1a-04, RN-1a-05

---

### Story 3 — Fórmula real de accent

```
Como usuário do app
Quero que a cor de destaque (accent) gere automaticamente as variações de fundo/borda coerentes
Para que qualquer accent escolhido tenha contraste e legibilidade adequados
```

**Critérios de aceite:**

```gherkin
Cenário: Accent default mantém compatibilidade
  Dado que accent não é informado (usa o default do tema)
  Quando buildTokens é chamado
  Então --blue-bg e --blue-border seguem a fórmula accent+'22'/accent+'55'
  E os valores resultantes batem com os hardcoded atuais para o accent default de cada tema

Cenário: Accent customizado gera --blue-bg/--blue-border coerentes
  Dado que accent = '#f97316'
  Quando buildTokens é chamado
  Então --blue = '#f97316'
  E --blue-bg = '#f9731622'
  E --blue-border = '#f9731655'
```

**Regras associadas:** RN-1a-09, RN-1a-10

---

### Story 4 — Tom das cores (mood)

```
Como usuário do app
Quero escolher entre 3 tons de cor (Profundo, Neutro, Quente)
Para personalizar a atmosfera visual do app sem perder a legibilidade de valores financeiros
```

**Critérios de aceite:**

```gherkin
Cenário: Selecionar mood Neutro no tema escuro
  Dado que o tema atual é escuro
  Quando o usuário seleciona "Neutro" no seletor de tom
  Então --bg, --bg2, --bg3, --bg4, --border, --border2, --text, --text2, --text3
    assumem os valores de DARK_RAMPS.Neutro
  E --green/--red/--amber/--purple/--teal permanecem os valores fixos de DARK_SEM (não mudam)

Cenário: Selecionar mood Quente no tema claro
  Dado que o tema atual é claro
  Quando o usuário seleciona "Quente" no seletor de tom
  Então os tokens de fundo/borda/texto assumem os valores de LIGHT_RAMPS.Quente
  E as cores semânticas permanecem LIGHT_SEM, inalteradas

Cenário: Mood default é Profundo
  Dado que o usuário nunca selecionou um mood
  Quando o app aplica o look salvo
  Então o mood aplicado é 'Profundo', idêntico ao comportamento da Fase 0

Cenário: Trocar de tema preserva o mood selecionado
  Dado que o usuário selecionou mood 'Quente' no tema escuro
  Quando o usuário alterna para o tema claro
  Então o mood permanece 'Quente', agora usando LIGHT_RAMPS.Quente
```

**Regras associadas:** RN-1a-01, RN-1a-02, RN-1a-10

---

### Story 5 — Estilo de superfície (surface)

```
Como usuário do app
Quero escolher como os cards se destacam do fundo (Cartões, Minimal ou Contraste)
Para ajustar a densidade visual da interface ao meu gosto
```

**Critérios de aceite:**

```gherkin
Cenário: Surface Cartões (default) não altera nada
  Dado que surface = 'Cartões' (ou não informado)
  Quando buildTokens é chamado
  Então --bg2/--bg3/--bg4/--border/--border2 são exatamente os valores do ramp de mood ativo

Cenário: Surface Minimal achata a hierarquia de camadas
  Dado que mood = 'Quente', tema escuro, surface = 'Minimal', oled = false
  Quando buildTokens é chamado
  Então --bg2 é igual a --bg (do ramp Quente, já com OLED se aplicável)
  E --border é 'transparent'
  E --bg3 usa o valor de --bg2 do ramp Quente (R0 = ramp do mood ativo sem OLED — CORRIGIDO, não é o ramp Profundo)
  E --bg4 usa o valor de --bg3 do ramp Quente (R0)
  E --border2 usa o valor de --border do ramp Quente (R0)

Cenário: Surface Contraste aumenta a força da borda
  Dado que mood = 'Neutro', tema escuro, surface = 'Contraste'
  Quando buildTokens é chamado
  Então --border assume o valor de --border2 do ramp Neutro
  E --border2 também assume o valor de --border2 do ramp Neutro (mesmo valor em ambos)
  E --bg2/--bg3/--bg4 permanecem os valores normais do ramp Neutro (surface não mexe em fundo)

Cenário: Surface funciona em conjunto com OLED
  Dado que tema escuro, mood = 'Neutro', oled = true, surface = 'Minimal'
  Quando buildTokens é chamado
  Então --bg = '#000000' (por OLED)
  E --bg2 = --bg = '#000000' (Minimal usa o --bg já sobrescrito por OLED)
  E --bg3/--bg4 continuam usando o ramp do mood ativo ('Neutro') SEM OLED (R0 = ramps['Neutro']), sem preto absoluto — CORRIGIDO: não usa ramp Profundo
```

**Regras associadas:** RN-1a-06, RN-1a-07, RN-1a-08

---

### Story 6 — Persistência e compatibilidade retroativa

```
Como usuário que já configurou aparência na Fase 0
Quero que minhas preferências antigas continuem válidas após esta atualização
Para não perder nada nem ver comportamento inesperado
```

**Critérios de aceite:**

```gherkin
Cenário: Usuário Fase 0 sem os novos campos
  Dado que localStorage['financas-look'] tem apenas {theme, mood, surface, accent} (formato Fase 0,
    mood sempre 'Profundo' e surface sempre 'Cartões' herdados, sem oled/autoTheme)
  Quando o app inicializa após esta sub-fase
  Então getSavedLook() completa oled:false e autoTheme:false automaticamente
  E o resultado visual é idêntico ao que o usuário já tinha (Profundo/Cartões, sem OLED, sem automático)

Cenário: financas-look corrompido continua com fallback seguro
  Dado que localStorage['financas-look'] contém JSON inválido
  Quando o app inicializa
  Então o app não trava
  E cai no fallback via localStorage['theme'] com mood/surface/oled/autoTheme default

Cenário: Persistência completa após configurar tudo
  Dado que o usuário configura mood='Neutro', surface='Contraste', oled=true, autoTheme=false,
    accent='#22c55e'
  Quando o usuário fecha e reabre o app
  Então todos os 5 valores são restaurados exatamente como configurados
```

**Regras associadas:** RN-1a-15, RN-1a-16

---

### Story 7 — Zero regressão nos 10 itens INTOCÁVEIS

```
Como usuário do app
Quero que todas as funcionalidades existentes continuem funcionando exatamente como antes
Para que a nova camada de personalização visual não introduza nenhum bug perceptível
```

**Critérios de aceite:**

```gherkin
Cenário: Estado default (nenhum controle novo tocado) é idêntico à Fase 0
  Dado que o usuário nunca abriu os novos controles de Aparência
  Quando o app inicializa
  Então o resultado visual é pixel-idêntico ao estado final da Fase 0
    (tema dark/light, mood Profundo, surface Cartões, sem OLED, sem automático)

Cenário: Os 10 itens INTOCÁVEIS seguem funcionando
  Dado que apliquei qualquer combinação de mood/surface/oled/autoTheme
  Quando navego por lançamentos c/ subitens, orçamento (marcar realizado), alfinete/mês de referência,
    cartões completo (CRUD/fatura/limite), projeção, filtros pessoa/período, pessoas com cor,
    configurações (atualizar app), tema escuro, tema claro
  Então todos os fluxos funcionam sem alteração de comportamento, apenas mudança de aparência visual
```

**Regras associadas:** RN-1a-10 — cobre a regra de ouro herdada da Fase 0

---

## Arquivos a modificar

| Arquivo | O que muda | Risco |
|---------|------------|-------|
| `js/theme.js` | `buildTokens()` recebe ramps reais de mood (`DARK_RAMPS`/`LIGHT_RAMPS`), aplica `oled` como override de `--bg` antes de resolver `bg2/bg3/bg4`, aplica transformação de `surface` pós-ramp, calcula `--blue-bg`/`--blue-border` pela fórmula `accent+alpha`; `applyLook()`/`getSavedLook()` passam a persistir/restaurar `oled`, `autoTheme`, `mood` real, `surface` real; nova função de cálculo de tema efetivo por horário (`autoTheme`) | Alto — reescreve o core de composição de tokens; qualquer erro na fórmula de `surface`/`oled` quebra visual em cascata |
| `js/appearance-ui.js` (**novo módulo — decisão do Tech Lead**) | `renderAppearanceCfg()`, handlers dos 4 novos controles (`autoTheme`, `oled`, `mood`, `surface`), `getEffectiveTheme(look)` para RN-1a-13/14 | Médio — UI nova, mas isolada da lógica de tokens |
| `js/config.js` | `renderCfg()` ganha 1 linha chamando `renderAppearanceCfg()` (mesmo padrão de `renderPessoasConfig()`) — sem outra mudança | Baixo |
| `index.html` (`<script src>` + CSS inline) | Nova tag `<script src="js/appearance-ui.js">` entre `theme.js` e `config.js`; estilos para os novos toggles/seletores (se não reutilizáveis dos padrões já existentes) | Baixo |
| `sw.js` | Bump de versão do Service Worker (`financas-vN` → `financas-vN+1`) + incluir `js/appearance-ui.js` em `urlsToCache` | Baixo — mudança mecânica, mas obrigatória |

**Decisão do Tech Lead:** extrair "Aparência" para módulo dedicado `js/appearance-ui.js`, carregado entre
`js/theme.js` e `js/config.js`. Ver seção "Validação técnica — Tech Lead" acima para justificativa
completa e ordem exata de `<script src>`.

---

## Checklist de cenários obrigatórios

- [x] Happy path: autoTheme, OLED, mood, surface aplicam mudança visual real e persistem
- [x] Dados inválidos: `financas-look` corrompido ou incompleto não trava a inicialização
- [x] Usuário sem permissão: não aplicável (sem controle de acesso nesta sub-fase)
- [x] Estado inesperado: usuário Fase 0 sem os novos campos no `financas-look` salvo
- [x] Ação duplicada: ativar/desativar toggles repetidamente não corrompe o `financas-look` nem duplica listeners
- [x] Regressão dos 10 itens INTOCÁVEIS (Story 7)
- [x] `node --check` em todos os arquivos JS modificados

---

## Definição de Pronto (DoD)

Esta sub-fase está pronta quando **todos** os itens abaixo são verdadeiros:

- [ ] Código implementado conforme esta spec
- [ ] `node --check js/theme.js` sem erros
- [ ] `node --check js/config.js` (ou módulo dedicado, se criado) sem erros
- [ ] Todos os critérios de aceite (Stories 1–7) validados manualmente
- [ ] Smoke test manual completo executado (ver sequência abaixo)
- [ ] Os 10 itens INTOCÁVEIS validados manualmente — sem regressão (regra de ouro)
- [ ] Estado default (nenhum controle novo tocado) comparado visualmente com o estado final da Fase 0 — sem diferença perceptível
- [ ] Versão do Service Worker incrementada
- [ ] Code Reviewer aprovou (foco em regressão de tokens e composição correta de `surface`/`oled`)
- [ ] QA validou e aprovou explicitamente — obrigatório por envolver interface e lógica de negócio crítica (tokens visuais)
- [ ] Confirmação explícita do usuário antes de commit

**Smoke test manual obrigatório (sequência):**

1. Abrir o app com dados existentes (IndexedDB já populado), sem tocar em nenhum controle novo — confirmar que a aparência é idêntica à Fase 0 (tema dark/light conforme salvo, sem OLED, sem automático)
2. Abrir Configurações → Aparência — confirmar que os novos controles aparecem: toggle "Tema automático", toggle "Modo OLED", seletor de tom (Profundo/Neutro/Quente), seletor de superfície (Cartões/Minimal/Contraste)
3. Ativar "Tema automático" — confirmar que o tema aplicado bate com a regra de horário (RN-1a-13); ajustar o relógio do sistema (ou usar DevTools override, se disponível) para testar os limites 6h/18h
4. Com "Tema automático" ativo, clicar no toggle manual de tema — confirmar que "Tema automático" desliga sozinho e o tema escolhido fica fixo
5. Ativar "Modo OLED" com tema escuro ativo — confirmar `--bg`/`--nav-bg` pretos absolutos e cards com cor normal do ramp
6. Ativar "Modo OLED" com tema claro ativo — confirmar que nada muda visualmente
7. Selecionar cada um dos 3 moods (Profundo/Neutro/Quente) em ambos os temas (6 combinações) — confirmar troca de fundo/borda/texto e que cores semânticas (verde receita, vermelho despesa) não mudam
8. Selecionar cada um dos 3 surfaces (Cartões/Minimal/Contraste) — confirmar comportamento conforme RN-1a-06/07/08, inclusive combinado com mood diferente de Profundo e com OLED ativo
9. Fechar e reabrir o app (ou dar reload) após configurar mood/surface/oled/autoTheme — confirmar que tudo é restaurado exatamente como deixado
10. Abrir DevTools → Application → Local Storage — confirmar `financas-look` com JSON válido contendo os 6 campos (`theme`, `mood`, `surface`, `accent`, `oled`, `autoTheme`)
11. Percorrer os 10 itens INTOCÁVEIS (lançamentos c/ subitens, orçamento realizado, alfinete/mês de referência, cartões completo, projeção, filtros pessoa/período, pessoas com cor, configurações/atualizar, tema escuro, tema claro) com pelo menos uma combinação não-default de mood/surface/oled ativa
12. Abrir DevTools → Console — confirmar ausência de erros JavaScript em todas as ações acima
13. Confirmar bump de versão do Service Worker e comportamento de atualização (toast "Nova versão disponível")

---

## Definição de Pronto para Entrar em Implementação (DoR)

- [x] Contexto claro: problema e solução descritos
- [x] User stories no formato correto
- [x] Critérios de aceite escritos em Given/When/Then
- [x] Regras de negócio explícitas e sem interpretação livre (17 regras, RN-1a-01 a RN-1a-17)
- [x] Escopo desta sub-fase separado do escopo futuro (1b, 1c, 1d)
- [x] Dependências identificadas (nenhuma externa bloqueante — depende apenas da Fase 0, já implementada)
- [x] Valores reais de `DARK_RAMPS`/`LIGHT_RAMPS`/`DARK_SEM`/`LIGHT_SEM` extraídos do protótipo e documentados
- [x] Fórmulas de `surface` e `oled` documentadas com precisão (investigação técnica do plano, seções 11.1.1 e 11.1.2)
- [x] Regra de conflito `autoTheme` vs. toggle manual decidida pelo usuário (seção 11.2 do plano)
- [x] Arquivos a modificar mapeados
- [x] Riscos identificados com mitigação
- [x] Plano aprovado pelo usuário (seção 12 do `plan-fase1-aparencia.md`)

**Spec pronta para o Tech Lead validar viabilidade/estimativa e o Senior Dev implementar.**

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-----------------|----------|-----------|
| Fórmula de `surface='Minimal'` usar `R0` (ramp do mood ativo SEM OLED — **não é o ramp Profundo**, erro já corrigido nesta versão da spec) pode ser confundida com "ramp Profundo" se o Dev seguir só o plano original sem ler a correção do Tech Lead | Média | Médio | RN-1a-06 e o pseudocódigo da seção "Validação técnica — Tech Lead" documentam a fonte exata de cada token; Code Reviewer deve validar linha a linha contra o pseudocódigo (não contra o plano original, que tinha o erro) |
| Ordem de aplicação `oled` → `surface` importa (OLED precisa rodar antes da leitura de `bg2/bg3/bg4` que `surface='Minimal'` usa) — inverter a ordem quebra a combinação OLED+Minimal | Média | Alto | Cenário dedicado na Story 5 ("Surface funciona em conjunto com OLED") cobre exatamente esse caso; seguir a ordem exata do protótipo (`buildTokens`, linhas 1541–1545) |
| `autoTheme` sem polling/timer pode parecer "quebrado" se o usuário deixar o app aberto atravessando o limiar de horário sem interagir | Baixa | Baixo | RN-1a-14 documenta explicitamente que o recálculo acontece nos pontos de entrada existentes (não é requisito de tempo real) — comportamento idêntico ao protótipo, que também não usa `setInterval` |
| Mood/surface alterarem também cores semânticas por erro de implementação, prejudicando legibilidade de receita/despesa | Baixa (confirmado que não deveria) | Alto | RN-1a-02 explícita; Story 4 tem cenário dedicado validando que semânticas não mudam; QA cobre nas 6 combinações de mood×tema |
| Regressão no estado default (usuário que nunca toca nos novos controles) por erro de fallback em `getSavedLook()` | Baixa | Alto | RN-1a-10 e RN-1a-16 são regra de ouro explícita; Story 6 cobre compatibilidade retroativa; smoke test passo 1 valida isso antes de qualquer outro teste |
| Volume de UI nova (toggles + 2 seletores) aumentar `config.js` além do razoável sem separação de responsabilidade | Baixa | Baixo | Resolvido — Tech Lead decidiu extração para `js/appearance-ui.js` (ver tabela de arquivos e seção "Validação técnica") |

---

## Ordem de implementação recomendada

1. **Fase A — `js/theme.js`** — estender `buildTokens()` com ramps reais de mood, fórmula de `oled`,
   fórmula de `surface`, fórmula de `accent+alpha`; testável via console do browser em isolamento antes
   de tocar na UI
   - `node --check js/theme.js`
2. **Fase B — `getSavedLook()`/`applyLook()`** — persistência e fallback dos novos campos (`oled`,
   `autoTheme`, `mood` real, `surface` real)
3. **Fase C — cálculo de tema efetivo por horário** — nova função para `autoTheme`, integrada nos pontos
   de entrada existentes (inicialização, abertura da aba Configurações)
4. **Fase D — UI em Configurações** — toggles e seletores, decisão de módulo dedicado vs. `config.js`
   - `node --check` no(s) arquivo(s) tocado(s)
5. **Fase E — Validação final**
   - Smoke test completo (13 passos acima)
   - Validação dos 10 itens INTOCÁVEIS com combinações não-default
   - Code Review
   - QA formal
   - Confirmação do usuário
   - Bump de versão do SW + commit
