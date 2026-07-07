# Spec — Fase 0: Fundação Visual (Design Handoff)

**Versão:** 1.0
**Data:** 2026-07-07
**Status:** Pronta para implementação
**Agente:** Product Owner
**Plano base:** `.claude/discovery/plan-fase0-fundacao-visual.md`

---

## Contexto

O handoff de design (`CLAUDE DESIGN - App Finanças/design_handoff_financas_visual/`) propõe um sistema de
temas configurável (tema claro/escuro × tom × superfície × accent) a ser exposto ao usuário na Fase 1
(Aparência em Configurações). Antes disso, é preciso existir uma **fundação técnica** capaz de compor e
aplicar esses tokens em runtime — sem alterar em nada a experiência visual atual do usuário.

Hoje o tema vive como CSS estático (`:root` / `body.light` em `index.html`) e um toggle simples
(`applyTheme(dark)` / `toggleTheme(dark)` em `js/app.js`, linhas 25–32) que persiste em
`localStorage['theme']`. Essa fundação não suporta tom, superfície nem accent configuráveis.

**Job-to-be-done:** "Quando o time avança para a Fase 1 (UI de aparência), quero que a camada de tokens
de tema já exista e funcione por baixo, para que a Fase 1 seja apenas interface — sem risco de reescrever
a base de tema no meio do caminho."

**Métrica de sucesso:** após implementação, o app roda com os 10 itens INTOCÁVEIS do inventário
(seção 1 do plano) idênticos ao comportamento anterior, incluindo tema claro e escuro pixel-idênticos, e
existe uma função JS (`applyLook`) capaz de compor e persistir tema/tom/superfície/accent — mesmo que
nenhuma UI ainda a exponha ao usuário.

---

## Escopo

### Dentro desta fase

- Nova função `buildTokens(theme, mood, surface, accent)` em `js/theme.js` (arquivo novo), reproduzindo
  os valores atuais do app como default (`theme='dark'`, `mood='Profundo'`, `surface='Cartões'`,
  `accent='#5b8eff'`) — zero mudança visual perceptível.
- Nova função `applyLook(look)` que aplica os tokens computados via `style.setProperty` no `documentElement`
  (ou `body`) e persiste a escolha em `localStorage['financas-look']` (JSON: `{theme, mood, surface, accent}`).
- Unificação de `toggleTheme()`/`applyTheme()` com `applyLook()` **já nesta fase**: `toggleTheme(dark)`
  passa a delegar para `applyLook()` (ou ser absorvida por ela), preservando exatamente o comportamento
  externo atual: `classList.toggle('light', !dark)`, atualização de `<meta name="theme-color">`, sincronização
  do checkbox `#toggle-dark`, e manutenção da chave `localStorage['theme']` por compatibilidade.
- Inicialização em `app.js` (`init()`) passa a ler `localStorage['financas-look']` primeiro; se ausente,
  cai no fallback da chave `'theme'` existente — compatibilidade com usuários que já têm o app instalado
  sem a nova chave.
- `js/theme.js` entra na ordem de carregamento antes de `js/config.js` (entre `projection.js` e `config.js`).
- Bump de versão do Service Worker: `sw.js` `financas-v10` → `financas-v11`, incluindo `js/theme.js` na
  lista `urlsToCache`.
- `index.html` mantém `:root`/`body.light` como fallback estático — nenhuma variável CSS existente é
  removida ou renomeada.

### Fora desta fase (Fase 1 e além)

- Qualquer UI de seleção de tema/accent/tom/superfície em Configurações
- Tema automático por horário, modo OLED, capa do saldo, 10 temas prontos, cor por pessoa
- Qualquer mudança em FAB, busca, swipe, cartões, calendário, relatórios, metas, alertas, onboarding

### Explicitamente fora do escopo

- Qualquer migração ou alteração de dados em IndexedDB
- Qualquer mudança de comportamento perceptível ao usuário nesta fase
- Renomear, remover ou alterar valor de qualquer variável CSS existente em `:root`/`body.light`
- Corrigir a divergência de `--border` (`#323760` real vs. `#232742` do README do handoff) — decisão
  registrada: revisitar na Fase 1

---

## Restrições técnicas obrigatórias

