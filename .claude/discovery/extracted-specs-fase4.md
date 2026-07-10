# Especificação Extraída — FASE 4: Novas Visões

> Fonte: protótipo de design (referência visual/comportamental, não código de produção)
> - `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\Financas App.dc.html`
> - `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\support.js`
>
> `support.js` é o runtime genérico do framework de prototipagem (parser de template, pseudo-stylesheet, etc.) — **não contém lógica de negócio**. Toda a lógica de negócio das seções abaixo está inline no `<script>` do próprio `Financas App.dc.html` (linhas ~1500–2430), num método único de render/state.
>
> Convenção de cores no protótipo (CSS vars): `G` = `var(--green)`, `R` = `var(--red)` (variáveis JS internas `G`/`R` mapeiam pra essas). Datas em ISO `YYYY-MM-DD`. `s` = state; `rows` = transações do mês/pessoa filtrados; `c` = `this.calc(rows)`.

---

## 1. Calendário mensal em Lançamentos (B5)

### Toggle lista/calendário

Estrutura visual (HTML, linhas 275–282, duplicada no modo cal em 351–358):

```html
<div style="display:flex;align-items:center;height:32px;padding:3px;gap:2px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;flex-shrink:0">
  <button onClick="{{ setListView }}" style="width:25px;height:25px;...background:{{ listViewBg }};color:{{ listViewColor }}">
    <svg><!-- ícone de lista (3 linhas) --></svg>
  </button>
  <button onClick="{{ setCalendarView }}" style="width:25px;height:25px;...background:{{ calViewBg }};color:{{ calViewColor }}">
    <svg><!-- ícone de calendário (grade) --></svg>
  </button>
</div>
```

Estado: `s.calView` é `'list'` ou `'cal'`. Ao trocar de view, a seleção de dia é limpa:

```js
setCalView(v){this.setState({calView:v,calSelectedDay:null});}
const isListView=s.calView==='list', isCalView=s.calView==='cal';
const setListView=()=>this.setCalView('list'), setCalendarView=()=>this.setCalView('cal');
const listViewBg=isListView?'var(--blue)':'transparent', listViewColor=isListView?'#fff':'var(--text3)';
const calViewBg=isCalView?'var(--blue)':'transparent', calViewColor=isCalView?'#fff':'var(--text3)';
```

O filtro de pessoa (`txPessoaFilters`) aparece nos dois modos, ao lado do toggle.

### Grade do calendário

HTML (linhas 366–386):

```html
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px">
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">
    <!-- calWeekdays: 'D','S','T','Q','Q','S','S' -->
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
    <!-- calCells: células vazias (padding do 1º dia da semana) + células preenchidas -->
    <button style="height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:10px;{{ cell.cellStyle }}">
      <span style="font-size:12px;font-weight:{{ cell.dayWeight }}">{{ cell.day }}</span>
      <div style="display:flex;gap:2px;height:4px">
        <!-- pontinho verde (hasIn) -->
        <!-- pontinho vermelho (hasOut) -->
      </div>
    </button>
  </div>
</div>
```

Construção dos dados (linhas 1926–1953), **cálculo exato dos pontinhos**:

```js
const calWeekdays=['D','S','T','Q','Q','S','S'];
const calDaysInMonth=new Date(s.year,s.month+1,0).getDate();
const calFirstWeekday=new Date(s.year,s.month,1).getDay();
const calDayInfo={};
rows.forEach(t=>{
  if(!t.date)return;
  if(!calDayInfo[t.date])calDayInfo[t.date]={in:false,out:false};
  if(t.type==='income')calDayInfo[t.date].in=true;
  else calDayInfo[t.date].out=true;
});
const todayC=new Date();todayC.setHours(0,0,0,0);
const calCells=[];
for(let i=0;i<calFirstWeekday;i++)calCells.push({isEmpty:true,isFilled:false});
for(let dd=1;dd<=calDaysInMonth;dd++){
  const iso=s.year+'-'+String(s.month+1).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
  const info=calDayInfo[iso];
  const dDate=new Date(s.year,s.month,dd);dDate.setHours(0,0,0,0);
  const isToday=dDate.getTime()===todayC.getTime();
  const isSelected=s.calSelectedDay===iso;
  let cellStyle;
  if(isSelected)cellStyle='background:var(--blue);color:#fff;border:1px solid var(--blue)';
  else if(isToday)cellStyle='background:var(--bg4);color:var(--text);border:1.5px solid var(--blue)';
  else cellStyle='background:var(--bg3);color:var(--text);border:1px solid transparent';
  calCells.push({
    isEmpty:false,isFilled:true,day:dd,cellStyle,
    dayWeight:(isToday||isSelected)?'700':'500',
    hasIn:!!(info&&info.in), hasOut:!!(info&&info.out),
    inDotColor:isSelected?'rgba(255,255,255,.9)':G,
    outDotColor:isSelected?'rgba(255,255,255,.65)':R,
    onClick:()=>this.selectCalDay(iso)
  });
}
const calEmptyMonth=Object.keys(calDayInfo).length===0;
```

**Regra dos pontinhos**: para cada dia, verifica-se se existe pelo menos 1 transação com `date` igual àquele dia no mês/pessoa filtrado (`rows`, já filtrado por pessoa). Se houver alguma transação `type==='income'` naquele dia → pontinho verde (`hasIn`). Se houver alguma transação de tipo diferente de income (`fixed`/`variable`/`credit`) → pontinho vermelho (`hasOut`). Um dia pode ter os dois pontinhos simultaneamente (mistura de entrada e saída). **Importante**: só entram no cálculo transações com `date` preenchido — lançamentos sem data não aparecem no calendário. `calEmptyMonth` é true quando nenhuma transação do mês tem `date`.

Cor "hoje": borda azul 1.5px + fundo `var(--bg4)`, peso da fonte 700. Cor "selecionado": fundo azul sólido, texto branco. Célula normal: fundo `var(--bg3)`, borda transparente.

### Toque no dia

