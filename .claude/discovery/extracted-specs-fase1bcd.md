# Especificações extraídas — Fase 1b/1c/1d (Temas prontos, Cor por pessoa, Capa do saldo)

> Fonte: `Financas App.dc.html` e `support.js` do protótipo em
> `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\`
> Extração literal — trechos copiados do código-fonte, não parafraseados.
> Não repete: THEME_PRESETS (array de 10 temas), buildTokens()/DARK_RAMPS/LIGHT_RAMPS/DARK_SEM/LIGHT_SEM, nem a fórmula de heroBg/heroBorder (já extraídos anteriormente).

---

## 1. Fase 1b — 10 temas prontos (UI)

### 1.1 Localização
- HTML: `Financas App.dc.html`, dentro da tela Configurações, bloco "Aparência" → "Temas prontos" (linhas 776–788).
- Lógica/estado: mesmo arquivo, método de classe (linhas 1623–1625) e `render()` (linha 2309).
- **Não está em `support.js`** — toda a lógica de presets vive no `.dc.html`.

### 1.2 Estrutura visual exata (HTML/CSS literal)

```html
<div style="font-size:14px;font-weight:500;margin-bottom:2px">Temas prontos</div>
<div style="font-size:12px;color:var(--text3);margin-bottom:10px">Combinações completas num toque</div>
<div onPointerDown="{{ presetRowDown }}" onPointerMove="{{ presetRowMove }}" onPointerUp="{{ presetRowUp }}" onPointerLeave="{{ presetRowUp }}" class="ph-scroll" style="display:flex;gap:8px;overflow-x:auto;touch-action:pan-x;cursor:grab;padding-bottom:2px">
  <sc-for list="{{ presetOptions }}" as="pr" hint-placeholder-count="10">
    <button onClick="{{ pr.onClick }}" style-active="transform:scale(.95)" style="flex-shrink:0;width:74px;height:68px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:{{ pr.bg }};border:1.5px solid {{ pr.ring }};border-radius:12px;padding:6px 4px;cursor:pointer;transition:transform .12s,border-color .2s">
      <span style="width:15px;height:15px;border-radius:50%;background:{{ pr.accentDot }};flex-shrink:0"></span>
      <span style="font-size:10px;font-weight:600;color:{{ pr.fg }};text-align:center;line-height:1.15;white-space:normal;word-break:break-word;max-width:100%">{{ pr.name }}</span>
    </button>
  </sc-for>
</div>
```

Resumo de valores literais:
- Container da fileira: `display:flex; gap:8px; overflow-x:auto; touch-action:pan-x; cursor:grab; padding-bottom:2px` — classe `ph-scroll` adicional (provavelmente estiliza a scrollbar, não encontrada definição de `.ph-scroll` nos dois arquivos lidos — verificar CSS global se precisar).
- Card do tema (`button`):
  - `width:74px; height:68px`
  - `flex-shrink:0` (não encolhe na fileira)
  - `display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px`
  - `background: {{ pr.bg }}` (cor de fundo do preset, ver §1.3)
  - `border: 1.5px solid {{ pr.ring }}` (borda de destaque quando ativo, ver §1.3)
  - `border-radius:12px`
  - `padding:6px 4px`
  - `transition: transform .12s, border-color .2s`
  - `style-active` (pseudo-estado de toque/press): `transform:scale(.95)`
- Dot do accent: `<span>` de `width:15px; height:15px; border-radius:50%; background:{{ pr.accentDot }}; flex-shrink:0`
- Nome do tema: `<span>` de `font-size:10px; font-weight:600; color:{{ pr.fg }}; text-align:center; line-height:1.15; white-space:normal; word-break:break-word; max-width:100%`

### 1.3 Mapeamento de dados → visual (`presetOptions`, linha 2309)

```js
presetOptions:THEME_PRESETS.map(p=>{
  const pr=(p.theme==='dark'?DARK_RAMPS:LIGHT_RAMPS)[p.mood];
  const active=(!s.autoTheme&&s.theme===p.theme&&mood===p.mood&&accent===p.accent&&surface===p.surface&&!!s.oled===!!p.oled);
  return{
    name:p.name,
    bg:p.oled?'#000000':pr['--bg2'],
    fg:pr['--text'],
    accentDot:p.accent,
    ring:active?p.accent:pr['--border2'],
    onClick:()=>this.applyPreset(p)
  };
}),
```

- `bg` do card: se o preset for OLED, fundo fica `#000000` fixo; senão usa `--bg2` da rampa (dark ou light) correspondente ao `mood` do preset.
- `fg` (cor do texto do nome): usa `--text` da rampa.
- `accentDot`: cor exata do `accent` do preset (hex).
- `ring` (cor da borda): se o preset é o **ativo no momento** (comparação campo a campo: `theme`, `mood`, `accent`, `surface`, `oled`, e `autoTheme` deve estar desligado) → usa a cor do próprio `accent` (destaque); senão usa `--border2` da rampa (borda neutra).
- Cálculo de "ativo" NÃO compara `name`, compara os 5 campos de configuração reais.