| Restrição | Motivo |
|-----------|--------|
| NUNCA usar `export`/`import` | Projeto sem bundler, ES2020 globals |
| NUNCA usar `<script type="module">` | Carregamento paralelo quebra escopo global (ver `architecture.md`) |
| NUNCA template literals aninhados (backtick dentro de backtick) | Causa SyntaxError em alguns browsers |
| NUNCA `JSON.stringify` em atributos `onclick` | Causa erros de parsing/crash em mobile |
| `node --check js/[arquivo].js` obrigatório após qualquer edição | Detecta SyntaxError antes de abrir o browser |
| `js/theme.js` deve ser inserido antes de `js/config.js` na ordem de `<script src>` de `index.html` e em `urlsToCache` do `sw.js` | Ordem de carregamento sequencial é regra crítica do projeto |
| Nenhuma variável CSS existente (`--bg`, `--blue`, etc.) pode ser renomeada | Cascata de ~2k linhas de CSS inline depende dos nomes atuais |
| Bump de versão do SW (`financas-v10` → `financas-v11`) obrigatório neste ciclo | Evita servir versão antiga via cache-first após mudança de JS |
| `applyLook()` deve ser chamada o mais cedo possível na inicialização, antes do primeiro paint relevante | Mitigar risco de FOUC (flash de estilo incorreto) listado no plano |

---

## Regras de negócio

| ID | Regra | Exemplo | Origem |
|----|-------|---------|--------|
| RN-01 | `buildTokens(theme, mood, surface, accent)` com os 4 parâmetros omitidos (ou `undefined`) deve retornar exatamente os mesmos valores hoje hardcoded em `:root` (tema dark) | `buildTokens()` → `{'--bg':'#0d0f1a', '--blue':'#5b8eff', ...}` idêntico ao `:root` atual | Decisão de produto — zero mudança visual |
| RN-02 | Quando `theme='light'`, `buildTokens` retorna os valores hoje hardcoded em `body.light` | `buildTokens('light')` → `{'--bg':'#f5f6fa', ...}` idêntico ao bloco `body.light` atual | Decisão de produto |
| RN-03 | Nesta fase, `mood` e `surface` são parâmetros aceitos pela função mas **não alteram o resultado** — apenas `theme` e `accent` têm efeito real, pois só existe um mood (`Profundo`) e uma surface (`Cartões`) implementados | `buildTokens('dark','Neutro','Minimal','#5b8eff')` retorna o mesmo resultado que `buildTokens('dark')` | Decisão técnica — Fase 0 é fundação, não aplica os demais ramps ainda |
| RN-04 | `accent` sobrescreve `--blue` e recalcula `--blue-bg`/`--blue-border` de forma determinística (mesma relação de luminosidade usada hoje entre `#5b8eff`/`#0d1a3d`/`#1a2a4a` no dark, e `#2962e8`/`#eaf0ff`/`#b0c4f8` no light) | `accent='#5b8eff'` (default) → `--blue-bg`/`--blue-border` idênticos aos valores atuais | Decisão técnica — a validar com Tech Lead a fórmula exata de derivação |
| RN-05 | `applyLook(look)` aplica cada token retornado por `buildTokens` via `documentElement.style.setProperty(nome, valor)` | `applyLook({theme:'dark', accent:'#5b8eff'})` seta `--bg`, `--blue`, etc. no `:root` do DOM | Decisão técnica |
| RN-06 | `applyLook(look)` persiste o objeto completo `{theme, mood, surface, accent}` como JSON em `localStorage['financas-look']` | `localStorage.getItem('financas-look')` → `'{"theme":"dark","mood":"Profundo","surface":"Cartões","accent":"#5b8eff"}'` | Decisão técnica |
| RN-07 | `applyLook(look)` também mantém `localStorage['theme']` sincronizado (`'dark'` ou `'light'`, derivado de `look.theme`) — compatibilidade retroativa | `look.theme='light'` → `localStorage['theme']='light'` | Decisão do usuário (seção 10 do plano) — evita dessincronização |
| RN-08 | `applyLook(look)` mantém o comportamento visual e de DOM já existente do toggle: `document.body.classList.toggle('light', look.theme!=='dark')`, atualização de `#meta-theme`, sincronização de `#toggle-dark` | Idêntico ao `applyTheme(dark)` atual | Decisão do usuário — unificação já na Fase 0 |
| RN-09 | `toggleTheme(dark)` (chamada hoje pelo checkbox `#toggle-dark` via `onchange`) passa a delegar para `applyLook()`, montando o objeto `look` a partir do `theme` recebido e preservando `mood`/`surface`/`accent` da preferência já salva (ou defaults, se não houver nada salvo) | `toggleTheme(false)` → lê look salvo, troca apenas `theme:'light'`, chama `applyLook(look)` | Decisão do usuário — evita duas fontes de verdade |
| RN-10 | Na inicialização (`init()` em `app.js`), o app lê `localStorage['financas-look']` primeiro. Se existir e for JSON válido, usa esse objeto. Se não existir (usuário com instalação anterior à Fase 0) ou for inválido, monta um `look` de fallback a partir de `localStorage['theme']` (`'dark'`/`'light'`, default `'dark'` se ausente) com `mood`/`surface`/`accent` default | Usuário existente sem `financas-look` → app continua abrindo com o tema salvo em `'theme'`, sem regressão | Decisão do usuário — compatibilidade obrigatória |
| RN-11 | `index.html` `:root`/`body.light` permanecem no CSS como estavam — servem de fallback estático caso `applyLook()` falhe ou demore a rodar (ex.: JS bloqueado) | Usuário com JS desabilitado ainda vê o tema dark padrão via CSS estático | Decisão de produto — resiliência |
| RN-12 | Nenhum nome de variável CSS existente é alterado. Novas variáveis, se necessárias para a composição, usam nomes adicionais — nunca substituem os nomes atuais (`--bg`, `--blue`, etc.) | `--blue` continua sendo `--blue`, não vira `--accent` | Decisão de produto — evitar quebra em cascata |
| RN-13 | `js/theme.js` é carregado via `<script src>` sequencial em `index.html`, posicionado entre `js/projection.js` e `js/config.js`, e adicionado na mesma posição relativa em `urlsToCache` do `sw.js` | Ordem: `...projection.js, theme.js, config.js, app.js` | Restrição arquitetural — `architecture.md` |
| RN-14 | O bump de versão do SW (`financas-v10` → `financas-v11`) é obrigatório nesta entrega, independentemente do tamanho da mudança | Toda entrega com mudança de JS/HTML precisa de bump, já é praxe do projeto | Restrição de processo |

