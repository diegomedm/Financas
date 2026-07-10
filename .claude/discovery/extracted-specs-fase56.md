# EXTRAÇÃO TÉCNICA — Design Prototype (Financas App.dc.html)

## Confirmação preliminar
`support.js` é confirmado como runtime genérico (loader/compilador de template DSL `dc-runtime`) — não contém lógica de app. Toda a lógica está no bloco `<script data-dc-script>` (classe `Component extends DCLogic`) e no template (`<x-dc>` com `sc-for`/`sc-if`/`{{ }}`).

---

## FASE 5 — Planejamento

### 1. Alertas inteligentes no Dashboard (marcado "C11")

**Lógica de geração (linhas 2216-2231):**
```js
// ---------- C11: alertas inteligentes (dashboard) ----------
const alertsArr=[];
const todayAl=new Date();todayAl.setHours(0,0,0,0);
let nearestCard=null;
s.cartoes.forEach(ct=>{
  let dAl=new Date(todayAl.getFullYear(),todayAl.getMonth(),ct.vencimento);
  if(dAl<todayAl)dAl=new Date(todayAl.getFullYear(),todayAl.getMonth()+1,ct.vencimento);
  const diffAl=Math.ceil((dAl-todayAl)/86400000);
  if(diffAl<=3&&(!nearestCard||diffAl<nearestCard.diff))nearestCard={diff:diffAl,name:ct.name};
});
if(nearestCard)alertsArr.push({icon:'💳',color:'var(--amber)',bg:'var(--amber-bg)',border:'var(--amber-border)',text:'Fatura do '+nearestCard.name+' vence '+(nearestCard.diff<=0?'hoje':nearestCard.diff===1?'amanhã':'em '+nearestCard.diff+'d'),onClick:()=>this.nav('cards')});
const overCategoria=categoriasList.find(cat=>cat.color===R);
if(overCategoria)alertsArr.push({icon:'⚠️',color:R,bg:'var(--red-bg)',border:'var(--red-border)',text:'Categoria "'+overCategoria.name+'" já estourou o orçamento',onClick:()=>this.nav('budget')});
if(typeof negativeWarning!=='undefined'&&negativeWarning)alertsArr.push({icon:'📉',color:R,bg:'var(--red-bg)',border:'var(--red-border)',text:'Saldo projetado fica negativo em '+negativeWarning.month,onClick:()=>this.nav('proj')});
const hasAlerts=alertsArr.length>0;
const alertsList=alertsArr.slice(0,3);
```

**Três tipos de alerta, exatos:**

1. **Fatura de cartão vencendo** — dispara quando `diffAl<=3` (fatura vence em até 3 dias, incluindo hoje/negativo). Considera todos os cartões (`s.cartoes`) e pega o de vencimento mais próximo (`nearestCard`). Texto: `'Fatura do '+nearestCard.name+' vence '+(nearestCard.diff<=0?'hoje':nearestCard.diff===1?'amanhã':'em '+nearestCard.diff+'d')`. Ícone `💳`, cor âmbar (`var(--amber)`/`var(--amber-bg)`/`var(--amber-border)`). Navega para `this.nav('cards')`.
2. **Categoria estourada** — dispara quando existe uma `categoriaList` item com `cat.color===R` (a cor vermelha usada quando o percentual realizado ultrapassa o orçado — ver `catDetail`/`categoriasList` build, `color` fica vermelho quando estourado). Texto: `'Categoria "'+overCategoria.name+'" já estourou o orçamento'`. Ícone `⚠️`, cor vermelha (`R`/`var(--red-bg)`/`var(--red-border)`). Navega para `this.nav('budget')`.
3. **Saldo projetado negativo** — dispara quando `negativeWarning` existe (calculado na seção de Projeção, linha 2029-2032: soma progressiva do saldo mensal a partir do mês atual; `firstNegativeIdx` = primeiro índice onde a soma acumulada fica negativa). Texto: `'Saldo projetado fica negativo em '+negativeWarning.month`. Ícone `📉`, cor vermelha. Navega para `this.nav('proj')`.

Cálculo do `negativeWarning` (linhas 2029-2032):
```js
let _acc=0;const accSeries=balSeries.map(b=>{_acc+=b;return _acc;});
const firstNegativeIdx=accSeries.findIndex(v=>v<0);
const negativeWarning=firstNegativeIdx>=0?{month:MONTHS[(s.month+firstNegativeIdx)%12],idx:firstNegativeIdx}:null;
```

**Limite de exibição:** máximo 3 alertas mostrados (`alertsList=alertsArr.slice(0,3)`), mesmo que mais de 3 condições sejam verdadeiras.

**Estrutura visual (template, linhas 102-113):**
```html
<!-- alertas inteligentes (C11) -->
<sc-if value="{{ hasAlerts }}" hint-placeholder-val="{{ false }}">
<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
  <sc-for list="{{ alertsList }}" as="al" hint-placeholder-count="2">
    <div onClick="{{ al.onClick }}" style-active="transform:scale(.98)" style="display:flex;align-items:center;gap:10px;background:{{ al.bg }};border:1px solid {{ al.border }};border-radius:12px;padding:10px 12px;cursor:pointer;transition:transform .1s">
      <span style="font-size:16px;flex-shrink:0">{{ al.icon }}</span>
      <span style="flex:1;font-size:12px;font-weight:500;color:{{ al.color }};min-width:0">{{ al.text }}</span>
      <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:{{ al.color }};fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  </sc-for>
</div>
</sc-if>
```
Cada card de alerta: fundo `al.bg`, borda `al.border`, ícone emoji à esquerda (16px), texto no meio (12px, cor `al.color`), seta ">" (chevron SVG) à direita indicando navegação. Toda a linha é clicável (`onClick` no `<div>`) com feedback `transform:scale(.98)` no toque (`style-active`).

Não há níveis de severidade explícitos além da cor por tipo (âmbar para vencimento próximo, vermelho para os dois casos negativos).

---

### 2. Limite mensal de gasto livre (marcado "C10")

**Configuração em Settings (linhas 768-774):**
```html
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:12px">
  <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:500;margin-bottom:4px">Orçamento</div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;gap:12px">
    <div style="min-width:0;flex:1"><div style="font-size:14px;font-weight:500">Limite de gasto livre</div><div style="font-size:12px;color:var(--text3);margin-top:2px">Teto mensal para gastos variáveis, mostrado no Dashboard</div></div>
    <input value="{{ limiteVariavelInputVal }}" onInput="{{ setLimiteVariavelInput }}" inputmode="decimal" placeholder="0" style="width:84px;flex-shrink:0;background:var(--bg4);border:1px solid var(--border2);color:var(--text);border-radius:9px;padding:9px 10px;font-size:13px;outline:none;font-family:'DM Mono',monospace;text-align:right">
  </div>
</div>
```
- Localização: Configurações → seção "Orçamento" (única linha nessa seção).
- Label do campo: **"Limite de gasto livre"**.
- Subtexto/descrição: **"Teto mensal para gastos variáveis, mostrado no Dashboard"**.
- Input type: `<input inputmode="decimal">` (texto com teclado decimal), placeholder `"0"`, alinhado à direita, largura fixa 84px.
- Storage key/property: `s.limiteVariavel` (número, default `2000` no seed inicial — linha 1461: `limiteVariavel:2000`).
- Handler de input (linha 1645):
```js
setLimiteVariavelInput(e){const v=parseFloat(String(e.target.value).replace(',','.'));this.setState({limiteVariavel:isNaN(v)?0:v});}
```