Não é modal nem sheet — é uma **seção expandida inline**, abaixo da grade, condicionada a `hasCalSelection` (linhas 387–399):

```js
selectCalDay(iso){this.setState(s=>({calSelectedDay:s.calSelectedDay===iso?null:iso}));}
```
Clicar de novo no mesmo dia desmarca (toggle). Trocar de mês/view limpa a seleção.

```js
const hasCalSelection=!!s.calSelectedDay;
const calSelectedLabel=s.calSelectedDay?this.fmtDate(s.calSelectedDay):''; // fmtDate: 'DD/MM/YYYY'
const calDayTxList=s.calSelectedDay?rows.filter(t=>t.date===s.calSelectedDay).map(t=>({
  name:t.name,
  valStr:(t.type==='income'?'+':'−')+this.fmt(t.value),
  color:t.type==='income'?G:R,
  onEdit:()=>this.openTx(t.id)
})):[];
```

HTML da seção expandida:

```html
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px;animation:listItemIn .26s ...">
  <div style="font-size:12px;color:var(--text2);margin-bottom:10px;font-weight:600">{{ calSelectedLabel }}</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <!-- para cada tx do dia: linha clicável com nome + valor colorido, onClick abre modal de edição (openTx) -->
    <div onClick="{{ ct.onEdit }}" style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px 12px;cursor:pointer">
      <span style="flex:1;font-size:13px;font-weight:500;...">{{ ct.name }}</span>
      <span style="font-size:13px;font-weight:600;font-family:'DM Mono',monospace;color:{{ ct.color }}">{{ ct.valStr }}</span>
    </div>
  </div>
</div>
```

Estado vazio de calendário (`calEmptyMonth`, quando nenhuma tx do mês tem data): ícone 📅 + texto "Nenhum lançamento com data neste mês" + subtexto explicando que só tx com data aparecem no calendário + botão "+ Novo lançamento".

---

## 2. Relatório mensal (nova tela `report`, link no Dashboard)

Navegação: `goReport:()=>this.nav('report')`. Link no Dashboard (linhas 246–255): card clicável com ícone de gráfico de barras, título "Relatório de {{ monthName }}", subtítulo "Retrospectiva, recordes e evolução patrimonial". A ordem de nav inclui `'report'` no array: `['dash','tx','cards','proj','budget','cfg','report']` — usado só para decidir a direção da animação de transição de tela, `'report'` não faz parte da bottom nav (é acessado só pelo link do Dashboard, com botão "Voltar" próprio no topo, igual às Configurações).

Header da tela (linhas 871–875): botão "Voltar" (`goDash`) + título "Relatório · {{ monthShort }}" (mês corrente, mesmo mês selecionado em Lançamentos/Orçamento) + spacer.

### Comparado ao mês anterior — mini-tabela (3 cards lado a lado)

HTML (linhas 877–891): título "Comparado a {{ prevMonthName }}", depois `display:flex;gap:10px` com 3 cards (`reportCompare`), cada um com label, valor atual (compacto) e uma linha de delta com seta.

Lógica (linhas 1866–1880):

```js
const prevM=s.month-1<0?11:s.month-1, prevY=s.month-1<0?s.year-1:s.year;
const prevMonthName=MONTHS[prevM];
const prevRowsR=s.txs.filter(t=>t.year===prevY&&t.month===prevM&&(!s.pessoaFilter||t.pessoaId===s.pessoaFilter));
const prevCR=this.calc(prevRowsR);
const pctDelta=(cur,prev)=>{if(prev===0)return cur===0?0:100;return Math.round((cur-prev)/Math.abs(prev)*100);};
const prevHasData=prevRowsR.length>0;
const incDelta=pctDelta(c.income,prevCR.income), outDelta=pctDelta(c.out,prevCR.out), balDelta=pctDelta(c.balance,prevCR.balance);
const reportCompare=[
  {label:'Receitas',curStr:'R$ '+this.fmtCompact(c.income),d:incDelta,goodUp:true},
  {label:'Gastos',curStr:'R$ '+this.fmtCompact(c.out),d:outDelta,goodUp:false},
  {label:'Saldo',curStr:(c.balance<0?'−':'')+'R$ '+this.fmtCompact(Math.abs(c.balance)),d:balDelta,goodUp:true},
].map(x=>({
  label:x.label, curStr:x.curStr,
  deltaStr:prevHasData ? ((x.d>=0?'+':'')+x.d+'%') : 'sem dados em '+prevMonthName.toLowerCase(),
  arrowColor:prevHasData ? ((x.d>=0)===x.goodUp?G:R) : 'var(--text3)',
  arrowRotate:x.d>=0?'rotate(0deg)':'rotate(180deg)',
  hasArrow:prevHasData
}));
```

**3 campos comparados**: Receitas, Gastos, Saldo. `c` = `this.calc(rows)` do mês corrente (já filtrado por pessoa). `curStr` usa `fmtCompact` (ex: "1.2k"), com prefixo `R$ ` manual.

**Cálculo do delta**: `% = round((atual - anterior) / abs(anterior) * 100)`. Caso especial: se o mês anterior for zero, delta é 0% se atual também for zero, senão 100%.

**"Sem setas quando não há dados"**: controlado por `prevHasData = prevRowsR.length>0` (mês anterior sem NENHUMA transação, considerando o filtro de pessoa ativo). Quando `false`:
- `hasArrow` é `false` → a seta SVG não é renderizada (`<sc-if value="{{ rc.hasArrow }}">`).
- `deltaStr` vira o texto literal `"sem dados em " + nome do mês anterior em minúsculas` (ex: "sem dados em maio"), em vez da porcentagem.
- `arrowColor` cai para `var(--text3)` (cinza neutro).

**Cor da seta quando há dados**: verde (`G`) se `(delta >= 0) === goodUp`, senão vermelho (`R`). "Receitas" e "Saldo" têm `goodUp:true` (subir é bom), "Gastos" tem `goodUp:false` (subir é ruim, então delta positivo em Gastos pinta a seta de vermelho). Rotação da seta: 0° se delta≥0 (aponta pra cima), 180° se negativo (aponta pra baixo) — mesmo SVG de seta-pra-cima é rotacionado.