---

## Arquivos a modificar

| Arquivo | O que muda | Risco |
|---------|------------|-------|
| `js/theme.js` (novo) | Criação do arquivo com `buildTokens()` e `applyLook()` | Médio — lógica nova, mas isolada; testável em isolamento antes de integrar |
| `js/app.js` | (1) `toggleTheme(dark)` passa a delegar para `applyLook()`; (2) `applyTheme(dark)` é absorvida/mantida como wrapper interno se necessário para compatibilidade com chamadas existentes; (3) `init()` lê `financas-look` com fallback para `theme` | Médio — ponto de inicialização crítico; qualquer erro aqui quebra o boot do app |
| `index.html` | (1) Adicionar `<script src="js/theme.js">` entre `projection.js` e `config.js`; (2) nenhuma mudança em `:root`/`body.light` | Baixo — apenas inclusão de script na ordem certa |
| `sw.js` | (1) Bump `CACHE = 'financas-v10'` → `'financas-v11'`; (2) adicionar `js/theme.js` em `urlsToCache`, na posição equivalente (entre `projection.js` e `config.js`) | Baixo — mudança mecânica, mas obrigatória |

---

## User Stories

### Story 1 — Função de composição de tokens reproduz o estado atual

```
Como time de desenvolvimento
Quero uma função buildTokens() que gera os mesmos valores de CSS hoje hardcoded
Para que a fundação de temas exista sem qualquer mudança visual perceptível
```

**Critérios de aceite:**