**Cálculo/formula (linhas 2233-2243):**
```js
// ---------- C10: limite mensal de gasto livre ----------
const limiteVariavel=s.limiteVariavel||0;
const hasLimite=limiteVariavel>0;
const variableSpend=c.variable;
const limPctRaw=hasLimite?Math.round(variableSpend/limiteVariavel*100):0;
const limPctCapped=Math.min(100,limPctRaw);
const limColor=limPctRaw<70?G:limPctRaw<100?'var(--amber)':R;
const limiteVariavelStr=this.fmt(limiteVariavel),variableSpendStr=this.fmt(variableSpend);
const limPctStr=limPctRaw+'%',limPctW=limPctCapped+'%';
```
"Gasto livre" = **apenas gastos variáveis do mês** (`c.variable`, que vem de `calc(rows)`, linha 1595: soma de `rows.filter(t=>t.type==='variable').reduce((s,t)=>s+t.value,0)`). NÃO subtrai categorias orçadas — é simplesmente `variableSpend / limiteVariavel * 100`.

**Thresholds de cor:**
- `< 70%` → verde (`G`)
- `70%–99%` → âmbar (`var(--amber)`)
- `≥ 100%` → vermelho (`R`)

Barra de progresso é "capped" em 100% visualmente (`limPctCapped`), mas o texto percentual mostra o valor real sem cap (`limPctRaw`, pode passar de 100%).

**Estrutura visual dashboard (linhas 159-169):**
```html
<!-- limite de gasto livre (C10) -->
<sc-if value="{{ hasLimite }}" hint-placeholder-val="{{ false }}">
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:12px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:500">Limite de gasto livre</span>
    <span style="font-size:12px;font-weight:600;font-family:'DM Mono',monospace;color:{{ limColor }}">{{ limPctStr }}</span>
  </div>
  <div style="height:8px;background:var(--bg4);border-radius:5px;overflow:hidden;margin-bottom:6px"><div style="width:{{ limPctW }};height:100%;background:{{ limColor }};transition:width .5s cubic-bezier(.4,0,.2,1)"></div></div>
  <div style="font-size:11px;color:var(--text3)">{{ variableSpendStr }} de {{ limiteVariavelStr }} em gastos variáveis</div>
</div>
</sc-if>
```
Card só aparece se `hasLimite` (limite configurado > 0). Rodapé de texto: `"{{ variableSpendStr }} de {{ limiteVariavelStr }} em gastos variáveis"`.

---

### 3. Metas de economia (marcado "C9")

**CRUD do modelo (linha 1461 seed inicial):**
```js
goals:[{id:940,name:'Viagem em dezembro',target:5000,saved:1800,targetMonth:11,targetYear:2026}], goalModal:null,
```
Campos do registro de meta: `id`, `name`, `target` (valor alvo), `saved` (já guardado), `targetMonth`, `targetYear` (prazo).

**Métodos (linhas 1646-1657):**
```js
openGoalModal(id){const g=id?this.state.goals.find(x=>x.id===id):null;this.setState({goalModal:g?{...g}:{id:null,name:'',target:'',saved:'',targetMonth:this.state.month,targetYear:this.state.year}});}
closeGoalModal(){this.setState({goalModal:null});}
setGoalDraft(patch){this.setState(s=>({goalModal:{...s.goalModal,...patch}}));}
saveGoal(){const d=this.state.goalModal;
  if(!d.name||!d.name.trim()){this.toast('Informe o nome da meta','var(--red)');return;}
  const target=parseFloat(String(d.target).replace(',','.'));
  const saved=parseFloat(String(d.saved).replace(',','.'))||0;
  if(isNaN(target)||target<=0){this.toast('Informe um valor alvo válido','var(--red)');return;}
  const rec={id:d.id||this.state.nextId,name:d.name.trim(),target,saved,targetMonth:parseInt(d.targetMonth),targetYear:parseInt(d.targetYear)};
  this.setState(s=>{const goals=d.id?s.goals.map(g=>g.id===d.id?rec:g):[...s.goals,rec];return{goals,nextId:s.nextId+1,goalModal:null};});
  this.toast(d.id?'Meta atualizada!':'Meta criada!','var(--green)');}
deleteGoal(){const d=this.state.goalModal;this.setState({confirm:{title:'Remover meta?',msg:'Tem certeza que deseja remover "'+d.name+'"?',buttons:[{label:'Remover',cls:'danger',action:()=>{this.setState(s=>({goals:s.goals.filter(g=>g.id!==d.id),goalModal:null}));this.toast('Removido','var(--red)');}},{label:'Cancelar',cls:'ghost',action:()=>{}}]}});}
```

**Form markup do modal/sheet (linhas 1032-1056):**
```html
<!-- ===================== MODAL: NOVA/EDITAR META DE ECONOMIA (C9) ===================== -->
<sc-if value="{{ isGoalModalOpen }}" hint-placeholder-val="{{ false }}">
<div onClick="{{ closeGoalModal }}" style="position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);display:flex;align-items:flex-end;animation:fadeBg .2s ease">
  <div onClick="{{ stop }}" style="background:var(--bg2);border-radius:22px 22px 0 0;border:1px solid var(--border);width:100%;padding:18px 16px 28px;animation:sheetUp .26s cubic-bezier(.4,0,.2,1)">
    <div style="width:36px;height:4px;background:var(--border2);border-radius:2px;margin:0 auto 16px"></div>
    <div style="font-size:16px;font-weight:600;margin-bottom:18px">{{ goalModalTitle }}</div>
    <div style="margin-bottom:13px">
      <label style="display:block;font-size:12px;color:var(--text2);margin-bottom:5px;font-weight:500">Nome da meta</label>
      <input value="{{ goalDraftName }}" onInput="{{ setGoalName }}" placeholder="Ex: Viagem, Reserva de emergência..." style="...">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px">
      <div><label>Valor alvo</label><input value="{{ goalDraftTarget }}" onInput="{{ setGoalTarget }}" inputmode="decimal" placeholder="0,00" style="..."></div>
      <div><label>Já guardado</label><input value="{{ goalDraftSaved }}" onInput="{{ setGoalSaved }}" inputmode="decimal" placeholder="0,00" style="..."></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
      <div><label>Mês alvo</label><select value="{{ goalDraftMonth }}" onChange="{{ setGoalMonth }}"><sc-for list="{{ goalMonthOptions }}" as="mo" hint-placeholder-count="12"><option value="{{ mo.value }}">{{ mo.label }}</option></sc-for></select></div>
      <div><label>Ano alvo</label><select value="{{ goalDraftYear }}" onChange="{{ setGoalYear }}"><sc-for list="{{ goalYearOptions }}" as="yo" hint-placeholder-count="5"><option value="{{ yo.value }}">{{ yo.label }}</option></sc-for></select></div>
    </div>
    <div style="display:flex;gap:8px">
      <button onClick="{{ saveGoal }}">Salvar</button>
      <sc-if value="{{ isGoalEditing }}"><button onClick="{{ deleteGoal }}">Excluir</button></sc-if>
      <button onClick="{{ closeGoalModal }}">Cancelar</button>
    </div>
  </div>
</div>
</sc-if>
```
Campos exatos: **Nome da meta** (texto), **Valor alvo** (decimal), **Já guardado** (decimal), **Mês alvo** (select 0-11), **Ano alvo** (select, `s.year` até `s.year+5`). Título muda entre `"Nova meta"` e `"Editar meta"` (linha 2271: `(gd&&gd.id)?'Editar meta':'Nova meta'`).