### 1.4 Lógica de drag-sem-capturar-clique

Localização: `Financas App.dc.html`, linhas 1623–1625 (métodos de classe do componente).

```js
presetRowDown(e){if(e.pointerType!=='mouse')return;this._psDrag={x:e.clientX,sl:e.currentTarget.scrollLeft};}
presetRowMove(e){if(!this._psDrag||e.buttons!==1)return;const dx=e.clientX-this._psDrag.x;if(Math.abs(dx)>6)this._psMoved=true;e.currentTarget.scrollLeft=this._psDrag.sl-dx;}
presetRowUp(e){this._psDrag=null;if(this._psMoved){clearTimeout(this._psmT);this._psmT=setTimeout(()=>{this._psMoved=false;},120);}}
```

Detalhamento da lógica:
1. **`presetRowDown`**: só arma o drag se o ponteiro for do tipo `mouse` (`e.pointerType!=='mouse'` → sai sem fazer nada; ou seja, em touch o browser já faz scroll nativo via `touch-action:pan-x`, e o "drag manual" com JS é exclusivo para mouse/desktop). Guarda `x` inicial do clique (`e.clientX`) e o `scrollLeft` atual do container (`this._psDrag = {x, sl}`).
2. **`presetRowMove`**: só age se `this._psDrag` existir e o botão esquerdo do mouse estiver pressionado (`e.buttons===1`). Calcula `dx = e.clientX - this._psDrag.x`.
   - **Threshold de movimento: `Math.abs(dx) > 6` pixels** — se ultrapassar, marca `this._psMoved = true` (flag que indica que houve arrasto, não apenas clique).
   - Atualiza o scroll do container: `scrollLeft = this._psDrag.sl - dx` (arrasta o conteúdo, efeito "grab" invertido: mover o mouse para a esquerda aumenta o scroll).
3. **`presetRowUp`**: limpa `this._psDrag = null`. Se houve movimento (`this._psMoved === true`), agenda um `setTimeout` de **120ms** que só então reseta `this._psMoved = false`. Isso serve para o clique subsequente (`onClick` do botão do tema) poder checar a flag e ser **ignorado** se o usuário só estava arrastando — ver `applyPreset` abaixo.
   - `clearTimeout(this._psmT)` antes de reagendar evita timers duplicados/sobrepostos.

### 1.5 Aplicação do preset ao clicar

```js
applyPreset(p){
  if(this._psMoved)return;
  this.setState({theme:p.theme,mood:p.mood,accent:p.accent,surface:p.surface,oled:!!p.oled,autoTheme:false,themeReveal:true});
  this._fireReveal();
  this._persistSoon();
  this.toast('Tema "'+p.name+'" aplicado','var(--blue)');
}
```

- **Guarda de drag**: `if(this._psMoved)return;` — é exatamente aqui que a lógica de drag do §1.4 impede o clique de aplicar o tema se o usuário estava arrastando a fileira.
- Função chamada no `onClick` do botão de cada card de preset (`pr.onClick:()=>this.applyPreset(p)`).
- Ao aplicar: seta `theme`, `mood`, `accent`, `surface`, `oled` (forçado para boolean com `!!`) vindos do objeto do preset; força `autoTheme:false` (desliga tema automático); ativa `themeReveal:true` (flag de animação de transição de tema).
- Chama `this._fireReveal()` (dispara efeito visual de revelação — não investigado em detalhe, fora do escopo desta extração).
- Chama `this._persistSoon()` (persiste no localStorage, debounced).
- Mostra toast de confirmação: `Tema "<nome>" aplicado`, cor `var(--blue)`.