```gherkin
Cenário: buildTokens sem argumentos reproduz o dark atual
  Dado que chamo buildTokens() sem nenhum argumento
  Quando comparo o objeto retornado com os valores de :root em index.html
  Então todos os valores são idênticos (--bg, --bg2, --bg3, --bg4, --bg5, --border, --border2,
    --text, --text2, --text3, --green*, --red*, --blue*, --amber*, --purple*, --teal*, --nav-bg)

Cenário: buildTokens('light') reproduz o light atual
  Dado que chamo buildTokens('light')
  Quando comparo o objeto retornado com os valores de body.light em index.html
  Então todos os valores são idênticos

Cenário: mood e surface não alteram o resultado nesta fase
  Dado que chamo buildTokens('dark', 'Neutro', 'Minimal')
  Quando comparo com buildTokens('dark')
  Então os resultados são idênticos (RN-03)

Cenário: accent customizado sobrescreve apenas o grupo blue
  Dado que chamo buildTokens('dark', undefined, undefined, '#ff0000')
  Quando comparo o objeto retornado com buildTokens('dark')
  Então --blue, --blue-bg e --blue-border diferem
  E todos os demais tokens permanecem idênticos
```

**Regras associadas:** RN-01, RN-02, RN-03, RN-04

---

### Story 2 — applyLook aplica e persiste a aparência

```
Como usuário do app
Quero que minha preferência de tema seja aplicada e mantida entre sessões
Para não precisar reconfigurar nada ao reabrir o app
```

**Critérios de aceite:**

```gherkin
Cenário: applyLook aplica tokens no DOM
  Dado que chamo applyLook({theme:'dark', mood:'Profundo', surface:'Cartões', accent:'#5b8eff'})
  Quando inspeciono getComputedStyle(document.documentElement) após a chamada
  Então cada variável CSS reflete o valor calculado por buildTokens com os mesmos parâmetros

Cenário: applyLook persiste em financas-look
  Dado que chamo applyLook({theme:'light', mood:'Profundo', surface:'Cartões', accent:'#5b8eff'})
  Quando leio localStorage.getItem('financas-look')
  Então o valor é um JSON válido igual a {theme:'light', mood:'Profundo', surface:'Cartões', accent:'#5b8eff'}

Cenário: applyLook sincroniza a chave theme legada
  Dado que chamo applyLook({theme:'light', ...})
  Quando leio localStorage.getItem('theme')
  Então o valor é 'light'

Cenário: applyLook mantém comportamento visual do toggle
  Dado que chamo applyLook({theme:'light', ...})
  Quando inspeciono o DOM
  Então document.body tem a classe 'light'
  E o atributo content de #meta-theme é '#f5f6fa'
  E o checkbox #toggle-dark está desmarcado
```

**Regras associadas:** RN-05, RN-06, RN-07, RN-08

---

### Story 3 — toggleTheme unificado com applyLook

```
Como usuário do app
Quero que o botão de alternar tema claro/escuro continue funcionando exatamente como hoje
Para não perceber nenhuma diferença de comportamento após a mudança interna
```

**Critérios de aceite:**

```gherkin
Cenário: Alternar para claro via checkbox
  Dado que o app está com tema escuro ativo
  Quando o usuário desmarca o checkbox #toggle-dark (dispara toggleTheme(false))
  Então o tema visual muda para claro (idêntico ao comportamento anterior)
  E localStorage['theme'] é atualizado para 'light'
  E localStorage['financas-look'] é atualizado com theme:'light', preservando mood/surface/accent anteriores

Cenário: Alternar para escuro via checkbox
  Dado que o app está com tema claro ativo
  Quando o usuário marca o checkbox #toggle-dark (dispara toggleTheme(true))
  Então o tema visual muda para escuro
  E ambas as chaves localStorage ('theme' e 'financas-look') refletem theme:'dark'

Cenário: Alternar tema não altera mood/surface/accent salvos
  Dado que o usuário já tem financas-look salvo com accent customizado (ex: '#ff0000')
  Quando alterna o tema via checkbox
  Então o novo financas-look mantém accent:'#ff0000'
  E apenas o campo theme muda
```

**Regras associadas:** RN-08, RN-09

---

### Story 4 — Inicialização compatível com usuários existentes

```
Como usuário que já tem o app instalado antes desta fase
Quero que meu tema salvo continue sendo respeitado após a atualização
Para não ter que reconfigurar nada
```

**Critérios de aceite:**