**Formula de progresso e projeção (linhas 2245-2266):**
```js
// ---------- C9: metas de economia ----------
const avgSaving=monthArrR.length?(monthArrR.reduce((a,m)=>a+m.bal,0)/monthArrR.length):0;
const goalsList=s.goals.map(g=>{
  const pctG=g.target>0?Math.min(100,Math.round(g.saved/g.target*100)):0;
  const remaining=Math.max(0,g.target-g.saved);
  const isDoneG=g.saved>=g.target;
  let projLabel;
  if(isDoneG){projLabel='🎉 Meta concluída!';}
  else if(avgSaving<=0){projLabel='Sem ritmo de economia suficiente';}
  else{
    const monthsNeeded=Math.ceil(remaining/avgSaving);
    let pmG=s.month+monthsNeeded,pyG=s.year;while(pmG>11){pmG-=12;pyG++;}
    const targetDateG=new Date(g.targetYear,g.targetMonth,1);
    const projDateG=new Date(pyG,pmG,1);
    const onTrack=projDateG<=targetDateG;
    projLabel=(onTrack?'✓ no prazo — ':'⚠ atrasada — ')+'proj. '+MONTHS[pmG].slice(0,3)+'/'+String(pyG).slice(2);
  }
  return{id:g.id,name:g.name,savedStr:this.fmt(g.saved),targetStr:this.fmt(g.target),pctW:pctG+'%',
    color:isDoneG?G:(pctG>=70?G:pctG>=35?'var(--amber)':'var(--blue)'),
    targetDateStr:MONTHS[g.targetMonth].slice(0,3)+'/'+String(g.targetYear).slice(2),
    projLabel,onEdit:()=>this.openGoalModal(g.id)};
});
```
**"Ritmo médio de economia"** (`avgSaving`) = média do saldo mensal (`m.bal`) dos últimos meses em `monthArrR` (array de histórico de saldo mensal usado no gráfico "Receita vs Saída — 6 meses"). **Meses necessários** = `Math.ceil(remaining/avgSaving)`. A data projetada de conclusão é comparada com a data alvo (`targetDateG`) — se `projDateG<=targetDateG`, está "no prazo" (✓); senão "atrasada" (⚠).

Rótulos exatos de `projLabel`:
- Meta concluída: `'🎉 Meta concluída!'`
- Sem ritmo: `'Sem ritmo de economia suficiente'` (quando `avgSaving<=0`)
- No prazo: `'✓ no prazo — proj. '+MONTHS[pmG].slice(0,3)+'/'+String(pyG).slice(2)` (ex: "✓ no prazo — proj. mar/26")
- Atrasada: `'⚠ atrasada — proj. '+MONTHS[pmG].slice(0,3)+'/'+String(pyG).slice(2)`

**Cores da barra de progresso da meta:** concluída ou `pctG>=70` → verde (`G`); `pctG>=35` → âmbar; abaixo disso → azul (`var(--blue)`).

**Card visual no Dashboard (linhas 204-228):**
```html
<!-- metas de economia (C9) -->
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:16px;margin-top:12px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:500">Metas de economia</span>
    <button onClick="{{ openNewGoal }}" style-active="transform:scale(.9)" style="background:none;border:none;color:var(--blue);font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .1s">+ Nova</button>
  </div>
  <sc-if value="{{ hasGoals }}" hint-placeholder-val="{{ true }}">
    <sc-for list="{{ goalsList }}" as="gl" hint-placeholder-count="1">
      <div onClick="{{ gl.onEdit }}" style-active="opacity:.8" style="cursor:pointer;margin-bottom:16px;transition:opacity .1s">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;font-weight:500">{{ gl.name }}</span>
          <span style="font-size:12px;font-family:'DM Mono',monospace;color:var(--text2)">{{ gl.savedStr }} / {{ gl.targetStr }}</span>
        </div>
        <div style="height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:6px"><div style="width:{{ gl.pctW }};height:100%;background:{{ gl.color }};border-radius:3px;transition:width .5s cubic-bezier(.4,0,.2,1)"></div></div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span style="font-size:11px;color:var(--text3);flex-shrink:0">Meta: {{ gl.targetDateStr }}</span>
          <span style="font-size:11px;color:{{ gl.color }};text-align:right;min-width:0">{{ gl.projLabel }}</span>
        </div>
      </div>
    </sc-for>
  </sc-if>
  <sc-if value="{{ hasGoalsEmpty }}" hint-placeholder-val="{{ false }}">
    <div style="text-align:center;color:var(--text3);padding:20px 10px;font-size:13px;line-height:1.6">Crie uma meta para acompanhar seu progresso de economia</div>
  </sc-if>
</div>
```
Elementos exibidos por meta: nome, `savedStr / targetStr` (ex: "R$ 1.800,00 / R$ 5.000,00"), barra de progresso colorida, "Meta: {{ targetDateStr }}" (ex: "Meta: dez/26"), e `projLabel` (texto de projeção). Card inteiro clicável → abre modal de edição. Estado vazio: texto centralizado **"Crie uma meta para acompanhar seu progresso de economia"** (sem ícone/CTA extra — o CTA "+ Nova" já fica sempre visível no cabeçalho da seção).

---

## FASE 6 — Microinterações e onboarding

### 1. Pull-to-refresh

