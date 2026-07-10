# Specs extraídas do protótipo de design — Fase 3 (Redesign de Cartões)

> Fonte:
> - `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\Financas App.dc.html`
> - `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\support.js`
>
> **Nota sobre `support.js`**: este arquivo é o runtime genérico do formato "Design Component" (`dc-runtime`) usado apenas para compilar/rodar o protótipo (parser de `{{ }}`, `sc-for`, `sc-if`, etc.). Não contém nenhuma lógica de domínio (cartões, faturas, timeline). Toda a lógica de domínio está no `<script data-dc-script>` dentro do próprio `Financas App.dc.html`. Por isso, todos os trechos de JS citados abaixo vêm do arquivo `.html`, não do `support.js`.
>
> Este documento é apenas extração/documentação — nenhuma implementação foi feita no app real.

---

## 1. Resumo no topo

### 1.1 Estrutura visual do resumo (total das faturas + próximo vencimento)

HTML, `Financas App.dc.html` linhas 430–441:

```html
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:12px">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <span style="font-size:12px;color:var(--text2)">Faturas de {{ monthName }}</span>
    <span style="font-size:14px;font-weight:600;font-family:'DM Mono',monospace;color:var(--red)">{{ faturasTotalStr }}</span>
  </div>
  <sc-if value="{{ hasNextVenc }}" hint-placeholder-val="{{ true }}">
    <div style="display:flex;align-items:center;gap:5px;margin-top:7px;padding-top:7px;border-top:1px dashed var(--border)">
      <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:var(--amber);fill:none;stroke-width:2;stroke-linecap:round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span style="font-size:11px;color:var(--text2)">{{ nextVencLabel }}</span>
    </div>
  </sc-if>
</div>
```

Estrutura: card com fundo `var(--bg2)`, borda `1px solid var(--border)`, `border-radius:14px`, `padding:12px 14px`.
- Linha superior: label "Faturas de {mês}" (cor `--text2`, 12px) à esquerda, valor total em `DM Mono`, 14px, weight 600, cor `--red` (`faturasTotalStr`), à direita.
- Linha inferior (condicional a `hasNextVenc`): separada por `border-top:1px dashed var(--border)`, ícone de relógio SVG cor `--amber`, texto `nextVencLabel` (11px, `--text2`).

### 1.2 Lógica de "empates agrupados" (ex: "Nubank + Itaú")

JS, `Financas App.dc.html` linhas 2011–2022 (cálculo do "próximo vencimento" do resumo topo):

```js
// próximo vencimento (resumo topo)
const todayV=new Date();
let nextVenc=null;
cartoesFiltered.forEach(ct=>{
  let d=new Date(todayV.getFullYear(),todayV.getMonth(),ct.vencimento);
  if(d<todayV)d=new Date(todayV.getFullYear(),todayV.getMonth()+1,ct.vencimento);
  const diff=Math.ceil((d-todayV)/86400000);
  if(!nextVenc||diff<nextVenc.diff)nextVenc={diff,names:[ct.name]};
  else if(diff===nextVenc.diff)nextVenc.names.push(ct.name); // empate: mesmos dias -> lista os dois
});
const nextVencNames=nextVenc?nextVenc.names.join(' + '):'';
const nextVencLabel=nextVenc?(nextVenc.diff===0?'Vence hoje · '+nextVencNames:nextVenc.diff===1?'Vence amanhã · '+nextVencNames:'Próximo venc. em '+nextVenc.diff+'d · '+nextVencNames):'';
```

Lógica exata:
1. Para cada cartão filtrado (`cartoesFiltered`), calcula a próxima data de vencimento a partir de hoje: monta `new Date(anoAtual, mesAtual, ct.vencimento)`; se essa data já passou (`d < todayV`), soma um mês (`new Date(anoAtual, mesAtual+1, ct.vencimento)`).
2. `diff` = diferença em dias inteiros arredondada para cima (`Math.ceil((d-todayV)/86400000)`).
3. Mantém um acumulador `nextVenc = {diff, names: [...]}`:
   - Se ainda não há `nextVenc` OU o `diff` do cartão atual é **menor** que o menor já visto → substitui `nextVenc` (novo menor, lista de nomes reinicia com só esse cartão).
   - Se o `diff` é **igual** (`===`) ao menor já visto → **empate**: dá `push` do nome do cartão no array `names` existente (não substitui, acumula).