### Top 5 gastos (Maiores gastos do mês)

Lógica (linha 1882):

```js
const topGastos=[...rows].filter(t=>t.type!=='income').sort((a,b)=>b.value-a.value).slice(0,5).map((t,i)=>({
  rank:i+1, name:t.name, valStr:this.fmt(t.value)
}));
const hasTopGastos=topGastos.length>0, hasTopGastosEmpty=!hasTopGastos;
```

**Lógica de ordenação/seleção**: pega todas as transações do mês corrente (já filtradas por pessoa, `rows`) exceto tipo `income`, ordena por `value` decrescente, pega as 5 primeiras. Não deduplica por nome — são as 5 transações individuais de maior valor (não agregado por categoria/nome). Exibição: círculo com rank (1–5), nome (truncado com ellipsis), valor com prefixo "−" em vermelho. Estado vazio: "Sem gastos neste mês".

### % por categoria (Por categoria)

Só aparece se houver categorias com gasto no mês (`hasReportCategorias`). Lógica (linhas 1885–1891):

```js
const catTotalR=s.budgets.filter(b=>b.categoriaKey).reduce((a,cat)=>a+this.calcCategoriaRealizado(cat.id),0);
const reportCategorias=s.budgets.filter(b=>b.categoriaKey).map(cat=>{
  const real=this.calcCategoriaRealizado(cat.id);
  const pct=catTotalR>0?Math.round(real/catTotalR*100):0;
  return{name:cat.name,valStr:this.fmt(real),pct,pctW:pct+'%'};
}).filter(x=>x.pct>0).sort((a,b)=>b.pct-a.pct).slice(0,6);
const hasReportCategorias=reportCategorias.length>0;
```

`calcCategoriaRealizado(budgetId)` (linha 1511):
```js
calcCategoriaRealizado(budgetId){
  const s=this.state;
  const gTotal=s.gastos.filter(g=>g.categoriaId===budgetId).reduce((a,g)=>a+g.value,0);
  const tTotal=s.txs.filter(t=>t.categoriaId===budgetId&&t.month===s.month&&t.year===s.year).reduce((a,t)=>a+t.value,0);
  return gTotal+tTotal;
}
```
Nota: soma TODOS os gastos de cartão vinculados àquela categoria (`s.gastos`, sem filtro de mês — parece somar todo o histórico de gastos de cartão da categoria) + transações vinculadas do mês corrente. É a mesma função usada na tela de Orçamento para a barra de progresso de cada categoria.

**Como é calculado**: % de participação de cada categoria no total gasto em categorias no mês (`real da categoria / soma de todas as categorias realizadas * 100`), não em relação à receita nem ao orçamento total. Filtra categorias com 0% (sem gasto) e limita a 6 categorias, ordenadas da maior pra menor participação.

**Como é exibido**: NÃO é gráfico de pizza/barra separado — é uma **lista com barra de progresso horizontal por categoria** (HTML linhas 909–924):
```html
<div style="font-size:11px;...">Por categoria</div>
<div style="display:flex;flex-direction:column;gap:11px">
  <!-- para cada rcat -->
  <div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span>{{ rcat.name }}</span>
      <span style="color:var(--text3)">{{ rcat.valStr }} · {{ rcat.pct }}%</span>
    </div>
    <div style="height:5px;background:var(--bg4);border-radius:3px;overflow:hidden">
      <div style="width:{{ rcat.pctW }};height:100%;background:var(--amber);border-radius:3px;transition:width .5s ..."></div>
    </div>
  </div>
</div>
```
Todas as barras usam a cor âmbar fixa (`var(--amber)`), independente do valor.

### Recordes

Lista exata (linhas 1893–1904), 3 recordes:

```js
const allNonIncome=s.txs.filter(t=>t.type!=='income');
const biggestTx=allNonIncome.length?allNonIncome.reduce((a,b)=>b.value>a.value?b:a):null;
const monthKeysR={};
s.txs.forEach(t=>{
  const k=t.year+'-'+t.month;
  if(!monthKeysR[k])monthKeysR[k]={income:0,out:0,year:t.year,month:t.month};
  if(t.type==='income')monthKeysR[k].income+=t.value; else monthKeysR[k].out+=t.value;
});
const monthArrR=Object.values(monthKeysR).map(m=>({...m,bal:m.income-m.out}));
const bestIncomeMonth=monthArrR.length?monthArrR.reduce((a,b)=>b.income>a.income?b:a):null;
const bestSavingMonth=monthArrR.length?monthArrR.reduce((a,b)=>b.bal>a.bal?b:a):null;

const reportRecords=[];
if(biggestTx)reportRecords.push({icon:'🏆',label:'Maior gasto individual',detail:biggestTx.name+' · '+MONTHS[biggestTx.month]+'/'+String(biggestTx.year).slice(2),valStr:this.fmt(biggestTx.value)});
if(bestIncomeMonth)reportRecords.push({icon:'📈',label:'Melhor mês em receita',detail:MONTHS[bestIncomeMonth.month]+'/'+String(bestIncomeMonth.year).slice(2),valStr:this.fmt(bestIncomeMonth.income)});
if(bestSavingMonth)reportRecords.push({icon:'💰',label:'Maior economia mensal',detail:MONTHS[bestSavingMonth.month]+'/'+String(bestSavingMonth.year).slice(2),valStr:this.fmt(bestSavingMonth.bal)});
```

**Os 3 recordes exatos, considerando TODO o histórico** (`s.txs`, não filtrado por mês nem por pessoa):
1. **🏆 Maior gasto individual** — a transação (não-income) de maior `value` em todo o histórico. Detail: `nome · Mês/AA`.
2. **📈 Melhor mês em receita** — o mês (agrupado por ano+mês) com maior soma de receitas. Detail: `Mês/AA`.
3. **💰 Maior economia mensal** — o mês com maior saldo (receita − despesa) em todo o histórico. Detail: `Mês/AA`.