**Handlers completos (linhas 1604-1619):**
```js
mainPtrDown(e){this._pullScroller=e.currentTarget;this._pullStartY=e.clientY;this._pullStartX=e.clientX;this._pullTracking=e.currentTarget.scrollTop<=0&&!this.state.refreshing;}
mainPtrMove(e){
  if(!this._pullTracking)return;
  const dy=e.clientY-this._pullStartY,dx=e.clientX-this._pullStartX;
  if(dy<=4||Math.abs(dx)>Math.abs(dy)){if(this.state.pullY!==0)this.setState({pullY:0});return;}
  if(this._pullScroller.scrollTop>0){this._pullTracking=false;this.setState({pullY:0});return;}
  this.setState({pullY:Math.min(84,dy*0.5)});
}
mainPtrUp(){
  if(!this._pullTracking)return;
  this._pullTracking=false;
  if(this.state.pullY>=48){
    this.setState({refreshing:true,pullY:60});
    setTimeout(()=>{this.setState({refreshing:false,pullY:0});this.toast('Atualizado!','var(--green)');},900);
  }else{this.setState({pullY:0});}
}
```

**Derived values usadas no render (linhas 1814-1820):**
```js
const pullY=s.pullY||0;
const pullPct=Math.min(1,pullY/48);
const pullOpacity=s.refreshing?1:pullPct;
const pullRotate=s.refreshing?0:Math.round(pullPct*220);
const pullSpinAnim=s.refreshing?'spinCW .7s linear infinite':'none';
const pullIconColor=pullPct>=1||s.refreshing?'var(--blue)':'var(--text3)';
const mainPtrDown=e=>this.mainPtrDown(e),mainPtrMove=e=>this.mainPtrMove(e),mainPtrUp=()=>this.mainPtrUp();
```

**Extração dos parâmetros:**
- **Rubber-banding/easing do movimento:** `dy*0.5` — o deslocamento vertical do dedo é multiplicado por `0.5` (efeito de resistência), e limitado a máximo `84px` (`Math.min(84, dy*0.5)`).
- **Threshold para disparar refresh:** `pullY>=48` (48px).
- **Tracking só ativa se:** o scroll do container já está no topo (`scrollTop<=0`) e não está em refresh (`!this.state.refreshing`). Também cancela se o movimento for mais horizontal que vertical (`Math.abs(dx)>Math.abs(dy)`) ou se o scroll saiu do topo durante o gesto.
- **Rotação do ícone durante o pull:** `Math.round(pullPct*220)` graus (até 220°, proporcional ao pull).
- **Ao soltar com pull suficiente:** `refreshing:true`, `pullY` fixado em `60`; após `900ms` (`setTimeout`), `refreshing:false`, `pullY:0`, e dispara toast.
- **Texto exato do toast de confirmação:** `'Atualizado!'`, cor verde (`'var(--green)'`).
- **Se soltar sem atingir o threshold:** apenas `pullY:0` (sem toast, sem refresh).
- **Spinner:** enquanto `refreshing`, ícone gira continuamente via CSS `spinCW .7s linear infinite`; durante o "puxar" (antes de soltar) não gira, só rotaciona proporcionalmente (`pullRotate`).
- **Cor do ícone:** cinza `var(--text3)` até atingir 100% do pull (`pullPct>=1`) ou enquanto `refreshing`, quando fica azul `var(--blue)`.

**Markup (linhas 61-65):**
```html
<div class="ph-scroll" onPointerDown="{{ mainPtrDown }}" onPointerMove="{{ mainPtrMove }}" onPointerUp="{{ mainPtrUp }}" style="position:absolute;inset:0;bottom:64px;overflow-y:auto;color:var(--text)">
  ...
  <div style="position:absolute;top:{{ pullY }}px;left:0;right:0;display:flex;justify-content:center;padding-top:6px;pointer-events:none;z-index:5;transition:top .25s cubic-bezier(.34,1.56,.64,1)">
    <div style="width:30px;height:30px;border-radius:50%;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:{{ pullOpacity }};transform:translateY(-38px)">
      <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:{{ pullIconColor }};fill:none;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round;transform:rotate({{ pullRotate }}deg);animation:{{ pullSpinAnim }}"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
    </div>
  </div>
```
Ícone: círculo flutuante com ícone SVG de "refresh"/seta circular, posicionado com `top: {{pullY}}px`, animado com easing `cubic-bezier(.34,1.56,.64,1)` (spring-like).

---

### 2. Haptics visuais (flash de cor)

**Trigger central: dentro do método `toast()` (linhas 1530-1535):**
```js
toast(msg,color){const c=color||'var(--blue)';this._toastGen=(this._toastGen||0)+1;const gen=this._toastGen;this.setState({toast:{msg,color:c},toastClosing:false});clearTimeout(this._tt);clearTimeout(this._tt2);this._tt=setTimeout(()=>{if(this._toastGen===gen)this.setState({toastClosing:true});},2100);this._tt2=setTimeout(()=>{if(this._toastGen===gen)this.setState({toast:null,toastClosing:false});},2400);
  // E16: flash visual sutil sincronizado com o toast (feedback de conclusão de ação)
  this._flashGen=(this._flashGen||0)+1;const fgen=this._flashGen;
  this.setState({flashColor:c,flashOn:true});
  clearTimeout(this._ft);this._ft=setTimeout(()=>{if(this._flashGen===fgen)this.setState({flashOn:false});},520);
}
```

**Como sincroniza:** toda vez que `this.toast(msg, color)` é chamado (para qualquer ação — salvar, excluir, atualizar), a mesma cor (`color`, default `'var(--blue)'`) é usada tanto para o toast quanto para o flash. `flashOn` é setado `true` imediatamente e volta a `false` após **520ms** (`setTimeout(...,520)`), usando um contador de geração (`_flashGen`) para evitar que um flash antigo cancele um novo. Não há classe CSS adicionada/removida manualmente — é controlado via `sc-if value="{{ flashOn }}"` no template, que monta/desmonta o elemento (a animação CSS roda uma vez ao montar).

**Cores do flash:** não há cores fixas por "sucesso/erro/aviso" separadas do texto — o flash usa exatamente a mesma cor passada pela chamada de `toast()`. Exemplos observados no código: verde `'var(--green)'` (sucesso: "Atualizado!", "Meta criada!", "Marcado como realizado!"), vermelho `'var(--red)'` (exclusão: "Removido", erros de validação como "Informe o nome da meta"), azul `'var(--blue)'` (default, ex: preset de tema aplicado), teal `'var(--teal)'` ("Categoria atualizada!").

**Markup do flash (linhas 998-1001):**
```html
<!-- flash de conclusão sincronizado com o toast (E16) -->
<sc-if value="{{ flashOn }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;inset:0;z-index:44;pointer-events:none;border-radius:34px;box-shadow:inset 0 0 0 3px {{ flashColor }},inset 0 0 44px 2px {{ flashColor }};animation:flashPulse .52s ease-out"></div>
</sc-if>
```
Efeito: borda interna de 3px + glow interno de 44px, ambos na cor do flash, cobrindo toda a tela (borda arredondada 34px = mesma do device frame), com animação `flashPulse .52s ease-out` (fade in rápido a 18% depois fade out até 100%, conforme keyframe já conhecido).