4. `nextVencNames` = `nextVenc.names.join(' + ')` → gera exatamente o formato `"Nubank + Itaú"` quando há 2+ cartões empatados no mesmo `diff`.
5. Label final (`nextVencLabel`) varia por `diff`:
   - `diff === 0` → `"Vence hoje · " + nextVencNames`
   - `diff === 1` → `"Vence amanhã · " + nextVencNames`
   - caso contrário → `"Próximo venc. em " + diff + "d · " + nextVencNames`

Observação: a mesma lógica de "menor diff com empate acumulando nomes" se repete em outro lugar do app (para alertas do dashboard, linhas 2220–2226), mas ali o acumulador guarda só o cartão mais próximo (`nearestCard`) sem lista de nomes — não é o mesmo bloco do resumo de Cartões. Não incluído aqui por não ser a tela de Cartões.

---

## 2. Cards colapsáveis

### 2.1 Estrutura HTML/CSS — colapsado vs expandido

HTML completo do item do `sc-for` de cartões, `Financas App.dc.html` linhas 450–524:

```html
<sc-for list="{{ cardList }}" as="c" hint-placeholder-count="2">
  <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;margin-bottom:12px;overflow:hidden;animation:listItemIn .34s cubic-bezier(.16,1,.3,1) both;animation-delay:{{ c.entryDelay }}">
    <!-- cabeçalho estilo cartão físico (sempre visível; toque expande/colapsa) -->
    <div onClick="{{ c.onToggleExpand }}" style-active="opacity:.88" style="position:relative;background:{{ c.headerGrad }};padding:14px 16px 12px;cursor:pointer;transition:opacity .15s">
      <div style="position:absolute;top:12px;right:14px;display:flex;align-items:center;gap:8px">
        <sc-if value="{{ c.hasPessoa }}" hint-placeholder-val="{{ true }}"><span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px 2px 3px;border-radius:20px;background:rgba(0,0,0,.25);font-size:10px;color:#fff"><span style="width:15px;height:15px;border-radius:50%;background:{{ c.pessoaColor }};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff">{{ c.pessoaInitial }}</span>{{ c.pessoaName }}</span></sc-if>
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;transition:transform .28s cubic-bezier(.34,1.56,.64,1);transform:{{ c.chevron }}"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div style="width:30px;height:22px;border-radius:5px;background:linear-gradient(135deg,rgba(255,255,255,.75),rgba(255,255,255,.35));margin-bottom:10px;display:flex;align-items:center;justify-content:center"><div style="width:18px;height:12px;border-radius:2px;border:1.5px solid rgba(0,0,0,.25)"></div></div>
      <div style="font-size:16px;font-weight:700;color:#fff;letter-spacing:.2px;text-shadow:0 1px 3px rgba(0,0,0,.3)">{{ c.name }}</div>
      <div style="font-size:10px;color:rgba(255,255,255,.85);margin-top:2px">{{ c.dates }}</div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:10px">
        <div><div style="font-size:10px;color:rgba(255,255,255,.8)">Fatura {{ c.faturaLabel }}</div><div style="font-size:21px;font-weight:600;font-family:'DM Mono',monospace;color:#fff;letter-spacing:-.5px;text-shadow:0 1px 3px rgba(0,0,0,.3)">{{ c.totalStr }}</div></div>
        <div style="text-align:right"><div style="font-size:10px;color:rgba(255,255,255,.8)">Disponível</div><div style="font-size:13px;font-weight:600;font-family:'DM Mono',monospace;color:#fff">{{ c.dispStr }}</div></div>
      </div>
    </div>
    <!-- corpo (limite + gastos) -->
    <div style="padding:12px 16px 16px">
      <div style="height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:5px"><div style="height:100%;width:{{ c.limitePct }};background:{{ c.limiteColor }};transition:width .5s cubic-bezier(.4,0,.2,1),background .3s;border-radius:3px"></div></div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:11px;color:var(--text3)">{{ c.usadoStr }}</span>
        <sc-if value="{{ c.isCollapsed }}" hint-placeholder-val="{{ false }}"><span style="font-size:11px;color:var(--text3)">{{ c.gastoCount }}</span></sc-if>
      </div>
      <sc-if value="{{ c.isExpanded }}" hint-placeholder-val="{{ true }}">
      <div style="margin-top:12px">
        <!-- ... timeline por dia (ver seção 3) ... -->
        <!-- botões "Ver mais", "Editar cartão", "+ Gasto", bloco de recorrências, "+ Recorrência mensal" -->
      </div>
      </sc-if>
    </div>
  </div>
</sc-for>
```