Cada linha é condicional (só aparece se o registro correspondente existir). Não há "menor saldo" — não encontrado no protótipo.

---

## 3. Evolução patrimonial (dentro do Relatório)

**Técnica**: SVG puro (não canvas, não biblioteca externa). Path `<path>` com `fill` de gradiente linear (`<linearGradient>`) para a área, `<polyline>` para a linha, `<circle>` para o ponto final.

HTML (linhas 942–956):

```html
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:16px">
  <div style="...">Evolução patrimonial — 12 meses</div>
  <div style="font-size:20px;font-weight:600;font-family:'DM Mono',monospace;color:{{ patLineColor }};margin-bottom:6px">{{ patLastValStr }}</div>
  <svg viewBox="0 0 300 100" style="width:100%;height:100px;display:block;overflow:visible">
    <defs>
      <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="{{ patLineColor }}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="{{ patLineColor }}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <sc-if value="{{ patCrossesZero }}"><line x1="8" y1="{{ patZeroY }}" x2="292" y2="{{ patZeroY }}" stroke="var(--border2)" stroke-width="1" stroke-dasharray="3,3"/></sc-if>
    <path d="{{ patAreaPath }}" fill="url(#patGrad)" stroke="none"></path>
    <polyline points="{{ patLinePoints }}" fill="none" stroke="{{ patLineColor }}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <circle cx="{{ patLastX }}" cy="{{ patLastY }}" r="4" fill="{{ patLineColor }}" stroke="var(--bg2)" stroke-width="2"></circle>
  </svg>
  <div style="display:flex;justify-content:space-between;margin-top:4px">
    <span>{{ patFirstLabel }}</span>
    <span>{{ patLastLabel }}</span>
  </div>
</div>
```

**Código de desenho** (linhas 1905–1924), fórmula completa do saldo acumulado e das coordenadas SVG:

```js
// evolução patrimonial — saldo acumulado, 12 meses para trás
const patMonths=[];
for(let i=11;i>=0;i--){let pm=s.month-i,py=s.year;while(pm<0){pm+=12;py--;}patMonths.push({m:pm,y:py});}
let _pacc=0;
const patPoints=patMonths.map(({m,y})=>{
  const mr=s.txs.filter(t=>t.year===y&&t.month===m);   // NÃO filtra por pessoa
  const mc=this.calc(mr);
  _pacc+=mc.balance;                                     // acumula saldo mensal (income - fixed - variable - credit)
  return{label:MONTHS[m].slice(0,3),val:_pacc};
});
const patMax=Math.max.apply(null,patPoints.map(p=>p.val).concat([0]));
const patMin=Math.min.apply(null,patPoints.map(p=>p.val).concat([0]));
const patRange=(patMax-patMin)||1;
const patW=300,patH=100,patPad=8;
const patStepX=patPoints.length>1?(patW-patPad*2)/(patPoints.length-1):0;
const patXY=patPoints.map((p,i)=>({
  x:patPad+i*patStepX,
  y:patPad+(1-(p.val-patMin)/patRange)*(patH-patPad*2)
}));
const patLinePoints=patXY.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
const patAreaPath='M'+patXY[0].x.toFixed(1)+','+(patH-patPad)
  +' L'+patXY.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' L')
  +' L'+patXY[patXY.length-1].x.toFixed(1)+','+(patH-patPad)+' Z';
const patZeroY=(patPad+(1-(0-patMin)/patRange)*(patH-patPad*2)).toFixed(1);
const patCrossesZero=patMin<0&&patMax>0;
const patLineColor=patPoints[patPoints.length-1].val>=0?G:R;
const patLastLabel=patPoints[patPoints.length-1].label;
const patLastValStr=this.fmt(patPoints[patPoints.length-1].val);
const patFirstLabel=patPoints[0].label;
const patLastX=patXY[patXY.length-1].x.toFixed(1);
const patLastY=patXY[patXY.length-1].y.toFixed(1);
```

**Fórmula do "saldo acumulado" (patrimônio)**: para os 12 meses terminando no mês corrente selecionado (`s.month`/`s.year`), incluindo-o, soma progressivamente o `balance` mensal (`income - fixed - variable - credit`, de `calc()`) começando de `_pacc=0`. Não há saldo inicial/base configurável no protótipo — é puramente a soma incremental dos saldos mensais de transações (`s.txs`), sem considerar filtro de pessoa.

**Mapeamento pra coordenadas SVG** (viewBox 300×100, padding 8px):
- `x`: distribuído uniformemente entre os 12 pontos (`patStepX = (300 - 16) / 11`).
- `y`: normalizado invertido — `y = pad + (1 - (val - min)/(max - min)) * (100 - 16)`. Valor máximo fica no topo (y menor), valor mínimo embaixo (y maior). `min`/`max` sempre incluem 0 na faixa (`.concat([0])`), garantindo que o eixo zero sempre caiba no gráfico.
- Path da área: fecha o polígono do início ao fim na linha da base (`y = patH - patPad = 92`), preenchido com gradiente que vai de 35% de opacidade da cor da linha até 0%.
- Linha de referência zero pontilhada (`patZeroY`) só aparece se a série cruza o zero (`patCrossesZero = min<0 && max>0`).
- Cor da linha/área/valor: verde se o **último** valor acumulado ≥ 0, vermelho caso contrário (não varia ponto a ponto, é uma cor única pro gráfico inteiro).
- Ponto final: círculo raio 4 na última coordenada, com borda da cor de fundo do card (`var(--bg2)`) — efeito de "furo" destacando o ponto.

Nenhuma biblioteca de gráficos é usada — é geração manual de string SVG a partir de arrays de pontos.

---

## 4. Detalhe da categoria orçada (sheet, B8)

Abertura: `openCategoriaDetail(id){this.setState({catDetailId:id});}` / fechamento: `closeCategoriaDetail(){this.setState({catDetailId:null});}`. É um **bottom sheet** (mesmo padrão visual dos outros modais — fundo escurecido com blur, painel sobe de baixo, animação `sheetUp`), `max-height:80%`, scrollável.