---

## 2. Fase 1c — Cor por pessoa

### 2.1 Confirmação de `PESSOA_COLORS`

```js
const PESSOA_COLORS=['#5b8eff','#a78bfa','#22c55e','#f97316','#ec4899','#14b8a6'];
```
Linha 1435 do `.dc.html`. **Confirmado**: bate exatamente com os 6 valores informados (`#5b8eff #a78bfa #22c55e #f97316 #ec4899 #14b8a6`).

### 2.2 Estrutura do "card de 2 linhas" por pessoa (HTML literal)

Localização: Configurações → bloco "Pessoas" (linhas 746–767).

```html
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:12px">
  <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:500;margin-bottom:12px">Pessoas</div>
  <sc-for list="{{ pessoas }}" as="p" hint-placeholder-count="2">
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:10px 12px;margin-bottom:8px">
      <!-- linha 1: avatar + nome -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
        <div style="width:24px;height:24px;border-radius:50%;background:{{ p.color }};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">{{ p.initial }}</div>
        <span style="flex:1;font-size:14px;font-weight:500;min-width:0">{{ p.nome }}</span>
      </div>
      <!-- linha 2: swatches + seletor livre -->
      <div style="display:flex;gap:8px;align-items:center">
        <sc-for list="{{ p.swatches }}" as="sw" hint-placeholder-count="6">
          <button onClick="{{ sw.onClick }}" style-active="transform:scale(.82)" style="width:20px;height:20px;border-radius:50%;background:{{ sw.hex }};border:none;box-shadow:{{ sw.ring }};cursor:pointer;padding:0;flex-shrink:0;transition:transform .1s,box-shadow .15s"></button>
        </sc-for>
        <div style="flex:1"></div>
        <label title="Cor personalizada" style="position:relative;width:24px;height:24px;border-radius:50%;background:conic-gradient(#f55,#fa0,#ff5,#5f5,#5ff,#55f,#f5f,#f55);box-shadow:0 0 0 1px var(--border2);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden">
          <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;opacity:.9"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
          <input type="color" value="{{ p.color }}" onInput="{{ p.onColorInput }}" style="position:absolute;inset:0;opacity:0;cursor:pointer;border:none;padding:0">
        </label>
      </div>
    </div>
  </sc-for>
  <button onClick="{{ toastSoon }}" style-active="transform:scale(.97);background:var(--bg4)" style="margin-top:2px;width:100%;background:transparent;color:var(--text2);border:1px solid var(--border2);border-radius:9px;padding:9px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .1s">+ Adicionar pessoa</button>
</div>
```

Detalhamento:
- **Card do grupo "Pessoas"** (container externo): `background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:16px; margin-bottom:12px`, com título uppercase padrão (`font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:1px; font-weight:500`).
- **Card individual de cada pessoa**: `background:var(--bg3); border:1px solid var(--border); border-radius:9px; padding:10px 12px; margin-bottom:8px`.
- **Linha 1 (avatar + nome)**: `display:flex; align-items:center; gap:10px; margin-bottom:9px`.
  - Avatar: círculo `24x24px`, `border-radius:50%`, fundo = cor da pessoa (`{{ p.color }}`), texto = inicial do nome (`{{ p.initial }}`), `font-size:11px; font-weight:700; color:#fff`.
  - Nome: `flex:1; font-size:14px; font-weight:500; min-width:0`.
- **Linha 2 (swatches + seletor livre)**: `display:flex; gap:8px; align-items:center`.
  - 6 swatches fixos (círculos de `20x20px`, `border-radius:50%`, sem borda, com `box-shadow` variável = anel de seleção).
  - `<div style="flex:1"></div>` — spacer que empurra o seletor livre para a direita.
  - Seletor de cor livre (círculo arco-íris) — ver §2.3.
- **Botão "+ Adicionar pessoa"**: fora do `sc-for`, ao final do card do grupo. Não tem lógica real — `onClick="{{ toastSoon }}"` (apenas dispara um toast placeholder, não implementado de verdade no protótipo).

### 2.3 Estrutura do color picker livre "círculo arco-íris"

**É um `conic-gradient` CSS puro**, não canvas/SVG:

```css
background: conic-gradient(#f55,#fa0,#ff5,#5f5,#5ff,#55f,#f5f,#f55);
```
8 paradas de cor em sequência circular (vermelho → laranja → amarelo → verde → ciano → azul → magenta → volta pro vermelho), sem ângulos explícitos definidos (distribuídas uniformemente pelo `conic-gradient` por padrão).

Estrutura completa do `<label>` que hospeda o gradiente:
```html
<label title="Cor personalizada" style="position:relative;width:24px;height:24px;border-radius:50%;background:conic-gradient(#f55,#fa0,#ff5,#5f5,#5ff,#55f,#f5f,#f55);box-shadow:0 0 0 1px var(--border2);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden">
  <svg .../> <!-- ícone de "conta-gotas"/pipeta sobreposto, branco, 11x11px, opacity:.9 -->
  <input type="color" .../>
</label>
```

**Como o `input[type=color]` nativo se combina visualmente**:
- O `<input type="color">` é posicionado `position:absolute; inset:0` sobre TODO o círculo do `<label>`, mas com `opacity:0` — ou seja, é **totalmente invisível**, apenas captura o clique/toque na área do círculo e abre o color picker nativo do sistema operacional/browser.
- O `<label>` (elemento pai, `position:relative; overflow:hidden`) é quem exibe visualmente o círculo com o `conic-gradient` de fundo — funciona como "moldura" decorativa fixa, não reflete a cor selecionada.
- Um ícone SVG de pipeta/conta-gotas (branco, `11x11px`, `opacity:.9`) fica centralizado por cima do gradiente via flexbox (`display:flex; align-items:center; justify-content:center`), reforçando visualmente que é um seletor de cor.
- `value="{{ p.color }}"` no input mantém o valor atual sincronizado (para quando o OS abre o picker nativo, ele já abre na cor atual da pessoa).
- `onInput="{{ p.onColorInput }}"` → chama `setPessoaColor(p.id, e.target.value)` a cada mudança (ver §2.4).
- Importante: o círculo visível **nunca muda de cor** — ele é sempre o gradiente arco-íris fixo, funcionando puramente como botão/gatilho para abrir o picker do sistema. A cor selecionada só aparece refletida no avatar da pessoa (linha 1 do card) e no anel do swatch ativo, não no próprio botão-gatilho.

### 2.4 Lógica de dados (`render()`, linhas 2390–2391)

```js
pessoas:s.pessoas.map(p=>({
  nome:p.nome,
  color:p.color,
  initial:p.nome[0],
  onColorInput:e=>this.setPessoaColor(p.id,e.target.value),
  swatches:PESSOA_COLORS.map(hex=>({
    hex,
    onClick:()=>this.setPessoaColor(p.id,hex),
    ring:p.color===hex?'0 0 0 2px var(--bg3),0 0 0 3.5px '+hex:'none'
  }))
})),
```

- `initial`: primeira letra do nome (`p.nome[0]`), sem tratamento de acento/caixa — literal.
- Cada swatch tem `ring` (na verdade um `box-shadow`, não CSS `outline`/`ring` de fato) condicional: se a cor do swatch bate com `p.color` (cor atual da pessoa) → `box-shadow: 0 0 0 2px var(--bg3), 0 0 0 3.5px <hex>` (duplo anel: um "respiro" de 2px na cor de fundo do card + anel de 3.5px na cor do swatch, criando efeito de anel destacado/vazado); senão → `none`.
- Método de mutação de estado:
```js
setPessoaColor(id,hex){
  this.setState(s=>({pessoas:s.pessoas.map(p=>p.id===id?{...p,color:hex}:p)}));
  this._persistSoon();
}
```
  Atualiza a cor da pessoa pelo `id` no array `pessoas` do estado global, e persiste (debounced) via `_persistSoon()`.

### 2.5 Estrutura de dados de pessoa (inferida do uso)

Cada item de `s.pessoas` (estado bruto, antes do mapeamento de `render()`) possui pelo menos:
```js
{ id: <string|number>, nome: <string>, color: <hex string> }
```
Não foi encontrada a definição/seed inicial de `s.pessoas` nesta extração (fora do escopo solicitado — se precisar, buscar separadamente o estado inicial do componente).

---

## 3. Fase 1d — Capa do saldo (heroStyle)

### 3.1 Estrutura completa do card de saldo no Dashboard (HTML literal, linhas 116–140)