Observações de estrutura:
- **Sempre visível** (colapsado ou expandido): o cabeçalho estilo "cartão físico" completo (chip, nome, datas, fatura + disponível) e a barra de limite com `usadoStr`.
- **Só no estado colapsado** (`c.isCollapsed`): mostra `c.gastoCount` (ex: "3 gasto(s)") ao lado da barra de limite.
- **Só no estado expandido** (`c.isExpanded`): mostra o bloco `<div style="margin-top:12px">` inteiro com a timeline por dia, botão "Ver mais", botões "Editar cartão" / "+ Gasto", bloco de recorrências mensais e botão "+ Recorrência mensal".
- O card inteiro (wrapper) tem `background:var(--bg2)`, `border:1px solid var(--border)`, `border-radius:16px`, `overflow:hidden`, `margin-bottom:12px`.
- O clique que expande/colapsa é no `onClick` do `<div>` do cabeçalho inteiro (`c.onToggleExpand`), não em um botão separado — a área clicável é todo o cabeçalho gradiente.
- O chevron (seta `▼`) gira via `transform:{{ c.chevron }}` — ver seção 2.4.

### 2.2 Gradiente do cabeçalho e "chip"

**Gradiente do cabeçalho** — JS, `Financas App.dc.html` linha 2008 (dentro do `.map` de `cardList`):

```js
headerGrad:'linear-gradient(135deg,'+ct.color+'e8 0%,'+ct.color+'80 60%,'+ct.color+'50 100%)',
```

Isto é: `linear-gradient(135deg, {corDoCartão}E8 0%, {corDoCartão}80 60%, {corDoCartão}50 100%)`. `ct.color` é uma cor hex de 6 dígitos (ex: `#a855f7`) e os sufixos `e8`, `80`, `50` são canais alpha hex de 2 dígitos concatenados (opacidade ~91%, ~50%, ~31%, respectivamente). Aplicado como `background` do `<div>` do cabeçalho (linha 453):

```html
<div onClick="{{ c.onToggleExpand }}" style-active="opacity:.88" style="position:relative;background:{{ c.headerGrad }};padding:14px 16px 12px;cursor:pointer;transition:opacity .15s">
```

Cores base disponíveis para cartões (`CART_COLORS`), linha 1449:
```js
const CART_COLORS=['#a855f7','#ff7a00','#22c55e','#ec4899','#3b82f6','#14b8a6','#ef4444','#eab308'];
```

**"Chip"** (retângulo estilo chip de cartão físico) — HTML, linha 458:

```html
<div style="width:30px;height:22px;border-radius:5px;background:linear-gradient(135deg,rgba(255,255,255,.75),rgba(255,255,255,.35));margin-bottom:10px;display:flex;align-items:center;justify-content:center"><div style="width:18px;height:12px;border-radius:2px;border:1.5px solid rgba(0,0,0,.25)"></div></div>
```

Propriedades exatas do chip:
- Container externo: `width:30px; height:22px; border-radius:5px; background:linear-gradient(135deg, rgba(255,255,255,.75), rgba(255,255,255,.35)); margin-bottom:10px; display:flex; align-items:center; justify-content:center`.
- Detalhe interno (linhas do chip): `width:18px; height:12px; border-radius:2px; border:1.5px solid rgba(0,0,0,.25)` (sem background — apenas borda).