```gherkin
Cenário: Usuário existente sem financas-look
  Dado que localStorage tem apenas 'theme'='light' (sem 'financas-look')
  Quando o app inicializa (init())
  Então o app abre com tema claro, idêntico ao comportamento anterior a esta fase
  E localStorage['financas-look'] passa a existir, com theme:'light' e defaults para mood/surface/accent

Cenário: Usuário novo, sem nenhuma chave salva
  Dado que localStorage não tem 'theme' nem 'financas-look'
  Quando o app inicializa
  Então o app abre com tema escuro (default atual)
  E ambas as chaves passam a existir com os valores default

Cenário: Usuário já na Fase 0, com financas-look salvo
  Dado que localStorage tem 'financas-look' válido com theme:'dark', accent:'#5b8eff'
  Quando o app inicializa
  Então o app aplica exatamente esse look, ignorando o valor de 'theme' isoladamente

Cenário: financas-look corrompido ou JSON inválido
  Dado que localStorage['financas-look'] contém uma string que não é JSON válido
  Quando o app inicializa
  Então o app não trava nem exibe erro ao usuário
  E cai no fallback via localStorage['theme'] (ou default dark, se também ausente/inválido)
```

**Regras associadas:** RN-10, RN-11

---

### Story 5 — Zero regressão nos 10 itens INTOCÁVEIS

```
Como usuário do app
Quero que todas as funcionalidades existentes continuem funcionando exatamente como antes
Para que a fundação técnica não introduza nenhum bug perceptível
```

**Critérios de aceite:**

```gherkin
Cenário: Lançamentos com subitens
  Dado que crio um lançamento com subitens
  Quando salvo e reabro a listagem
  Então o lançamento e seus subitens aparecem corretamente, sem alteração de comportamento

Cenário: Orçamento — marcar como realizado
  Dado que tenho um item de orçamento do mês corrente
  Quando marco como realizado (budgetDone)
  Então o estado é persistido e refletido visualmente sem diferença do comportamento anterior

Cenário: Alfinete / mês de referência
  Dado que estou em um mês diferente do mês de referência
  Quando clico no botão de alfinete
  Então o mês de referência é atualizado e o botão de pin oculta/exibe conforme regra existente

Cenário: Cartões completo
  Dado que tenho cartões, gastos, recorrentes e faturas cadastrados
  Quando navego pela aba Cartão
  Então CRUD, fechamento/vencimento, limite, fatura agregada e "Fatura <cartão>" no fluxo de caixa
    funcionam sem alteração

Cenário: Projeção
  Dado que tenho dados de orçamento e cartões
  Quando abro a aba Projeção
  Então os valores de 3/6/12 meses e saldo acumulado são idênticos aos exibidos antes desta fase

Cenário: Filtros pessoa/período
  Dado que tenho múltiplas pessoas cadastradas
  Quando aplico filtro por pessoa e navego entre meses
  Então os dados filtrados são exibidos corretamente em todas as abas

Cenário: Pessoas com cor
  Dado que tenho pessoas cadastradas com cores distintas
  Quando visualizo pills/avatares em qualquer aba
  Então as cores são exibidas corretamente

Cenário: Configurações — atualizar app
  Dado que estou na aba Configurações
  Quando clico em atualizar/forçar refresh
  Então o histórico de atualizações registra a ação e o SW é atualizado (v11)

Cenário: Tema escuro idêntico ao anterior
  Dado que o app está com tema escuro (default)
  Quando comparo visualmente com uma captura anterior a esta fase
  Então não há nenhuma diferença perceptível de cor, contraste ou espaçamento

Cenário: Tema claro idêntico ao anterior
  Dado que alterno para tema claro
  Quando comparo visualmente com uma captura anterior a esta fase
  Então não há nenhuma diferença perceptível de cor, contraste ou espaçamento
```

**Regras associadas:** RN-01, RN-02, RN-11, RN-12 — cobre a regra de ouro do handoff (seção 1 do plano)

---

### Story 6 — Ordem de carregamento e cache do Service Worker

```
Como time de desenvolvimento
Quero que o novo arquivo theme.js seja carregado na ordem correta e cacheado pelo SW
Para evitar erros de função indefinida e servir a versão certa do app
```

**Critérios de aceite:**

```gherkin
Cenário: theme.js carrega antes de config.js
  Dado que abro index.html e inspeciono a ordem das tags <script src>
  Então js/theme.js aparece depois de js/projection.js e antes de js/config.js

Cenário: SW cacheia theme.js
  Dado que o Service Worker instala a versão financas-v11
  Quando inspeciono urlsToCache em sw.js
  Então js/theme.js está presente na lista, na posição equivalente à do index.html

Cenário: Bump de versão força atualização de cache
  Dado que o usuário tem financas-v10 cacheado
  Quando a nova versão financas-v11 é publicada
  Então o SW detecta updatefound e o toast "Nova versão disponível — recarregue" é exibido
    (comportamento já existente, sem alteração)
```