HTML completo (linhas 1058–1093):

```html
<div onClick="{{ closeCategoriaDetail }}" style="position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);display:flex;align-items:flex-end;animation:fadeBg .2s ease">
  <div onClick="{{ stop }}" class="ph-scroll" style="background:var(--bg2);border-radius:22px 22px 0 0;border:1px solid var(--border);width:100%;max-height:80%;overflow-y:auto;padding:18px 16px 28px;animation:sheetUp .26s cubic-bezier(.4,0,.2,1)">
    <div style="width:36px;height:4px;background:var(--border2);border-radius:2px;margin:0 auto 16px"></div>
    <div style="font-size:16px;font-weight:600;margin-bottom:4px">{{ catDetail.icon }} {{ catDetail.name }}</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Realizado: {{ catDetail.realStr }} / {{ catDetail.orcStr }}</div>
    <div style="background:var(--bg4);border-radius:4px;height:5px;margin-bottom:18px">
      <div style="width:{{ catDetail.pctW }};height:5px;border-radius:4px;background:{{ catDetail.color }}"></div>
    </div>

    <div>Lançamentos vinculados este mês</div>
    <!-- catDetail.hasItems: lista dos lançamentos -->
    <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px 12px">
        <div style="flex:1"><div>{{ ci.name }}</div><div style="font-size:10px;color:var(--text3)">{{ ci.dateStr }}</div></div>
        <span style="color:var(--red)">{{ ci.valStr }}</span>
      </div>
    </div>
    <!-- catDetail.hasItemsEmpty: "Nenhum lançamento vinculado este mês" -->

    <div>Evolução — 6 meses</div>
    <div style="display:flex;align-items:flex-end;gap:8px;height:80px;margin-bottom:8px">
      <!-- barras -->
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:5px">
        <div style="width:100%;flex:1;display:flex;align-items:flex-end;justify-content:center">
          <div style="width:14px;height:{{ ev.h }};background:var(--amber);border-radius:3px;transform-origin:bottom;animation:barGrow .5s cubic-bezier(.34,1.56,.64,1) both"></div>
        </div>
        <span style="font-size:10px;color:var(--text3)">{{ ev.label }}</span>
      </div>
    </div>
  </div>
</div>
```

Lógica (linhas 2190–2214):

```js
const isCatDetailOpen=!!s.catDetailId;
const catDetail=(()=>{
  if(!s.catDetailId)return null;
  const cat=s.budgets.find(b=>b.id===s.catDetailId);
  if(!cat)return null;
  const found=categoriasList.find(x=>x.name===cat.name)||{};   // reaproveita realStr/orcStr/pctW/color já calculados
  const gLinked=s.gastos.filter(g=>g.categoriaId===cat.id&&g.month===s.month&&g.year===s.year);
  const tLinked=s.txs.filter(t=>t.categoriaId===cat.id&&t.month===s.month&&t.year===s.year);
  const linked=[...tLinked.map(t=>({name:t.name,value:t.value,date:t.date||''})),
                ...gLinked.map(g=>({name:g.name,value:g.value,date:g.date||''}))]
    .sort((a,b)=>(b.date||'')>(a.date||'')?1:(b.date||'')<(a.date||'')?-1:0);   // desc por data, sem data no fim

  const evo=[];
  for(let i=5;i>=0;i--){
    let em=s.month-i,ey=s.year; while(em<0){em+=12;ey--;}
    const gm=s.gastos.filter(g=>g.categoriaId===cat.id&&g.month===em&&g.year===ey).reduce((a,g)=>a+g.value,0);
    const tm=s.txs.filter(t=>t.categoriaId===cat.id&&t.month===em&&t.year===ey).reduce((a,t)=>a+t.value,0);
    evo.push({label:MONTHS[em].slice(0,3),val:gm+tm});
  }
  const evoMax=Math.max.apply(null,evo.map(e=>e.val).concat([1]));

  return{
    name:cat.name, icon:cat.icon||'🏷️',
    realStr:found.realStr||this.fmt(0), orcStr:found.orcStr||this.fmt(cat.value),
    pctW:found.pctW||'0%', color:found.color||G,
    items:linked.map(x=>({name:x.name,valStr:'−'+this.fmt(x.value),dateStr:x.date?this.fmtDate(x.date):'Sem data'})),
    hasItems:linked.length>0, hasItemsEmpty:linked.length===0,
    evoChart:evo.map(e=>({label:e.label,h:Math.max(3,e.val/evoMax*100).toFixed(0)+'%',isOver:cat.value>0&&e.val>cat.value})),
  };
})();
```

**O que aparece**:
1. Header: ícone + nome da categoria, "Realizado: X / Y" (realizado do mês corrente vs orçado), barra de progresso fina.
2. **Lançamentos vinculados do mês**: união de `gastos` de cartão (`categoriaId===cat.id`, mês/ano corrente) + `txs` normais (mesmo filtro), ordenados por data desc (sem data vai pro fim). Cada item mostra nome, data (ou "Sem data") e valor negativo em vermelho.
3. **Evolução 6 meses**: gráfico de barras dos últimos 6 meses (incluindo o corrente), somando `gastos` + `txs` vinculados à categoria em cada mês.

### Estrutura do gráfico de barras

**CSS puro com divs flexbox** (não SVG, não canvas). Cada barra: container `flex:1` com `flex-direction:column`, dentro um wrapper `flex:1` com `align-items:flex-end` que contém a barra propriamente dita — uma `div` com `width:14px` fixa e `height` dinâmica em porcentagem (`ev.h`), cor âmbar fixa, `border-radius:3px`, animação de entrada `barGrow` (scale a partir da base, `transform-origin:bottom`).

**Altura da barra**: `h = max(3, valor_do_mês / maior_valor_dos_6_meses * 100) + '%'` — altura relativa ao maior mês da janela de 6 meses (não relativa ao orçado), com piso de 3% para meses com valor zero permanecerem visíveis. Existe um campo `isOver` calculado (`cat.value>0 && e.val>cat.value`) mas **não é usado no HTML** — não muda a cor da barra (todas usam `var(--amber)`); é dado morto/não conectado no protótipo atual.