```html
<!-- HERO saldo -->
<button onClick="{{ markUpdate }}" style="display:block;width:100%;text-align:left;border:1px solid var(--heroBorder);background:var(--heroBg);border-radius:20px;padding:18px;margin-bottom:12px;cursor:pointer">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <span style="font-size:12px;color:var(--text2);font-weight:500">Saldo de {{ monthName }}</span>
    <span style="display:inline-flex;align-items:center;gap:8px">
      <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--green);background:var(--green-bg);border:1px solid var(--green-border);border-radius:20px;padding:3px 9px">▲ 12% vs mês ant.</span>
      <span onClick="{{ toggleHideValuesStop }}" role="button" title="Ocultar valores" style-active="transform:scale(.85)" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;cursor:pointer;transition:transform .1s">
        <!-- ícone olho aberto/fechado (SVG), condicional por hideValues -->
      </span>
    </span>
  </div>
  <div style="display:flex;font-size:38px;font-weight:600;font-family:'DM Mono',monospace;line-height:1;color:{{ balColor }}">
    <!-- dígitos do saldo animados via odômetro (slot machine), ver 3.1.1 -->
  </div>
  <svg viewBox="0 0 300 40" preserveAspectRatio="none" style="width:100%;height:34px;margin-top:13px;display:block">
    <polyline points="0,30 50,26 100,32 150,20 200,24 250,14 300,8" pathLength="1" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1;animation:drawLine 1.1s cubic-bezier(.4,0,.2,1) .1s forwards"/>
  </svg>
  <div style="font-size:10px;color:var(--text3);margin-top:8px">🕐 {{ lastUpdateStr }} · toque para marcar</div>
</button>
```

Estrutura resumida:
- **Elemento raiz**: `<button>` (o card inteiro é clicável — dispara `markUpdate` ao tocar em qualquer parte, exceto no botão de "ocultar valores" que usa `toggleHideValuesStop`, provavelmente com `stopPropagation`).
  - `display:block; width:100%; text-align:left`
  - `border: 1px solid var(--heroBorder)` ← token do heroStyle
  - `background: var(--heroBg)` ← token do heroStyle
  - `border-radius:20px`
  - `padding:18px`
  - `margin-bottom:12px`
  - `cursor:pointer`
- **Linha superior** (`margin-bottom:8px`, flex space-between):
  - Label "Saldo de {mês}" à esquerda: `font-size:12px; color:var(--text2); font-weight:500`.
  - À direita: badge de variação percentual (pill verde, `border-radius:20px; padding:3px 9px`, com seta ▲ e texto "12% vs mês ant." — valor **hardcoded no protótipo**, não dinâmico) + botão de olho para ocultar valores (`26x26px`, `border-radius:8px`).
- **Valor do saldo**: `font-size:38px; font-weight:600; font-family:'DM Mono',monospace; line-height:1; color:{{ balColor }}` — cor dinâmica conforme saldo positivo/negativo (`balColor`, não detalhado aqui, fora do escopo). Dígitos renderizados com efeito de odômetro/slot-machine (ver `bd.isDigit`/`bd.shift` no HTML original, linhas 128–134 — cada dígito é uma coluna de 0–9 que desliza via `transform`).
- **Sparkline**: `<svg>` de `300x40` viewBox, `preserveAspectRatio="none"`, altura CSS `34px`, `width:100%`, `margin-top:13px`. Polyline com pontos fixos hardcoded no protótipo (`0,30 50,26 100,32 150,20 200,24 250,14 300,8`), stroke `var(--blue)`, `stroke-width:2.5`, animação de "desenhar linha" via `stroke-dasharray/dashoffset` + `@keyframes drawLine` (1.1s, easing `cubic-bezier(.4,0,.2,1)`, delay `.1s`).
- **Rodapé**: texto pequeno `font-size:10px; color:var(--text3); margin-top:8px` com ícone de relógio + "toque para marcar".

**Conclusão**: os tokens `--heroBg`/`--heroBorder` são usados **apenas** em duas propriedades do `<button>` raiz do card — `background` e `border` — nada mais no card depende do heroStyle. Todo o resto (padding, border-radius, tipografia, sparkline) é fixo e independente do estilo de capa escolhido.

### 3.1.1 Detalhe do odômetro de dígitos (linhas 128–134)