**Regras associadas:** RN-13, RN-14

---

## Detalhamento técnico por arquivo

### js/theme.js (novo)

```
function buildTokens(theme, mood, surface, accent) {
  theme = theme || 'dark';
  accent = accent || '#5b8eff';
  // valores base extraídos 1:1 de index.html :root (dark) e body.light (light)
  // mood e surface aceitos como parâmetros mas sem efeito nesta fase (RN-03)
  // retorna objeto { '--bg': '...', '--blue': accent, '--blue-bg': ..., '--blue-border': ..., ... }
}

function applyLook(look) {
  look = look || {};
  var theme = look.theme || 'dark';
  var mood = look.mood || 'Profundo';
  var surface = look.surface || 'Cartões';
  var accent = look.accent || '#5b8eff';
  var tokens = buildTokens(theme, mood, surface, accent);
  var root = document.documentElement;
  for (var key in tokens) root.style.setProperty(key, tokens[key]);

  document.body.classList.toggle('light', theme !== 'dark');
  var metaTheme = document.getElementById('meta-theme');
  if (metaTheme) metaTheme.content = theme === 'dark' ? '#0d0f1a' : '#f5f6fa';
  var tog = document.getElementById('toggle-dark');
  if (tog) tog.checked = theme === 'dark';

  localStorage.setItem('theme', theme);
  localStorage.setItem('financas-look', JSON.stringify({theme: theme, mood: mood, surface: surface, accent: accent}));
}

function getSavedLook() {
  // lê financas-look; se ausente/inválido, monta fallback a partir de 'theme' (RN-10)
}
```

**Nota técnica — fórmula de derivação de `--blue-bg`/`--blue-border` a partir de `accent` (RN-04):**
Não há fórmula documentada no handoff para esta fase. Recomendação: nesta fase, quando `accent` for o
default (`#5b8eff` no dark / `#2962e8` no light), retornar os valores hardcoded atuais sem cálculo. Se
`accent` for customizado (fora do escopo de uso real na Fase 0, já que não há UI ainda), aplicar uma
fórmula simples de mistura com o fundo (`--bg`) — **a validar com Tech Lead antes da implementação**, pois
não é exercitada por nenhuma UI nesta fase e não deve bloquear a entrega.

### js/app.js

**Alteração em `toggleTheme`:**
```
function toggleTheme(dark){
  var look = getSavedLook();
  look.theme = dark ? 'dark' : 'light';
  applyLook(look);
}
```
`applyTheme(dark)` pode ser removida ou mantida como alias de compatibilidade se houver outras chamadas
diretas no código (`grep` obrigatório antes de remover — ver riscos).

**Alteração em `init()`:**
```
async function init(){
  try{
    applyLook(getSavedLook());
    db = await openDB();
    ...
```

### index.html

Adicionar a linha do script novo na posição correta (após `js/projection.js`, antes de `js/config.js`).
Nenhuma alteração em `:root`/`body.light`.

### sw.js

```
const CACHE = 'financas-v11';
...
self.registration.scope + 'js/projection.js',
self.registration.scope + 'js/theme.js',
self.registration.scope + 'js/config.js',
...
```

---

## Checklist de cenários obrigatórios

- [x] Happy path: `buildTokens()`/`applyLook()` reproduzem o estado visual atual em ambos os temas
- [x] Dados inválidos: `financas-look` corrompido não trava a inicialização
- [x] Usuário sem permissão: não aplicável (sem controle de acesso nesta fase)
- [x] Estado inesperado: usuário existente sem `financas-look` (fallback via `theme`)
- [x] Ação duplicada: alternar tema repetidamente não corrompe `financas-look` nem duplica listeners
- [x] Regressão dos 10 itens INTOCÁVEIS (Story 5)
- [x] `node --check` em todos os arquivos JS modificados/criados