---

## 5. Projeção dia a dia + Horizonte de saldos

### Toggle Mensal / Dia a dia

HTML (linhas 533–538): dois botões de toggle no topo da tela Projeção — `setProjMonthly` / `setProjDaily`. Estado controla qual bloco (`isProjMonthly` / `isProjDaily`) é exibido.

### Projeção dia a dia — diferença da projeção mensal

A projeção mensal (já existente) mostra `projRows` — uma linha por mês (3/6/12 meses configurável), com colunas Mês/Entrada/Saída/Saldo, incluindo itens de orçamento pendentes. A **projeção dia a dia é sempre restrita ao mês corrente selecionado** (`s.month`/`s.year`, navegável com `‹ ›` igual às outras telas) — não tem seletor de período (3/6/12m). Mostra uma linha por DIA do mês, com saldo corrido (running balance) dia a dia, não mês a mês.

HTML (linhas 584–629):

```html
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
  <!-- navegação de mês: ‹ MonthShort › -->
  <button onClick="{{ openHorizon }}">📅 Horizonte</button>
</div>
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px">
  <div style="display:grid;grid-template-columns:44px 1fr 1fr">Dia | Movimento | Saldo</div>
  <!-- dailyRows: uma linha por dia -->
  <div onClick="{{ dr.onTap }}" style="display:grid;grid-template-columns:44px 1fr 1fr;background:{{ dr.rowBg }};border:1px solid {{ dr.rowBorder }}">
    <span>{{ dr.day }}</span>
    <span><!-- ícone seta (in/out/mixed) --> {{ dr.movStr }}</span>
    <span style="color:{{ dr.saldoColor }}">{{ dr.saldoStr }}</span>
  </div>
  <!-- se dr.isExpanded: lista de items do dia (nome + valor), ou "Sem movimentação neste dia" -->
  <!-- linha Final: saldo acumulado do último dia -->
  <!-- legenda: verde=Dia com entrada, âmbar=Dia com saída, texto sólido=Hoje -->
</div>
```

Lógica (linhas 2076–2118), **estrutura de dados**:

```js
const todayD=new Date();todayD.setHours(0,0,0,0);
const viewingCurrentMonth=(s.year===todayD.getFullYear()&&s.month===todayD.getMonth());
const todayNum=todayD.getDate();
const dim=this.daysInMonth(s.year,s.month);
let runningDia=0;
const dailyRows=[];
for(let day=1;day<=dim;day++){
  const dayTxs=s.txs.filter(t=>{
    if(t.year!==s.year||t.month!==s.month)return false;
    if(s.pessoaFilter&&t.pessoaId!==s.pessoaFilter)return false;
    const raw=t.date||t.paidDate;
    const dnum=raw?parseInt(raw.split('-')[2]):1;   // sem data nem paidDate: cai no dia 1
    return dnum===day;
  });
  let dIn=dayTxs.filter(t=>t.type==='income').reduce((a,t)=>a+t.value,0);
  let dOut=dayTxs.filter(t=>t.type!=='income').reduce((a,t)=>a+t.value,0);

  // dias futuros: soma itens de orçamento pendentes que vencem nesse dia (só recorrência do mesmo mês, offset 0)
  const isFutureMonth=(s.year>todayD.getFullYear())||(s.year===todayD.getFullYear()&&s.month>todayD.getMonth());
  const isFutureDay=isFutureMonth||(viewingCurrentMonth&&day>todayNum);
  if(isFutureDay){
    s.budgets.filter(b=>!b.isCategoriaOnly&&(b.dueMonthOffset||0)===0&&(b.dueDay||1)===day).forEach(b=>{
      const dk=b.id+'_'+s.year+String(s.month+1).padStart(2,'0');
      if(s.budgetDone[dk])return;   // já pago não conta
      if(b.type==='income')dIn+=b.value; else dOut+=b.value;
    });
  }
  const net=dIn-dOut;
  runningDia+=net;
  // ... construção da linha (rowBg/rowBorder por: hoje=texto sólido, net>0=verde, net<0=âmbar, net=0=neutro)
  // isExpanded: s.expandedDay===day (toggle ao clicar na linha, mostra os itens do dia)
}
```

**Diferenças-chave em relação à projeção mensal**:
- Granularidade dia (não mês).
- Sempre o mês navegado atualmente (sem seletor 3/6/12m).
- Cor da linha por resultado líquido do dia (verde=positivo, âmbar=negativo, neutro=zero), não por "é o mês atual" como na mensal.
- Itens de orçamento pendentes só entram nos dias FUTUROS do mês corrente (passado/hoje usa só transações reais).
- Cada linha é expansível (clique) mostrando a lista de lançamentos daquele dia inline (não modal).
- Roda "Final" no rodapé com o saldo acumulado do mês inteiro.

### Horizonte de saldos

Abre em sheet full-height (`horizonOpen`), acionado pelo botão "Horizonte" no topo da projeção dia a dia. `openHorizon(){this.setState({horizonOpen:true});}` / `closeHorizon(){this.setState({horizonOpen:false});}`.

HTML (linhas 1352–1382): título "Horizonte de saldos", subtítulo "Saldo acumulado do mês, dia a dia — próximos {{ horizonSpan }} meses". Grid: coluna de dias (1–31) × colunas de meses (6 meses a partir do mês corrente), cada célula colorida mostra o saldo compacto (`fmtCompact`). Legenda: verde=Saudável, âmbar=Apertado, vermelho=Negativo, cor de texto sólida=Hoje.

**Lógica de faixas de cor** (linhas 2033–2074), a parte mais importante:

```js
const todayH=new Date();todayH.setHours(0,0,0,0);
const horizonSpan=6;
const horizonMonths=[];
for(let mi=0;mi<horizonSpan;mi++){
  let hm=s.month+mi,hy=s.year; while(hm>11){hm-=12;hy++;}
  const dimH=this.daysInMonth(hy,hm);
  const isFutureMonthH=(hy>todayH.getFullYear())||(hy===todayH.getFullYear()&&hm>todayH.getMonth());
  const isCurrentMonthH=(hy===todayH.getFullYear()&&hm===todayH.getMonth());
  const todayNumH=todayH.getDate();

  // limiar "apertado" é relativo à receita do mês (mínimo R$150)
  const monthIncomeH=(this.calc(s.txs.filter(t=>t.year===hy&&t.month===hm))).income||1;
  const lowThreshold=Math.max(monthIncomeH*0.07,150);   // 7% da receita mensal, piso R$150

  let runH=0;
  const cells=[];
  for(let day=1;day<=31;day++){
    if(day>dimH){cells.push({empty:true,bg:'transparent',fg:'transparent',valStr:''});continue;}
    const isFutureDayH=isFutureMonthH||(isCurrentMonthH&&day>todayNumH);
    const dayTxsH=s.txs.filter(t=>{
      if(t.year!==hy||t.month!==hm)return false;
      if(s.pessoaFilter&&t.pessoaId!==s.pessoaFilter)return false;
      const raw=t.date||t.paidDate;
      const dnum=raw?parseInt(raw.split('-')[2]):1;
      return dnum===day;
    });
    let dInH=dayTxsH.filter(t=>t.type==='income').reduce((a,t)=>a+t.value,0);
    let dOutH=dayTxsH.filter(t=>t.type!=='income').reduce((a,t)=>a+t.value,0);
    if(isFutureDayH){
      s.budgets.filter(b=>!b.isCategoriaOnly&&(!s.pessoaFilter||b.pessoaId===s.pessoaFilter)).forEach(b=>{
        const isAlways=(b.recurrence||'always')==='always';
        const dueDay=b.dueDay||1;
        if(dueDay!==day)return;
        if(!isAlways){ if(b.budgetMonth==null||b.budgetYear==null||b.budgetMonth!==hm||b.budgetYear!==hy)return; }
        const dk=b.id+'_'+hy+String(hm+1).padStart(2,'0');
        if(s.budgetDone[dk])return;
        if(b.type==='income')dInH+=b.value; else dOutH+=b.value;
      });
    }
    runH+=(dInH-dOutH);   // saldo acumulado DENTRO do mês (reinicia a cada mês, ver horizonMonths.push abaixo — cada mês é independente, runH não carrega do mês anterior)
    const isTodayH=isCurrentMonthH&&day===todayNumH;

    // ---- FAIXAS DE COR ----
    let cellFg=G, cellBg='var(--green-bg)';                                    // padrão: Saudável (verde)
    if(runH<0){ cellFg=R; cellBg='var(--red-bg)'; }                            // Negativo (vermelho)
    else if(runH<lowThreshold){ cellFg='var(--amber)'; cellBg='var(--amber-bg)'; } // Apertado (âmbar)

    cells.push({empty:false, bg:isTodayH?'var(--text)':cellBg, fg:isTodayH?'var(--bg)':cellFg, valStr:this.fmtCompact(runH), day});
  }
  horizonMonths.push({label:MONTHS[hm].slice(0,3)+'/'+String(hy).slice(2), cells});
}
// transposição pra grid dia×mês (linhas = dias, colunas = meses)
const horizonDays=[];
for(let d=0;d<31;d++)horizonDays.push({dayNum:d+1, monthCells:horizonMonths.map(hm2=>hm2.cells[d])});
const horizonMonthLabels=horizonMonths.map(hm=>hm.label);
```

**Faixas de cor exatas** (avaliadas nesta ordem, saldo do dia = `runH`, acumulado dentro do próprio mês, cada mês recomeça do zero):
1. `runH < 0` → **Vermelho** (Negativo) — `fg: var(--red)`, `bg: var(--red-bg)`.
2. `0 <= runH < lowThreshold` → **Âmbar** (Apertado) — `fg: var(--amber)`, `bg: var(--amber-bg)`.
3. `runH >= lowThreshold` → **Verde** (Saudável) — `fg: G` (green), `bg: var(--green-bg)`.

Onde `lowThreshold = max(receita_do_mês * 0.07, 150)` — 7% da receita total do mês (transações `income` daquele mês/ano), com piso mínimo de R$150 (evita threshold ridiculamente baixo em meses sem receita registrada).

Célula de "hoje" sobrescreve cores: fundo `var(--text)` (cor de texto sólida), texto `var(--bg)` (cor de fundo), independente da faixa de saldo.

**Grade**: 6 meses (colunas) × até 31 dias (linhas), dias que não existem no mês (ex: 31 de fevereiro) ficam com célula vazia/transparente. Valor mostrado é `fmtCompact` (compacto, ex: "1.2k"). Considera itens de orçamento pendentes futuros (mesma lógica de recorrência/vencimento da projeção dia a dia), mas aqui verificando `recurrence==='always'` OU (`budgetMonth`/`budgetYear` batendo com o mês da célula) para incluir itens não-recorrentes só no mês correto.

---

## 6. Resumo do Orçamento como mini-tabela

Localização: topo da tela Orçamento, dentro do card "Resumo do mês" (linhas 651–668), acima da barra de progresso de conclusão.

HTML:

```html
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:12px">
  <div style="display:flex;justify-content:space-between;margin-bottom:8px">
    <span>Resumo do mês</span>
    <span>{{ budgetCountLabel }}</span>  <!-- ex: "3/8 realizados" -->
  </div>
  <div style="height:6px;background:var(--bg4);border-radius:3px;margin-bottom:14px">
    <div style="width:{{ budgetPctW }};background:{{ budgetPctColor }}"></div>  <!-- barra de % de itens concluídos (contagem, não valor) -->
  </div>
  <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:6px 12px">
    <div></div>
    <div style="text-align:right">Previsto</div>
    <div style="text-align:right">Realizado</div>
    <!-- budgetSummaryRows: 3 linhas -->
    <div style="display:contents">
      <div style="border-top:{{ br.rowBorder }}">{{ br.label }}</div>
      <div style="border-top:{{ br.rowBorder }};color:var(--text3)">{{ br.prevStr }}</div>
      <div style="border-top:{{ br.rowBorder }};color:{{ br.color }}">{{ br.realStr }}</div>
    </div>
  </div>
</div>
```