```html
<sc-for list="{{ balSlot }}" as="bd" hint-placeholder-count="10">
  <sc-if value="{{ bd.isDigit }}" hint-placeholder-val="{{ false }}">
    <span style="display:inline-block;height:1em;overflow:hidden">
      <span style="display:block;transition:transform .55s cubic-bezier(.25,.9,.3,1);transform:{{ bd.shift }}">
        <span style="display:block;height:1em">0</span><span style="display:block;height:1em">1</span>...<span style="display:block;height:1em">9</span>
      </span>
    </span>
  </sc-if>
  <sc-if value="{{ bd.isPlain }}" hint-placeholder-val="{{ true }}"><span style="display:inline-block;height:1em">{{ bd.char }}</span></sc-if>
</sc-for>
```
Cada dígito é uma coluna vertical oculta (`overflow:hidden; height:1em`) contendo os números 0–9 empilhados; `transform:{{ bd.shift }}` desliza a coluna verticalmente até mostrar o dígito correto, com transição `.55s cubic-bezier(.25,.9,.3,1)`. Caracteres não numéricos (`,`, `.`, `R$`, etc.) são renderizados como `bd.isPlain` sem animação.

### 3.2 UI de seleção dos 4 estilos em Configurações (HTML + lógica)

Localização: Configurações → bloco "Aparência" → subseção "Capa do saldo" (linhas 839–847).

```html
<div style="padding:14px 0">
  <div style="font-size:14px;font-weight:500;margin-bottom:2px">Capa do saldo</div>
  <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Estilo do card principal do Início</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    <sc-for list="{{ heroStyleOptions }}" as="ho" hint-placeholder-count="4">
      <button onClick="{{ ho.onClick }}" style-active="transform:scale(.94)" style="{{ ho.style }};transition:all .15s">{{ ho.label }}</button>
    </sc-for>
  </div>
</div>
```

Dados (`render()`, linha 2313):
```js
heroStyleOptions:['Gradiente','Sólido','Mesh','Aurora'].map(v=>({
  label:v,
  onClick:()=>this.setHeroStyle(v),
  style:(s.heroStyle||'Gradiente')===v
    ? 'padding:7px 13px;border-radius:20px;background:var(--blue);color:#fff;font-size:12px;font-weight:600;border:none;cursor:pointer;white-space:nowrap'
    : 'padding:7px 13px;border-radius:20px;background:transparent;border:1px solid var(--border);color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap'
})),
```

Detalhamento:
- **Apresentação**: são **botões-pill (chips)** em fileira `flex-wrap`, gap `6px` — **não** são cards com preview visual do gradiente. O usuário só vê o **nome do estilo** ("Gradiente", "Sólido", "Mesh", "Aurora"), sem amostra prévia da aparência real do card hero.
- **Estado ativo** (estilo selecionado): pill preenchida — `background:var(--blue); color:#fff; font-weight:600; border:none`.
- **Estado inativo**: pill outline — `background:transparent; border:1px solid var(--border); color:var(--text2); font-weight:500`.
- Ambos: `padding:7px 13px; border-radius:20px; font-size:12px; cursor:pointer; white-space:nowrap`, mais `transition:all .15s` e `style-active="transform:scale(.94)"` (feedback de toque).
- Fallback: se `s.heroStyle` não estiver definido, assume `'Gradiente'` como padrão para determinar o estado ativo (`(s.heroStyle||'Gradiente')===v`).
- Método chamado:
```js
setHeroStyle(v){this.setState({heroStyle:v});this._persistSoon();}
```
Simplesmente seta `heroStyle` no estado e persiste (debounced).

### 3.3 Onde `heroStyle` é consumido para gerar os tokens

```js
buildTokens(themeName,accent,surface,mood,oled,heroStyle){
  ...
  const hs=heroStyle||'Gradiente';
  let heroBg,heroBorder;
  if(hs==='Sólido'){heroBg=bg2;heroBorder=border2;}
  else if(hs==='Mesh'){heroBg='radial-gradient(...)';heroBorder=accent+'44';}
  else if(hs==='Aurora'){heroBg='radial-gradient(...)';heroBorder=accent+'44';}
  else{heroBg='linear-gradient(160deg,'+accent+'22 0%,'+bg2+' 70%)';heroBorder=accent+'55';} // Gradiente (default)
  ...
  '--heroBg':heroBg,'--heroBorder':heroBorder
}
```
(Fórmulas completas de cada gradiente já extraídas anteriormente — não repetidas aqui conforme instrução. Confirmando apenas que `hs` tem fallback para `'Gradiente'` quando `heroStyle` é falsy, consistente com o fallback usado em `heroStyleOptions`.)