---

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Duplicação de fonte de verdade entre `:root` CSS estático e tokens aplicados via JS pode gerar FOUC ao carregar | Média | Médio | Chamar `applyLook(getSavedLook())` o mais cedo possível em `init()`, antes de qualquer operação assíncrona (`openDB`); avaliar necessidade de inline script mínimo no `<head>` se o FOUC for perceptível em teste manual |
| Nova chave `financas-look` fica dessincronizada da chave antiga `theme` | Alta (se não tratado) | Médio | Mitigado por design: `applyLook` sempre escreve as duas chaves juntas (RN-07); `toggleTheme` sempre passa por `applyLook` (RN-09) — nenhuma outra função deve escrever `localStorage['theme']` isoladamente |
| CSS inline em `index.html` tem ~2k linhas com muitas referências a `var(--bg)` etc. — qualquer renomeação de variável quebra em cascata | Baixa (mitigado por não renomear) | Alto se ocorrer | Esta spec **não renomeia nenhuma variável existente** (RN-12) — apenas adiciona composição por cima |
| `--border` diverge do valor do README do handoff (`#232742` vs. `#323760` real) | Baixa | Baixo | Não é bloqueante nesta fase — `buildTokens` reproduz o valor real atual (`#323760`), não o do README. Resolver na Fase 1 |
| SW cache-first pode servir versão antiga durante o rollout, mostrando UI inconsistente | Média | Baixo | Bump de versão do SW (`financas-v11`) obrigatório (RN-14), já é praxe do projeto |
| Outras chamadas diretas a `applyTheme(dark)` no código (fora de `toggleTheme`) podem existir e quebrar se a função for removida sem substituição | Baixa | Médio | Fazer `grep -rn "applyTheme"` em todo o repositório antes de remover; se houver outras chamadas, manter `applyTheme` como alias fino que delega para `toggleTheme`/`applyLook` |
| Fórmula de derivação de `--blue-bg`/`--blue-border` a partir de accent customizado não está definida | Baixa (não exercitada por UI nesta fase) | Baixo | Usar valores hardcoded para o accent default; adiar fórmula genérica para quando a Fase 1 expuser seleção de accent ao usuário — validar com Tech Lead antes de codificar algo especulativo |

---

## Definição de Pronto (DoD)

Esta fase está pronta quando **todos** os itens abaixo são verdadeiros:

- [ ] Código implementado conforme esta spec
- [ ] `node --check js/theme.js` sem erros
- [ ] `node --check js/app.js` sem erros
- [ ] `grep -rn "applyTheme"` revisado — nenhuma chamada quebrada
- [ ] Smoke test manual completo no browser (ver abaixo)
- [ ] Os 10 itens INTOCÁVEIS validados manualmente (Story 5) — sem regressão
- [ ] Tema claro e escuro comparados visualmente com o estado anterior — sem diferença perceptível
- [ ] Versão do SW incrementada para `financas-v11`
- [ ] Confirmação explícita do usuário antes de commit

**Smoke test manual obrigatório (sequência):**

1. Abrir o app no browser com dados existentes (IndexedDB já populado)
2. Confirmar que o app abre no tema esperado (o que estava salvo antes da mudança)
3. Alternar o checkbox de tema (claro ↔ escuro) múltiplas vezes — confirmar comportamento idêntico ao anterior
4. Abrir DevTools → Application → Local Storage — confirmar existência de `financas-look` com JSON válido e `theme` sincronizado
5. Limpar apenas a chave `financas-look` (mantendo `theme`) e recarregar — confirmar que o tema correto é restaurado e `financas-look` é recriado
6. Percorrer as 10 validações da Story 5 (lançamentos c/ subitens, orçamento realizado, alfinete, cartões completo, projeção, filtros pessoa/período, pessoas com cor, configurações/atualizar, tema escuro, tema claro)
7. Abrir DevTools → Console — confirmar ausência de erros JavaScript em todas as ações acima
8. Forçar atualização do Service Worker (ou aguardar `updatefound`) — confirmar toast "Nova versão disponível" e que `CACHE` em `sw.js` está em `financas-v11`

---

## Definição de Pronto para Entrar em Implementação (DoR)