---

### 3. Estados vazios ilustrados com CTA (empty states)

Encontrados **5 estados vazios** com ícone + texto + CTA (mais 1 estado vazio simples sem CTA — metas de economia, já documentado na seção C9 acima):

**a) Lançamentos (transações) — linhas 337-344:**
```html
<sc-if value="{{ txEmpty }}" hint-placeholder-val="{{ false }}">
  <div style="text-align:center;padding:36px 20px;display:flex;flex-direction:column;align-items:center;gap:10px">
    <div style="width:52px;height:52px;border-radius:16px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:24px">🗂️</div>
    <div style="font-size:14px;color:var(--text2);font-weight:500">Nenhum lançamento neste filtro</div>
    <div style="font-size:12px;color:var(--text3);max-width:220px;line-height:1.5">Ajuste os filtros acima ou registre um novo lançamento</div>
    <button onClick="{{ openNewTx }}" style-active="transform:scale(.96)" style="margin-top:4px;background:var(--blue);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">+ Novo lançamento</button>
  </div>
</sc-if>
```
Ícone: `🗂️`. Título: **"Nenhum lançamento neste filtro"**. Subtítulo: **"Ajuste os filtros acima ou registre um novo lançamento"**. CTA: **"+ Novo lançamento"** → `openNewTx` (abre modal de novo lançamento).

**b) Calendário — linhas 400-407:**
```html
<sc-if value="{{ calEmptyMonth }}" hint-placeholder-val="{{ false }}">
  <div style="text-align:center;padding:36px 20px;display:flex;flex-direction:column;align-items:center;gap:10px">
    <div style="width:52px;height:52px;border-radius:16px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:24px">📅</div>
    <div style="font-size:14px;color:var(--text2);font-weight:500">Nenhum lançamento com data neste mês</div>
    <div style="font-size:12px;color:var(--text3);max-width:220px;line-height:1.5">Lançamentos com data aparecem marcados no calendário</div>
    <button onClick="{{ openNewTx }}" style-active="transform:scale(.96)" style="margin-top:4px;background:var(--blue);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">+ Novo lançamento</button>
  </div>
</sc-if>
```
Ícone: `📅`. Título: **"Nenhum lançamento com data neste mês"**. Subtítulo: **"Lançamentos com data aparecem marcados no calendário"**. CTA: **"+ Novo lançamento"** → `openNewTx`.

**c) Cartões — linhas 442-449:**
```html
<sc-if value="{{ cardsEmpty }}" hint-placeholder-val="{{ false }}">
  <div style="text-align:center;padding:36px 20px;display:flex;flex-direction:column;align-items:center;gap:10px">
    <div style="width:52px;height:52px;border-radius:16px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:24px">💳</div>
    <div style="font-size:14px;color:var(--text2);font-weight:500">Nenhum cartão neste filtro</div>
    <div style="font-size:12px;color:var(--text3);max-width:220px;line-height:1.5">Cadastre um cartão pra acompanhar a fatura por aqui</div>
    <button onClick="{{ openNewCartao }}" style-active="transform:scale(.96)" style="margin-top:4px;background:var(--blue);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">+ Novo cartão</button>
  </div>
</sc-if>
```
Ícone: `💳`. Título: **"Nenhum cartão neste filtro"**. Subtítulo: **"Cadastre um cartão pra acompanhar a fatura por aqui"**. CTA: **"+ Novo cartão"** → `openNewCartao`.

**d) Categorias orçadas — linhas 676-683:**
```html
<sc-if value="{{ categoriasEmpty }}" hint-placeholder-val="{{ false }}">
  <div style="text-align:center;padding:20px 10px;display:flex;flex-direction:column;align-items:center;gap:8px">
    <div style="width:44px;height:44px;border-radius:14px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:20px">🏷️</div>
    <div style="font-size:13px;color:var(--text2);font-weight:500">Nenhuma categoria orçada ainda</div>
    <div style="font-size:11px;color:var(--text3);max-width:200px;line-height:1.5">Crie categorias como "Mercado" pra acompanhar o quanto gasta em cada uma</div>
    <button onClick="{{ openAddCategoria }}" style-active="transform:scale(.96)" style="margin-top:2px;background:var(--blue);color:#fff;border:none;border-radius:9px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">+ Nova categoria</button>
  </div>
</sc-if>
```
Ícone: `🏷️` (menor, 44px/20px vs os outros 52px/24px — é uma sub-seção dentro da tela Orçamento). Título: **"Nenhuma categoria orçada ainda"**. Subtítulo: **`Crie categorias como "Mercado" pra acompanhar o quanto gasta em cada uma`**. CTA: **"+ Nova categoria"** → `openAddCategoria`.

**e) Orçamento (itens de orçamento) — linhas 698-705:**
```html
<sc-if value="{{ budgetEmpty }}" hint-placeholder-val="{{ false }}">
  <div style="text-align:center;padding:36px 20px;display:flex;flex-direction:column;align-items:center;gap:10px">
    <div style="width:52px;height:52px;border-radius:16px;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:24px">🎯</div>
    <div style="font-size:14px;color:var(--text2);font-weight:500">Nenhum item de orçamento neste filtro</div>
    <div style="font-size:12px;color:var(--text3);max-width:220px;line-height:1.5">Adicione fixas, variáveis e receitas planejadas pro mês</div>
    <button onClick="{{ openNewBudget }}" style-active="transform:scale(.96)" style="margin-top:4px;background:var(--blue);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">+ Novo item</button>
  </div>
</sc-if>
```
Ícone: `🎯`. Título: **"Nenhum item de orçamento neste filtro"**. Subtítulo: **"Adicione fixas, variáveis e receitas planejadas pro mês"**. CTA: **"+ Novo item"** → `openNewBudget`.

**Padrão comum:** ícone em círculo (52x52 padrão, 44x44 na sub-seção), título 14px/weight 500 (13px na sub-seção), subtítulo 12px cor `text3` max-width 220px (11px/200px na sub-seção), botão azul sólido com `+ ` prefixado no label, feedback tátil `transform:scale(.96)` no toque.

---

### 4. Tour guiado (4 balões)