Valores em branco no cabeçalho (fatura + disponível), linha 462:
```html
<div><div style="font-size:10px;color:rgba(255,255,255,.8)">Fatura {{ c.faturaLabel }}</div><div style="font-size:21px;font-weight:600;font-family:'DM Mono',monospace;color:#fff;letter-spacing:-.5px;text-shadow:0 1px 3px rgba(0,0,0,.3)">{{ c.totalStr }}</div></div>
<div style="text-align:right"><div style="font-size:10px;color:rgba(255,255,255,.8)">Disponível</div><div style="font-size:13px;font-weight:600;font-family:'DM Mono',monospace;color:#fff">{{ c.dispStr }}</div></div>
```
- Valor da fatura: 21px, weight 600, `DM Mono`, `color:#fff`, `letter-spacing:-.5px`, `text-shadow:0 1px 3px rgba(0,0,0,.3)`.
- Valor disponível: 13px, weight 600, `DM Mono`, `color:#fff` (sem text-shadow).
- Labels ("Fatura {mês}", "Disponível"): 10px, `color:rgba(255,255,255,.8)`.
- Nome do cartão (`c.name`), linha 459: `font-size:16px; font-weight:700; color:#fff; letter-spacing:.2px; text-shadow:0 1px 3px rgba(0,0,0,.3)`.
- Datas (`c.dates`, ex: "Fecha dia 3 · Vence dia 10"), linha 460: `font-size:10px; color:rgba(255,255,255,.85); margin-top:2px`.

### 2.3 Regra "primeiro aberto" (qual cartão vem expandido por padrão)

JS, `Financas App.dc.html` linha 1458 (estado inicial):

```js
expandedCards:{1:true}, showAllGastos:{},
```

E o cálculo de `isExpanded` por cartão, linha 2005:
```js
const isExpanded=!!s.expandedCards[ct.id];
```

Lógica exata: **não é "o primeiro cartão da lista" dinamicamente** — é hardcoded no estado inicial como `expandedCards:{1:true}`, ou seja, o cartão cujo `id === 1` vem expandido por padrão (no dataset de exemplo, isso é o cartão "Nubank", que também é o primeiro item do array `cartoes` inicial — ver linha 1483). Qualquer outro cartão criado depois começa colapsado (`expandedCards[id]` é `undefined` → falsy). O toggle de expandir/colapsar é feito por `toggleCardExpand`, linha 1638:

```js
toggleCardExpand(id){this.setState(s=>({expandedCards:{...s.expandedCards,[id]:!s.expandedCards[id]}}));}
```

Isso permite múltiplos cartões expandidos simultaneamente (não é acordeão exclusivo) — cada `id` tem sua própria flag booleana independente no mapa `expandedCards`.

### 2.4 Transição/animação ao expandir ("transição hero")

Não há uma "transição hero" nomeada explicitamente nem animação de altura (`height`/`max-height` transition) para o corpo expansível — o conteúdo expandido/colapsado é feito via `sc-if` (monta/desmonta o DOM), sem transição de altura animada. As transições/animações presentes relacionadas ao expandir são:

1. **Chevron (seta) gira ao expandir**, linha 456:
```css
transition:transform .28s cubic-bezier(.34,1.56,.64,1);transform:{{ c.chevron }}
```
Onde `c.chevron` (linha 2007): `chevron:isExpanded?'rotate(180deg)':'rotate(0deg)'`.

2. **Cabeçalho tem leve feedback de toque** (não é uma transição de expansão, é hover/active feedback), linha 453:
```css
style-active="opacity:.88" style="...transition:opacity .15s"
```
(`style-active` é um pseudo-estado do protótipo — aplica esse estilo quando pressionado/ativo.)

3. **Entrada do card na lista** (animação de entrada quando a lista é renderizada, não de expand/collapse), linha 451:
```css
animation:listItemIn .34s cubic-bezier(.16,1,.3,1) both;animation-delay:{{ c.entryDelay }}
```
Keyframe `listItemIn` (linha 26 do `<style>` global):
```css
@keyframes listItemIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
```
`c.entryDelay` = `(cti*45)+'ms'` (linha 2006) — atraso escalonado por índice do cartão na lista (efeito "stagger").