- [x] Contexto claro: problema e solução descritos
- [x] User stories no formato correto
- [x] Critérios de aceite escritos em Given/When/Then
- [x] Regras de negócio explícitas e sem interpretação livre
- [x] Escopo desta fase separado do escopo futuro (Fase 1+)
- [x] Dependências identificadas (nenhuma externa bloqueante)
- [x] Restrições técnicas documentadas
- [x] Riscos identificados com mitigação
- [x] Arquivos a modificar mapeados com escopo preciso
- [x] Plano aprovado pelo usuário (base desta spec), incluindo as 3 decisões da seção 10

**Pontos abertos — validados pelo Tech Lead em 2026-07-07. Spec aprovada para implementação.**

Decisões técnicas registradas:

1. **`applyTheme(dark)` pode ser removida diretamente, sem alias de compatibilidade.**
   `grep -rn "applyTheme"` no repositório inteiro mostra apenas duas ocorrências: a definição da própria
   função e a chamada dentro de `toggleTheme(dark){applyTheme(dark)}` (`js/app.js` linha 32) e a chamada em
   `init()` (`js/app.js` linha 103). Nenhuma chamada externa (HTML inline, outros módulos JS, `onclick`).
   `applyTheme` pode ser absorvida por `applyLook()` sem wrapper de compatibilidade.

2. **Chamar `applyLook(getSavedLook())` cedo em `init()`, na mesma posição síncrona que `applyTheme` ocupa
   hoje, é suficiente. Não é necessário inline `<script>` no `<head>`.**
   Hoje `applyTheme(...)` já roda como primeira linha síncrona dentro do `try` de `init()`, antes de
   qualquer `await` (inclusive antes de `openDB()`), e não há FOUC perceptível reportado. Isso acontece
   porque `:root`/`body.light` em `index.html` já definem os valores default corretos via CSS puro — o
   primeiro paint do navegador já usa esses valores antes do JS executar; a chamada em `init()` apenas
   confirma/ajusta a classe `light` quando aplicável. Como a Fase 0 não muda o valor default (`dark`/
   `Profundo`/`Cartões`/`#5b8eff`) nem a posição de execução (mesma primeira linha síncrona, agora chamando
   `applyLook` em vez de `applyTheme`), o risco de FOUC é idêntico ao status quo — ou seja, não perceptível.
   Introduzir inline script no `<head>` seria complexidade adicional sem ganho mensurável nesta fase;
   revisitar apenas se o comportamento do CSS estático de fallback mudar (não é o caso aqui, RN-11 mantém
   `:root`/`body.light` intactos).

3. **Não implementar fórmula de derivação de `--blue-bg`/`--blue-border` a partir de accent customizado
   nesta fase.** Confirmado por inspeção do `:root`/`body.light` atual: não existe relação algorítmica
   simples e documentada entre `--blue`, `--blue-bg` e `--blue-border` (são valores hardcoded, não uma
   mistura previsível). Como nenhuma UI na Fase 0 produz accent diferente do default `#5b8eff`, qualquer
   fórmula implementada agora seria especulativa, não exercitada por nenhum teste real e arriscaria ficar
   incorreta sem detecção até a Fase 1. RN-04 já está corretamente escrita ("usar valores hardcoded para o
   accent default") — nenhum ajuste de regra necessário. A fórmula real deve ser definida em conjunto com o
   UX Architect na Fase 1, quando houver paleta de accents real a validar visualmente.

**Conclusão: spec pronta para o Senior Dev implementar sem ajustes adicionais.**

---

## Ordem de implementação recomendada

1. **Fase A — `js/theme.js`** — criação isolada, testável via console do browser antes de integrar
   - `buildTokens()` reproduzindo dark e light atuais
   - `applyLook()` e `getSavedLook()`
   - `node --check js/theme.js`

2. **Fase B — Integração em `index.html` e `sw.js`**
   - Adicionar `<script src="js/theme.js">` na ordem correta
   - Bump `financas-v10` → `financas-v11` e adicionar `js/theme.js` em `urlsToCache`

3. **Fase C — `js/app.js`**
   - `grep -rn "applyTheme"` para mapear todas as chamadas
   - Unificar `toggleTheme`/`applyTheme` com `applyLook`
   - Ajustar `init()` para usar `getSavedLook()`
   - `node --check js/app.js`

4. **Fase D — Validação final**
   - Smoke test completo (8 passos acima)
   - Validação dos 10 itens INTOCÁVEIS
   - Confirmação do usuário
   - Commit