**Conteúdo exato dos 4 passos (linhas 1417-1422, constante `TOUR_STEPS`):**
```js
const TOUR_STEPS=[
  {icon:'👋',title:'Bem-vindo ao Finanças!',text:'Um tour rápido pelos recursos principais — leva 20 segundos.',page:'dash'},
  {icon:'➕',title:'Botão de ação rápida',text:'Toque no botão azul flutuante, no canto inferior direito, para criar um lançamento, orçamento ou gasto de cartão na hora.',page:'dash'},
  {icon:'🎚️',title:'Filtros de pessoa e período',text:'Use as pílulas coloridas para ver só os gastos de uma pessoa, e as setas ‹ › para trocar de mês.',page:'dash'},
  {icon:'👈',title:'Arraste para agir rápido',text:'Arraste qualquer lançamento para a esquerda para editar ou excluir sem abrir tela nenhuma.',page:'tx'},
];
```
Passo 1 (👋 Boas-vindas, tela `dash`): título **"Bem-vindo ao Finanças!"**, texto **"Um tour rápido pelos recursos principais — leva 20 segundos."**
Passo 2 (➕ FAB, tela `dash`): título **"Botão de ação rápida"**, texto **"Toque no botão azul flutuante, no canto inferior direito, para criar um lançamento, orçamento ou gasto de cartão na hora."**
Passo 3 (🎚️ Filtros, tela `dash`): título **"Filtros de pessoa e período"**, texto **"Use as pílulas coloridas para ver só os gastos de uma pessoa, e as setas ‹ › para trocar de mês."**
Passo 4 (👈 Swipe, tela `tx`): título **"Arraste para agir rápido"**, texto **"Arraste qualquer lançamento para a esquerda para editar ou excluir sem abrir tela nenhuma."**

**Mecanismo — NÃO é overlay posicionado sobre elementos-alvo específicos.** É um bottom-sheet modal genérico (mesma técnica visual dos outros modais/sheets do app), que muda o `page` do app conforme o passo (para o passo 4, navega para a tela `tx`), mas não há coordenadas/refs apontando para um elemento específico na tela — é puramente um card informativo com ícone + título + texto sobreposto à tela de fundo escurecida.

**Métodos (linhas 1601-1603):**
```js
startTour(){this.setState({tourStep:0,page:'dash'});}
nextTourStep(){this.setState(s=>{const n=s.tourStep+1;if(n>=TOUR_STEPS.length)return{tourStep:null};const step=TOUR_STEPS[n];return{tourStep:n,page:step.page||s.page};});}
skipTour(){this.setState({tourStep:null});}
```

**Derived (linhas 1823-1828):**
```js
const isTourActive=s.tourStep!=null;
const tourStepData=isTourActive?TOUR_STEPS[s.tourStep]:null;
const tourIcon=tourStepData?tourStepData.icon:'',tourTitle=tourStepData?tourStepData.title:'',tourText=tourStepData?tourStepData.text:'';
const tourNextLabel=(isTourActive&&s.tourStep===TOUR_STEPS.length-1)?'Concluir':'Próximo';
const tourDots=TOUR_STEPS.map((_,i)=>({width:i===s.tourStep?'20px':'6px',bg:i===s.tourStep?'var(--blue)':'var(--bg4)'}));
```
Label do botão de avançar: **"Próximo"** em todos os passos exceto o último, que vira **"Concluir"**.

**Markup do overlay (linhas 962-980):**
```html
<!-- ===================== TOUR GUIADO (F21) ===================== -->
<sc-if value="{{ isTourActive }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);display:flex;align-items:flex-end;animation:fadeBg .2s ease">
  <div style="background:var(--bg2);border-radius:22px 22px 0 0;border:1px solid var(--border);width:100%;padding:22px 20px 26px;animation:sheetUp .3s cubic-bezier(.4,0,.2,1)">
    <div style="display:flex;justify-content:center;gap:6px;margin-bottom:16px">
      <sc-for list="{{ tourDots }}" as="td" hint-placeholder-count="4">
        <div style="width:{{ td.width }};height:6px;border-radius:3px;background:{{ td.bg }};transition:all .25s"></div>
      </sc-for>
    </div>
    <div style="width:56px;height:56px;border-radius:18px;background:var(--blue-bg);border:1px solid var(--blue-border);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 16px">{{ tourIcon }}</div>
    <div style="font-size:17px;font-weight:700;text-align:center;margin-bottom:8px">{{ tourTitle }}</div>
    <div style="font-size:13px;color:var(--text2);text-align:center;line-height:1.6;margin-bottom:22px;padding:0 8px">{{ tourText }}</div>
    <div style="display:flex;gap:8px">
      <button onClick="{{ skipTour }}" style-active="transform:scale(.96)" style="flex:1;background:transparent;color:var(--text2);border:1px solid var(--border2);border-radius:10px;padding:12px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif">Pular</button>
      <button onClick="{{ nextTourStep }}" style-active="transform:scale(.96)" style="flex:2;background:var(--blue);color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">{{ tourNextLabel }}</button>
    </div>
  </div>
</div>
</sc-if>
```
Progressão: dots animados no topo (dot ativo mede 20px de largura, inativos 6px, cor azul vs `bg4`). Botões: **"Pular"** (skip, largura `flex:1`) e botão de próximo/concluir com label dinâmico (largura `flex:2`, azul).

**Re-acesso (Configurações → Aplicativo, linha 859):**
```html
<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0"><div><div style="font-size:14px;font-weight:500">🧭 Tour guiado</div><div style="font-size:12px;color:var(--text3);margin-top:2px">Reveja os recursos principais do app</div></div><button onClick="{{ startTour }}" ...>Iniciar</button></div>
```
Label exato: **"🧭 Tour guiado"**, subtítulo **"Reveja os recursos principais do app"**, botão **"Iniciar"** → chama `startTour()`.

---

### 5. Splash screen

**Markup completo (linhas 986-996):**
```html
<sc-if value="{{ splashOn }}" hint-placeholder-val="{{ false }}">
  <div style="position:absolute;inset:0;z-index:70;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;animation:splashFade .45s ease 1.2s forwards">
    <div style="width:86px;height:86px;border-radius:24px;background:linear-gradient(145deg,var(--blue),#7c5cff);display:flex;align-items:center;justify-content:center;box-shadow:0 16px 40px var(--blue-bg);animation:popIn .5s cubic-bezier(.34,1.56,.64,1) both">
      <svg viewBox="0 0 48 48" style="width:52px;height:52px">
        <polyline points="8,32 17,26 24,30 32,18 40,13" pathLength="1" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1;animation:drawLine .85s cubic-bezier(.4,0,.2,1) .25s forwards"></polyline>
        <circle cx="40" cy="13" r="3.2" fill="#fff" style="opacity:0;animation:fadeBg .3s ease 1s forwards"></circle>
      </svg>
    </div>
    <div style="font-size:16px;font-weight:700;letter-spacing:.3px;color:var(--text);opacity:0;animation:fadeBg .4s ease .55s forwards">Finanças</div>
  </div>
</sc-if>
```