4. **Barra de limite de crédito** anima a largura ao mudar (não é a expansão do card, mas está no corpo sempre visível), linha 468:
```css
transition:width .5s cubic-bezier(.4,0,.2,1),background .3s;border-radius:3px
```

Conclusão: **não encontrado** nenhum "hero transition" dedicado (tipo FLIP/shared-element) para o corpo expandir/colapsar — a transição visual é limitada ao giro do chevron; o corpo aparece/desaparece via `sc-if` (mount/unmount condicional), sem animação de altura.

---

## 3. Timeline por dia dentro da fatura

### 3.1 Estrutura de agrupamento por dia

JS, `Financas App.dc.html` linhas 1990–2004 (dentro do `.map` de `cardList`, dado um cartão `ct`):

```js
// timeline por dia: agrupa avulsos por data (desc); sem data = "Sem data"
const sortedAv=[...avulsos].sort((a,b)=>(b.date||'')>(a.date||'')?1:(b.date||'')<(a.date||'')?-1:b.id-a.id);
const showAll=!!s.showAllGastos[ct.id];
const LIMIT=5;
const visible=showAll?sortedAv:sortedAv.slice(0,LIMIT);
const hiddenCount=sortedAv.length-visible.length;
const groupsMap={};const groupsOrder=[];
visible.forEach(g=>{const k=g.date||'sem';if(!groupsMap[k]){groupsMap[k]=[];groupsOrder.push(k);}groupsMap[k].push(g);});
const dayGroups=groupsOrder.map((k,gi2)=>{
  const items=groupsMap[k];
  const dTot=items.reduce((a,g)=>a+g.value,0);
  return{dateLabel:k==='sem'?'Sem data':this.fmtDate(k).slice(0,5),countStr:items.length+(items.length>1?' gastos':' gasto'),totStr:'−'+this.fmt(dTot),
    items:items.map((g,gi)=>({name:g.name,valStr:'−'+this.fmt(g.value),parcela:(g.parcela&&g.totalParcelas)?(g.parcela+'/'+g.totalParcelas):'',hasParcela:!!(g.parcela&&g.totalParcelas),hasSubs:!!(g.subitems&&g.subitems.length),subs:(g.subitems||[]).map(x=>({name:x.name,valStr:this.fmt(x.value)})),onEdit:()=>this.openGasto(ct.id,g.id),entryDelay:(gi*30)+'ms'})),
    entryDelay:(gi2*40)+'ms'};
});
```

Lógica de agrupamento passo a passo:
1. `avulsos` = gastos do cartão que **não são** recorrência (`gs.filter(g=>!g.rec)`) — recorrências (`recs`) têm bloco separado, fora da timeline (seção "Recorrências mensais").
2. `sortedAv` = `avulsos` ordenado por `date` **decrescente** (mais recente primeiro); em caso de mesma data, desempate por `id` decrescente. Itens sem `date` (`''`/`undefined`) ficam no fim (string vazia é "menor" que qualquer data no comparador).
3. **Corte de "Ver mais"**: `LIMIT = 5`. Se `showAllGastos[ct.id]` for `true`, mostra todos (`sortedAv`); caso contrário mostra só os primeiros 5 (`sortedAv.slice(0,5)`). `hiddenCount` = quantos ficaram escondidos.
4. **Agrupamento por dia**: itera sobre `visible` (já limitado a 5 ou todos) e agrupa num objeto `groupsMap` cuja chave `k` é `g.date || 'sem'` (gastos sem data caem no grupo especial `'sem'`). `groupsOrder` preserva a ordem de primeira aparição de cada chave (que já está em ordem desc por causa do sort anterior).
5. Cada grupo (`dayGroups`) contém: `dateLabel` (data formatada `dd/mm`, ou `"Sem data"` se `k==='sem'` — nota: `fmtDate(k).slice(0,5)` pega os 5 primeiros chars do formato de data, presumivelmente `dd/mm/yyyy` → `dd/mm`), `countStr` (ex: "3 gastos" / "1 gasto" — singular/plural condicional), `totStr` (subtotal do dia, formatado como moeda negativa `−R$...`), e `items` (array de gastos daquele dia).