Lógica (linhas 2155–2175):

```js
const orcadoTot=s.budgets.filter(b=>!b.isCategoriaOnly).reduce((a,b)=>a+b.value,0);
const realizadoTot=s.budgets.filter(b=>!b.isCategoriaOnly&&s.budgetDone[b.id+'_'+s.year+mm]).reduce((a,b)=>a+b.value,0);
const bpct=orcadoTot>0?Math.round(realizadoTot/orcadoTot*100):0;   // calculado mas não usado na mini-tabela (é a barra do topo, sobre valor total, não a bpct usada — ver abaixo bCountPct)

// resumo previsto × realizado por natureza (Receita / Despesa / Saldo)
const _bDoneOf=b=>!!s.budgetDone[b.id+'_'+s.year+mm];
const bIncItems=budgetFiltered.filter(b=>b.type==='income');
const bExpItems=budgetFiltered.filter(b=>b.type!=='income');
const bOrcInc=bIncItems.reduce((a,b)=>a+b.value,0),  bRealInc=bIncItems.filter(_bDoneOf).reduce((a,b)=>a+b.value,0);
const bOrcExp=bExpItems.reduce((a,b)=>a+b.value,0),  bRealExp=bExpItems.filter(_bDoneOf).reduce((a,b)=>a+b.value,0);
const bOrcSaldo=bOrcInc-bOrcExp, bRealSaldo=bRealInc-bRealExp;

const bDoneCount=budgetFiltered.filter(_bDoneOf).length;
const bCountPct=budgetFiltered.length>0?Math.round(bDoneCount/budgetFiltered.length*100):0;
const _sgn=v=>(v<0?'−':'+');
const budgetSummaryRows=[
  {label:'Receita', prevStr:this.fmt(bOrcInc), realStr:this.fmt(bRealInc), color:G, isSaldo:false},
  {label:'Despesa', prevStr:this.fmt(bOrcExp), realStr:this.fmt(bRealExp), color:R, isSaldo:false},
  {label:'Saldo',   prevStr:_sgn(bOrcSaldo)+this.fmt(Math.abs(bOrcSaldo)).replace('R$ ',''),
                     realStr:_sgn(bRealSaldo)+this.fmt(Math.abs(bRealSaldo)).replace('R$ ',''),
                     color:bRealSaldo>=0?G:R, isSaldo:true},
].map(r=>({...r, rowBorder:r.isSaldo?'1px solid var(--border)':'none'}));

const budgetCountLabel=bDoneCount+'/'+budgetFiltered.length+' realizados';
const budgetPctW=bCountPct+'%';
const budgetPctColor=bCountPct<50?'var(--amber)':bCountPct<100?'var(--blue)':'var(--green)';
```

**Estrutura da montagem**:
- `budgetFiltered` = itens de orçamento do mês corrente (excluindo `isCategoriaOnly`), respeitando filtro de pessoa e regra de recorrência/atraso já usada na lista principal de orçamento.
- Divide em `bIncItems` (type==='income') e `bExpItems` (todo o resto: fixed/variable).
- **Previsto** = soma de `value` de TODOS os itens da natureza (independente de terem sido marcados como pagos/realizados).
- **Realizado** = soma de `value` apenas dos itens marcados como concluídos (`s.budgetDone[itemId + '_' + ano + mêsPadded]`).
- **Linha Saldo** = Previsto: `Receita previsto − Despesa previsto`; Realizado: `Receita realizado − Despesa realizado`. Sinal `+`/`−` explícito prefixado manualmente (`_sgn`), com o `"R$ "` removido do valor formatado antes de prefixar o sinal (evita duplicar sinal dentro do `fmt`).
- Cor do valor Realizado: verde para Receita, vermelho para Despesa, e para Saldo verde se `bRealSaldo>=0` senão vermelho. Coluna Previsto sempre em cinza neutro (`var(--text3)`).
- A linha "Saldo" tem borda superior (separador visual das outras duas), as outras não.
- Acima da mini-tabela: `budgetCountLabel` mostra contagem de itens concluídos por CONTAGEM de itens (não por valor): `"{feitos}/{total} realizados"`. A barra de progresso (`budgetPctW`/`budgetPctColor`) também é por contagem (`bCountPct`), com cor âmbar se <50%, azul se 50–99%, verde se 100%. (A variável `bpct`, calculada por valor monetário, existe no código mas não é referenciada em lugar nenhum do HTML — morta/não usada.)

---

## Funções auxiliares usadas em todas as seções acima

```js
fmt(v){ if(this.state.hideValues)return 'R$ •••••'; return 'R$ '+Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
fmtCompact(v){ const sign=v<0?'−':''; const a=Math.abs(v); if(a>=1000)return sign+(a/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'k'; return sign+Math.round(a).toLocaleString('pt-BR'); }
fmtDate(iso){ if(!iso)return ''; const[y,m,d]=iso.split('-'); return d+'/'+m+'/'+y; }
daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
calc(rows){
  const income=rows.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
  const fixed=rows.filter(t=>t.type==='fixed').reduce((s,t)=>s+t.value,0);
  const variable=rows.filter(t=>t.type==='variable').reduce((s,t)=>s+t.value,0);
  const credit=rows.filter(t=>t.type==='credit').reduce((s,t)=>s+t.value,0);
  return{income,fixed,variable,credit,expense:fixed+variable,out:fixed+variable+credit,balance:income-fixed-variable-credit};
}
```

Nota: `fmt()` NUNCA inclui o sinal (usa `Math.abs`) — o sinal (+/−) é sempre prefixado manualmente no ponto de uso, conforme mostrado em cada seção acima.