**Detalhamento:**
- Container/logo: quadrado arredondado 86x86px, gradiente `linear-gradient(145deg,var(--blue),#7c5cff)`, animação de entrada `popIn .5s cubic-bezier(.34,1.56,.64,1) both` (spring pop-in).
- Ícone SVG (sparkline): `viewBox="0 0 48 48"`, tamanho 52x52. Traçado da linha (`<polyline>`): pontos `"8,32 17,26 24,30 32,18 40,13"` (uma linha ascendente estilo gráfico de mercado subindo). `stroke="#fff"`, `stroke-width="3.4"`. **Draw-on animation:** `stroke-dasharray:1; stroke-dashoffset:1` com `pathLength="1"` (normaliza o path para comprimento 1), animado via `animation:drawLine .85s cubic-bezier(.4,0,.2,1) .25s forwards` (delay de 0.25s, duração 0.85s).
- Ponto final (`<circle cx="40" cy="13" r="3.2" fill="#fff">`): começa `opacity:0`, aparece com `animation:fadeBg .3s ease 1s forwards` (delay 1s — depois que a linha termina de desenhar).
- Nome do app: texto **"Finanças"**, 16px, weight 700, `letter-spacing:.3px`, aparece com `animation:fadeBg .4s ease .55s forwards` (delay 0.55s).
- **Duração total do splash:** controlada por `this._splashT=setTimeout(()=>this.setState({splash:false}),1650);` (linha 1568) — **1650ms** (não exatamente 1.6s, mas próximo — 1.65s). O `splashFade .45s ease 1.2s forwards` no wrapper (fade-out iniciando aos 1.2s, terminando aos 1.65s) é a animação CSS que remove visualmente o splash, sincronizada com o timeout de 1650ms que desmonta o componente do estado.
- Estado inicial: `splash:true` (linha 1455, seed inicial do state).

**Keyframe confirmado:** `@keyframes splashFade{to{opacity:0;visibility:hidden}}` (linha 35, já conhecido).

---

### 6. Ripple de tema

**Keyframe confirmado (linha 36):** `@keyframes themeRipple{0%{clip-path:circle(0% at 82% 12%);opacity:.85}100%{clip-path:circle(150% at 82% 12%);opacity:0}}` — origina do canto superior direito (82% horizontal, 12% vertical — aproximadamente onde fica o botão de toggle de tema no header).

**Markup (linhas 982-985):**
```html
<!-- ===================== G4: RIPPLE DE TEMA + SPLASH ===================== -->
<sc-if value="{{ revealOn }}" hint-placeholder-val="{{ false }}">
  <div style="position:absolute;inset:0;z-index:64;pointer-events:none;background:var(--bg);animation:themeRipple .6s ease-out forwards"></div>
</sc-if>
```
`revealOn:!!s.themeReveal` (linha 2315).

**Handlers que disparam o ripple (linhas 1627-1632):**
```js
_fireReveal(){this._revealGen=(this._revealGen||0)+1;const g=this._revealGen;clearTimeout(this._revT);this._revT=setTimeout(()=>{if(this._revealGen===g)this.setState({themeReveal:false});},680);}
toggleTheme(){const eff=this._effTheme(this.state);this.setState({theme:eff==='dark'?'light':'dark',autoTheme:false,themeReveal:true});this._fireReveal();this._persistSoon();}
toggleAutoTheme(){this.setState(s=>({autoTheme:!s.autoTheme,themeReveal:true}));this._fireReveal();this._persistSoon();}
applyPreset(p){if(this._psMoved)return;this.setState({theme:p.theme,mood:p.mood,accent:p.accent,surface:p.surface,oled:!!p.oled,autoTheme:false,themeReveal:true});this._fireReveal();this._persistSoon();this.toast('Tema "'+p.name+'" aplicado','var(--blue)');}
```
Botão que dispara (`toggleTheme`, chamado a partir de dois botões no template — linha 51 no header/canto superior direito, e linha 791 na tela de Configurações):
```html
<button onClick="{{ toggleTheme }}" style="display:flex;align-items:center;gap:8px;background:#1c2038;border:1px solid #323760;border-radius:30px;padding:7px 14px 7px 9px;cursor:pointer;color:#eef0ff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500">
```
(linha 51 — este é o botão fixo no header superior direito da tela, correspondendo à origem `82% 12%` do keyframe).

**Ciclo:** `toggleTheme()` seta `themeReveal:true` (mostra o ripple via `sc-if`) e imediatamente chama `_fireReveal()`, que agenda `themeReveal:false` após **680ms** (a animação CSS dura 600ms — `.6s` — mas o estado permanece true por 680ms para dar folga). Usa contador de geração (`_revealGen`) para evitar limpeza de um ripple mais recente por um timeout antigo.

---

### 7. Micro-bounce no ícone do nav

**Keyframe confirmado (linha 34):** `@keyframes navBounce{0%{transform:scale(1)}40%{transform:scale(1.26)}70%{transform:scale(.94)}100%{transform:scale(1)}}`

**Método (linha 1634):**
```js
navAnim(p){return this.state.page===p?'navBounce .42s cubic-bezier(.34,1.56,.64,1)':'none';}
```
Retorna a animação apenas quando a página atual (`this.state.page`) é igual à página do item de nav (`p`) — ou seja, o bounce toca **toda vez que a tela re-renderiza com aquele item ativo** (inclusive ao navegar para ela).

**Binding no template (linhas 2316):**
```js
navDashAnim:this.navAnim('dash'),navTxAnim:this.navAnim('tx'),navCardsAnim:this.navAnim('cards'),navProjAnim:this.navAnim('proj'),navBudgetAnim:this.navAnim('budget'),
```

**Uso no SVG do ícone (exemplo, linha 1025 — item "Lançam."):**
```html
<button onClick="{{ goTx }}" style-active="transform:scale(.88)" style="flex:1;padding:10px 0;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;color:{{ navTx }};transition:color .25s,transform .15s"><svg viewBox="0 0 24 24" style="width:21px;height:21px;animation:{{ navTxAnim }};stroke:currentColor;...">...</svg><span style="font-size:10px">Lançam.</span></button>
```
A animação é aplicada diretamente no `<svg>` do ícone (não no botão inteiro), via `animation:{{ navTxAnim }}` — cada item de nav (`dash`, `tx`, `cards`, `proj`, `budget`) tem seu próprio binding análogo (`navDashAnim`, `navCardsAnim`, `navProjAnim`, `navBudgetAnim`).

---

### 8. Dígitos "slot machine" no saldo

**Construção do array `balSlot` (linha 2317):**
```js
balSlot:((c.balance>=0?'+':'−')+this.fmt(Math.abs(c.balance))).split('').map(ch=>{const di='0123456789'.indexOf(ch);return di>=0?{isDigit:true,isPlain:false,char:'',shift:'translateY(-'+di+'em)'}:{isDigit:false,isPlain:true,char:ch,shift:''};}),
```
**Mecanismo:**
1. Monta a string completa do saldo formatado: sinal (`+` ou `−`) + valor absoluto formatado (`this.fmt(Math.abs(c.balance))`, provavelmente algo como "R$ 1.234,56").
2. `.split('')` quebra a string em caracteres individuais.
3. Para cada caractere, verifica se é um dígito (`'0123456789'.indexOf(ch) >= 0`):
   - Se **é dígito**: `{isDigit:true, isPlain:false, char:'', shift:'translateY(-'+di+'em)'}` — `di` é o índice do dígito (0-9) dentro da string `'0123456789'`, usado para calcular o deslocamento vertical.
   - Se **não é dígito** (R$, espaço, vírgula, ponto, sinal +/−): `{isDigit:false, isPlain:true, char:ch, shift:''}` — renderizado como texto plano, sem animação.