Chamada em `render()` (linha 1843): `const theme=this.buildTokens(effTheme,accent,surface,mood,s.oled,s.heroStyle);`

---

## 4. Estrutura de dados — persistência ("look"/config)

Localização: `persistLook()`, linha 1622.

```js
persistLook(){
  try{
    const s=this.state;
    localStorage.setItem('financas-app-look',JSON.stringify({
      theme:s.theme,
      accent:s.accent,
      mood:s.mood,
      surface:s.surface,
      oled:s.oled,
      autoTheme:s.autoTheme,
      heroStyle:s.heroStyle,
      pessoaColors:Object.fromEntries(s.pessoas.map(p=>[p.id,p.color]))
    }));
  }catch(e){}
}
```

Chave do localStorage: **`financas-app-look`**.

Objeto salvo (schema):
```json
{
  "theme": "dark | light",
  "accent": "#hex",
  "mood": "string (chave de DARK_MOOD/LIGHT_MOOD — fora de escopo)",
  "surface": "string (chave de surfaceOptions — fora de escopo)",
  "oled": true,
  "autoTheme": false,
  "heroStyle": "Gradiente | Sólido | Mesh | Aurora",
  "pessoaColors": { "<pessoaId>": "#hex", "...": "..." }
}
```

Observações importantes para portar:
- `heroStyle` é salvo como **string literal em português** (`'Gradiente'`, `'Sólido'`, `'Mesh'`, `'Aurora'`) — não é um enum numérico nem inglês. Se o app real usar outro idioma/enum internamente, precisa de mapeamento.
- **Não há array de presets salvo** — ao clicar num tema pronto (`applyPreset`), ele apenas decompõe o preset em `theme/mood/accent/surface/oled` e salva esses campos individuais (via `persistLook`), não uma referência ao preset em si (ex: não salva `"presetName": "Nome do Tema"`). Isso significa que reverter para "qual preset estava ativo" na reabertura do app é feito por **comparação de campos** (like em `presetOptions`, §1.3), não por um campo dedicado.
- `pessoaColors` é salvo como **mapa `id → hex`** separado do array de pessoas propriamente dito (que provavelmente é persistido em outro lugar do estado/dados financeiros, fora do escopo desta extração). Ao restaurar, o app precisa fazer merge desse mapa com a lista de pessoas carregada de outra fonte.
- Carregamento (linha 1565, dentro de outro método — provavelmente `restoreLook`/init):
```js
oled:!!L.oled, autoTheme:!!L.autoTheme, heroStyle:L.heroStyle||s.heroStyle,
```
Confirma fallback: se `L.heroStyle` (valor salvo) for falsy/ausente, mantém o `heroStyle` já presente no estado (que por sua vez tem default `'Gradiente'` no estado inicial, linha 1455: `heroStyle:'Gradiente'`).

### 4.1 Estado inicial relevante (linha 1455)

```js
oled:false, autoTheme:false, heroStyle:'Gradiente', splash:true, themeReveal:false,
```
Confirma defaults: `heroStyle` inicial é `'Gradiente'`.

---

## 5. Itens não encontrados / fora de escopo desta extração

- Definição/seed inicial completa do array `s.pessoas` (id, nome, cor inicial de cada pessoa) — não localizada nas buscas realizadas; se necessário, buscar separadamente.
- Definição da classe CSS `.ph-scroll` (provável estilização de scrollbar customizada para a fileira de presets) — não encontrada em `Financas App.dc.html` nem `support.js` nas buscas realizadas; pode estar em um `<style>` global não coberto por esta extração pontual.
- Lógica de `_fireReveal()` (efeito de transição ao trocar de tema) — mencionada em `applyPreset` mas não detalhada, fora do escopo solicitado (não é parte de 1b/1c/1d diretamente, é reação genérica a troca de tema).
- Lógica de `balColor` (cor do saldo positivo/negativo) e `hideValues`/`toggleHideValuesStop` — mencionadas no card hero mas não fazem parte do heroStyle propriamente dito; não detalhadas aqui.