### 3.2 Badge roxa de parcela (ex "2/5")

HTML, `Financas App.dc.html` linha 488:

```html
<sc-if value="{{ g.hasParcela }}" hint-placeholder-val="{{ false }}"><span style="display:inline-flex;padding:1px 7px;border-radius:20px;background:var(--purple-bg);border:1px solid var(--purple-border);color:var(--purple);font-size:10px;font-weight:600">{{ g.parcela }}</span></sc-if>
```

CSS exato do badge:
- `display:inline-flex`
- `padding:1px 7px`
- `border-radius:20px` (formato pílula)
- `background:var(--purple-bg)`
- `border:1px solid var(--purple-border)`
- `color:var(--purple)`
- `font-size:10px`
- `font-weight:600`

Valores das variáveis CSS (`Financas App.dc.html` linhas 1447–1448):
```js
// tema escuro
'--purple':'#a78bfa','--purple-bg':'#1a0d3d','--purple-border':'#2a1a4a'
// tema claro
'--purple':'#6d3fdc','--purple-bg':'#f0ebff','--purple-border':'#c8b0f8'
```

Conteúdo do badge (`g.parcela`), calculado na linha 2002:
```js
parcela:(g.parcela&&g.totalParcelas)?(g.parcela+'/'+g.totalParcelas):'',
hasParcela:!!(g.parcela&&g.totalParcelas),
```
Ou seja, só aparece (`hasParcela=true`) quando o gasto tem **ambos** `g.parcela` e `g.totalParcelas` preenchidos; o texto é `"{parcelaAtual}/{totalParcelas}"` (ex: `"2/5"`).

### 3.3 Lógica de "Ver mais N gastos" (corte acima de 5 itens)

JS, `Financas App.dc.html` linhas 1992–1995 (mesmo bloco citado em 3.1) + linha 2009:

```js
const showAll=!!s.showAllGastos[ct.id];
const LIMIT=5;
const visible=showAll?sortedAv:sortedAv.slice(0,LIMIT);
const hiddenCount=sortedAv.length-visible.length;
// ...
dayGroups,hasHidden:hiddenCount>0,showAllLabel:showAll?'Mostrar menos':'Ver mais '+hiddenCount+' gasto'+(hiddenCount>1?'s':''),onToggleShowAll:()=>this.toggleShowAllGastos(ct.id),
```

Toggle de estado, linha 1639:
```js
toggleShowAllGastos(id){this.setState(s=>({showAllGastos:{...s.showAllGastos,[id]:!s.showAllGastos[id]}}));}
```

HTML do botão, linha 497–499:
```html
<sc-if value="{{ c.hasHidden }}" hint-placeholder-val="{{ false }}">
  <button onClick="{{ c.onToggleShowAll }}" style-active="transform:scale(.98);background:var(--bg4)" style="width:100%;margin-top:10px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);border-radius:9px;padding:9px;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .1s">{{ c.showAllLabel }}</button>
</sc-if>
```

Mecânica exata:
1. Estado por cartão em `showAllGastos` (mapa `{ [cartaoId]: boolean }`), independente por cartão, análogo ao `expandedCards`.
2. Por padrão (`showAll=false`), a lista de gastos avulsos ordenada (`sortedAv`) é cortada nos primeiros 5 (`LIMIT=5`) **antes** de agrupar por dia — ou seja, o corte é sobre a lista plana de gastos, não sobre os grupos-dia (um dia pode ficar parcialmente exibido se o corte cair no meio dele).
3. `hasHidden = hiddenCount > 0` controla se o botão aparece.
4. Label do botão: quando colapsado → `"Ver mais " + hiddenCount + " gasto" + (plural se >1)"` (ex: "Ver mais 3 gastos"); quando expandido (`showAll=true`) → `"Mostrar menos"`.
5. Clique (`onToggleShowAll`) chama `toggleShowAllGastos(ct.id)`, que inverte o booleano daquele cartão no mapa — re-render então recalcula `visible`/`dayGroups` com a lista completa.
6. O botão fica **abaixo** de todos os grupos-dia renderizados (depois do `sc-for` de `dayGroups`, linha 497, antes do rodapé com "Editar cartão"/"+ Gasto").