**Técnica de "rolo" (column-roll) — markup (linhas 127-136):**
```html
<div style="display:flex;font-size:38px;font-weight:600;font-family:'DM Mono',monospace;line-height:1;color:{{ balColor }}">
  <sc-for list="{{ balSlot }}" as="bd" hint-placeholder-count="10">
    <sc-if value="{{ bd.isDigit }}" hint-placeholder-val="{{ false }}">
      <span style="display:inline-block;height:1em;overflow:hidden">
        <span style="display:block;transition:transform .55s cubic-bezier(.25,.9,.3,1);transform:{{ bd.shift }}"><span style="display:block;height:1em">0</span><span style="display:block;height:1em">1</span><span style="display:block;height:1em">2</span><span style="display:block;height:1em">3</span><span style="display:block;height:1em">4</span><span style="display:block;height:1em">5</span><span style="display:block;height:1em">6</span><span style="display:block;height:1em">7</span><span style="display:block;height:1em">8</span><span style="display:block;height:1em">9</span></span>
      </span>
    </sc-if>
    <sc-if value="{{ bd.isPlain }}" hint-placeholder-val="{{ true }}"><span style="display:inline-block;height:1em">{{ bd.char }}</span></sc-if>
  </sc-for>
</div>
```
- Cada posição de dígito é um `<span>` com `height:1em; overflow:hidden` (janela de recorte).
- Dentro, uma coluna com os 10 dígitos (0-9) empilhados verticalmente (`display:block; height:1em` cada), formando uma "fita" vertical.
- O deslocamento vertical (`transform:translateY(-{di}em)`) posiciona o dígito correto visível dentro da janela — ex: dígito "3" → `translateY(-3em)` desloca a fita para cima 3 unidades, revelando o "3" na janela.
- **Timing/easing da transição:** `transition:transform .55s cubic-bezier(.25,.9,.3,1)` — quando o valor muda, o CSS transita suavemente entre as posições (efeito "rolo de slot machine").
- Fonte: `'DM Mono', monospace`, 38px, weight 600, cor `{{ balColor }}` (verde se saldo positivo, vermelho se negativo).
- Caracteres não-dígito (R$, vírgula, ponto, sinal) são renderizados como `<span style="display:inline-block;height:1em">{{ bd.char }}</span>` sem a técnica de rolo — aparecem/mudam instantaneamente.

---

### 9. Ícones por categoria orçada

**Lista exata de emojis oferecidos (linha 1436, constante `CAT_ICONS`, 20 itens, na ordem exata):**
```js
const CAT_ICONS=['🛒','⛽','🍽️','🏠','💊','🎓','🎮','👕','🚗','🐶','✈️','🎁','📱','💡','🏋️','☕','🎬','🧾','💳','🎵'];
```
Ordem: 🛒 (carrinho), ⛽ (combustível), 🍽️ (talheres), 🏠 (casa), 💊 (remédio), 🎓 (formatura), 🎮 (controle de videogame), 👕 (camiseta), 🚗 (carro), 🐶 (cachorro), ✈️ (avião), 🎁 (presente), 📱 (celular), 💡 (lâmpada), 🏋️ (halter/academia), ☕ (café), 🎬 (cinema), 🧾 (nota fiscal), 💳 (cartão), 🎵 (música).

**Grid picker no modal de categoria (linhas 1102-1107):**
```html
<div style="margin-bottom:13px">
  <label style="display:block;font-size:12px;color:var(--text2);margin-bottom:5px;font-weight:500">Ícone</label>
  <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:5px">
    <sc-for list="{{ catIconOptions }}" as="ci" hint-placeholder-count="20">
      <button onClick="{{ ci.onClick }}" style-active="transform:scale(.88)" style="{{ ci.style }}">{{ ci.ic }}</button>
    </sc-for>
  </div>
</div>
```
Grid de 10 colunas (2 linhas de 10 para os 20 ícones). Label do campo: **"Ícone"**.

**Build de `catIconOptions` (linha 2392):**
```js
catIconOptions:CAT_ICONS.map(ic=>({ic,onClick:()=>this.setDraft({icon:(d&&d.icon)===ic?null:ic}),style:(d&&d.icon)===ic?'aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--blue-bg);border:1.5px solid var(--blue);border-radius:8px;cursor:pointer;padding:0;transition:transform .1s':'aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--bg4);border:1px solid var(--border2);border-radius:8px;cursor:pointer;padding:0;transition:transform .1s'})),
```
Clique no ícone alterna: se já selecionado, desmarca (`null`); senão seleciona. Ícone selecionado ganha destaque visual: fundo `var(--blue-bg)`, borda `1.5px solid var(--blue)` (vs não-selecionado: fundo `var(--bg4)`, borda `1px solid var(--border2)`).

**Modelo de dados — campo `icon`:**
- Armazenado na property `icon` do registro de `budgets` (categoria orçada é um item de `budgets` com `isCategoriaOnly:true` ou `categoriaKey` setado). Ver `openAddCategoria` (linha 1727): `draft:{id:null,name:'',value:'',icon:null}`; `openEditCategoria` (linha 1728): `icon:c.icon||null`; `saveCategoria` (linhas 1731-1739) persiste `icon:d.icon||null` tanto em update (linha 1735) quanto em criação (linha 1738).
- Default/fallback quando não definido: emoji `'🏷️'` (etiqueta) — visto em `categoriasList` (linha 2187: `icon:cat.icon||'🏷️'`) e em `catDetail` (linha 2209: `icon:cat.icon||'🏷️'`).

**Todos os lugares onde `icon` é renderizado:**
1. **Lista de categorias orçadas na tela Orçamento** (linha 687): `<div style="font-size:14px;font-weight:500"><span style="margin-right:6px">{{ cat.icon }}</span>{{ cat.name }}</div>`
2. **Sheet de detalhe da categoria** (linha 1063): `<div style="font-size:16px;font-weight:600;margin-bottom:4px"><span style="margin-right:6px">{{ catDetail.icon }}</span>{{ catDetail.name }}</div>`
3. **Modal de criar/editar categoria** — o próprio picker de ícones (linhas 1102-1107), onde o usuário escolhe o `icon`.

Não encontrado: uso do campo `icon` da categoria no relatório mensal (`reportCategorias`, linha 1886-1889) — essa listagem usa apenas `name`, `valStr`, `pct`, `pctW`, sem ícone. (Nota: existe um campo `icon` diferente e não relacionado em `reportRecords`/`rr.icon`, linha 931, que é usado para "Recordes" do relatório — não é o ícone de categoria, é outro dataset.)