### 3.4 Como subitens aparecem na timeline (estrutura HTML)

HTML, `Financas App.dc.html` linhas 485–492 (item de gasto dentro de um dia, incluindo subitens):

```html
<sc-for list="{{ dg.items }}" as="g" hint-placeholder-count="2">
  <div onClick="{{ g.onEdit }}" style-active="transform:scale(.98)" style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px 12px;cursor:pointer;transition:transform .15s;animation:listItemIn .28s cubic-bezier(.16,1,.3,1) both;animation-delay:{{ g.entryDelay }}">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="flex:1;display:flex;align-items:center;gap:7px;min-width:0"><span style="font-size:13px;font-weight:500">{{ g.name }}</span><sc-if value="{{ g.hasParcela }}" hint-placeholder-val="{{ false }}"><span style="display:inline-flex;padding:1px 7px;border-radius:20px;background:var(--purple-bg);border:1px solid var(--purple-border);color:var(--purple);font-size:10px;font-weight:600">{{ g.parcela }}</span></sc-if></div>
      <div style="font-size:13px;font-weight:600;font-family:'DM Mono',monospace;color:var(--red);flex-shrink:0">{{ g.valStr }}</div>
    </div>
    <sc-if value="{{ g.hasSubs }}" hint-placeholder-val="{{ false }}"><div style="margin-top:6px;border-top:1px dashed var(--border);padding-top:6px;display:flex;flex-direction:column;gap:3px"><sc-for list="{{ g.subs }}" as="sb" hint-placeholder-count="2"><div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--text2);font-family:'DM Mono',monospace"><span>{{ sb.name }}</span><span>{{ sb.valStr }}</span></div></sc-for></div></sc-if>
  </div>
</sc-for>
```

Estrutura:
- Card do gasto (`background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:9px 12px`), clicável (`onClick={{g.onEdit}}` → abre modal de edição do gasto).
- Linha superior: nome do gasto (13px, weight 500) + badge de parcela opcional (seção 3.2) à esquerda; valor (`g.valStr`, 13px, weight 600, `DM Mono`, `color:var(--red)`) à direita, `flex-shrink:0`.
- Bloco de subitens (`g.hasSubs`, condicional): aparece **abaixo** da linha principal, separado por `border-top:1px dashed var(--border)` + `padding-top:6px` + `margin-top:6px`; é uma coluna (`flex-direction:column;gap:3px`) de linhas `<div>` com `justify-content:space-between` — cada subitem mostra `sb.name` à esquerda e `sb.valStr` à direita, `font-size:11px`, `color:var(--text2)`, `font-family:'DM Mono',monospace`. Não há indentação adicional além do `margin-top`/`border-top` — os subitens não têm ícone, bullet ou recuo horizontal.

Dados dos subitens (`g.subs`), calculados na linha 2002:
```js
hasSubs:!!(g.subitems&&g.subitems.length),
subs:(g.subitems||[]).map(x=>({name:x.name,valStr:this.fmt(x.value)})),
```
Exemplo de dado-fonte (linha 1487): `subitems:[{name:'Fone bluetooth',value:320},{name:'Capa do celular',value:120},{name:'Cabo USB-C',value:100}]`.

---

## Resumo do que NÃO foi encontrado
- Não há "transição hero" (shared-element / FLIP / animação de altura) para o corpo expandir — apenas o giro do chevron (`.28s cubic-bezier(.34,1.56,.64,1)`) e mount/unmount via `sc-if`.
- A regra do "primeiro aberto" não é dinâmica ("primeiro item da lista") — é um valor hardcoded no estado inicial (`expandedCards:{1:true}`, ou seja, cartão de `id===1`).
