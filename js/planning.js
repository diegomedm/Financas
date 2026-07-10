/* ══════════════════════════════════════════════════════════════════════
   FASE 5 — Planejamento (Dashboard)
   Fonte: .claude/discovery/extracted-specs-fase56.md (seções "FASE 5")
   Três blocos, cada um com sua própria função de render, chamados a partir
   de renderDash() (transactions.js) via renderPlanningDash() — adição
   cirúrgica, sem alterar o corpo existente de renderDash().
   ══════════════════════════════════════════════════════════════════════ */

/* ── C10: Limite mensal de gasto livre ──
   Storage: localStorage 'limiteVariavel' (número). Sem valor = sem limite configurado. */
function getLimiteVariavel(){
  const v=parseFloat(localStorage.getItem('limiteVariavel'));
  return isNaN(v)?0:v;
}
function setLimiteVariavel(raw){
  const v=parseFloat(String(raw).replace(',','.'));
  localStorage.setItem('limiteVariavel',isNaN(v)?'0':String(v));
}

/* ── C9: Metas de economia ──
   Decisão de implementação: localStorage (array JSON), não IndexedDB.
   Motivo: dados pequenos, não-transacionais, sem necessidade de índices/queries
   complexas: um array simples é suficiente e evita bump de versão do banco
   (js/db.js está sob risco de mudanças concorrentes de outras fases em paralelo
   nesta sessão — alterar openDB()/onupgradeneeded aqui seria arriscado).
   Cada meta: {id, name, target, saved, targetMonth, targetYear} */
function getGoals(){
  try{
    const raw=localStorage.getItem('financas-goals');
    const arr=raw?JSON.parse(raw):[];
    return Array.isArray(arr)?arr:[];
  }catch{return[];}
}
function saveGoalsList(goals){
  localStorage.setItem('financas-goals',JSON.stringify(goals));
}
function nextGoalId(goals){
  return goals.length?Math.max(...goals.map(g=>g.id))+1:1;
}

function openGoalModal(id){
  const goals=getGoals();
  const g=id?goals.find(x=>x.id===id):null;
  const isEdit=!!g;
  const monthOptions=MONTHS.map((m,i)=>`<option value="${i}"${(g?g.targetMonth:curMonth)===i?' selected':''}>${m}</option>`).join('');
  const yearBase=curYear;
  let yearOptions='';
  for(let y=yearBase;y<=yearBase+5;y++){
    yearOptions+=`<option value="${y}"${(g?g.targetYear:curYear)===y?' selected':''}>${y}</option>`;
  }
  openModal(`
    <div class="modal-title">${isEdit?'Editar meta':'Nova meta'}</div>
    <div class="form-group">
      <label>Nome da meta</label>
      <input id="goal-name" placeholder="Ex: Viagem, Reserva de emergência..." value="${isEdit?g.name.replace(/"/g,'&quot;'):''}" oninput="clearFieldError('goal-name')">
      <div class="field-error-msg" id="goal-name-err"></div>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Valor alvo</label>
        <input id="goal-target" type="text" inputmode="decimal" placeholder="0,00" value="${isEdit?g.target:''}" oninput="clearFieldError('goal-target')">
        <div class="field-error-msg" id="goal-target-err"></div>
      </div>
      <div class="form-group">
        <label>Já guardado</label>
        <input id="goal-saved" type="text" inputmode="decimal" placeholder="0,00" value="${isEdit?g.saved:''}">
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Mês alvo</label>
        <select id="goal-month">${monthOptions}</select>
      </div>
      <div class="form-group">
        <label>Ano alvo</label>
        <select id="goal-year">${yearOptions}</select>
      </div>
    </div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-primary" style="flex:1" onclick="saveGoal(${isEdit?g.id:'null'})">Salvar</button>
      ${isEdit?'<button class="btn btn-danger" style="flex:1" onclick="deleteGoal('+g.id+')">Excluir</button>':''}
      <button class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancelar</button>
    </div>
  `);
}

function saveGoal(id){
  const name=(document.getElementById('goal-name')?.value||'').trim();
  const targetRaw=(document.getElementById('goal-target')?.value||'').replace(',','.');
  const savedRaw=(document.getElementById('goal-saved')?.value||'').replace(',','.');
  const target=parseFloat(targetRaw);
  const saved=parseFloat(savedRaw)||0;
  const targetMonth=parseInt(document.getElementById('goal-month')?.value);
  const targetYear=parseInt(document.getElementById('goal-year')?.value);
  if(!name){setFieldError('goal-name','Informe o nome da meta');return;}
  if(isNaN(target)||target<=0){setFieldError('goal-target','Informe um valor alvo válido');return;}
  const goals=getGoals();
  const rec={id:id||nextGoalId(goals),name,target,saved,targetMonth,targetYear};
  const idx=goals.findIndex(g=>g.id===id);
  if(idx>=0)goals[idx]=rec;else goals.push(rec);
  saveGoalsList(goals);
  closeModal();
  toast(id?'Meta atualizada!':'Meta criada!','var(--green)');
  renderDash();
}

function deleteGoal(id){
  const goals=getGoals();
  const g=goals.find(x=>x.id===id);
  if(!g)return;
  showConfirm('Remover meta?','Tem certeza que deseja remover "'+g.name+'"?',[
    {label:'Remover',cls:'btn-danger',action:()=>{
      saveGoalsList(goals.filter(x=>x.id!==id));
      closeModal();
      toast('Removido','var(--red)');
      renderDash();
    }},
    {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
  ]);
}

/* Ritmo médio de economia: média do saldo mensal dos últimos 6 meses (mesma janela
   usada no gráfico "Receita vs Saída" do dashboard — ver chart-render em cards-render.js
   não expõe a série pronta, então recalculamos aqui com calcMonth, igual ao padrão usado
   no restante do app). */
async function _avgSavingUltimos6Meses(){
  const all=await dbAll();
  const filtered=pessoaFilter?all.filter(t=>t.pessoaId===pessoaFilter):all;
  let total=0;
  for(let i=5;i>=0;i--){
    const rawM=curMonth-i;
    const m=(rawM%12+12)%12;
    const y=curYear+Math.floor(rawM/12);
    const{income,expense,credit}=calcMonth(filtered,y,m);
    total+=(income-expense-credit);
  }
  return total/6;
}

async function renderGoalsDash(){
  const el=document.getElementById('goals-list');
  const emptyEl=document.getElementById('goals-empty');
  if(!el)return;
  const goals=getGoals();
  if(!goals.length){
    el.innerHTML='';
    if(emptyEl)emptyEl.style.display='block';
    return;
  }
  if(emptyEl)emptyEl.style.display='none';
  const avgSaving=await _avgSavingUltimos6Meses();
  el.innerHTML=goals.map(g=>{
    const pct=g.target>0?Math.min(100,Math.round(g.saved/g.target*100)):0;
    const remaining=Math.max(0,g.target-g.saved);
    const isDone=g.saved>=g.target;
    let projLabel;
    let color;
    if(isDone){
      projLabel='🎉 Meta concluída!';
      color='var(--green)';
    }else if(avgSaving<=0){
      projLabel='Sem ritmo de economia suficiente';
      color=pct>=70?'var(--green)':pct>=35?'var(--amber)':'var(--blue)';
    }else{
      const monthsNeeded=Math.ceil(remaining/avgSaving);
      let pm=curMonth+monthsNeeded,py=curYear;
      while(pm>11){pm-=12;py++;}
      const targetDate=new Date(g.targetYear,g.targetMonth,1);
      const projDate=new Date(py,pm,1);
      const onTrack=projDate<=targetDate;
      projLabel=(onTrack?'✓ no prazo — ':'⚠ atrasada — ')+'proj. '+MONTHS[pm].slice(0,3)+'/'+String(py).slice(2);
      color=isDone?'var(--green)':(pct>=70?'var(--green)':pct>=35?'var(--amber)':'var(--blue)');
    }
    const targetDateStr=MONTHS[g.targetMonth].slice(0,3)+'/'+String(g.targetYear).slice(2);
    return '<div onclick="openGoalModal('+g.id+')" class="goal-item-row" style="cursor:pointer;margin-bottom:16px;transition:opacity .1s">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'+
      '<span style="font-size:13px;font-weight:500">'+g.name+'</span>'+
      '<span style="font-size:12px;font-family:var(--mono);color:var(--text2)">'+fmt(g.saved)+' / '+fmt(g.target)+'</span>'+
      '</div>'+
      '<div style="height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:6px">'+
      '<div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:3px;transition:width .5s cubic-bezier(.4,0,.2,1)"></div>'+
      '</div>'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
      '<span style="font-size:11px;color:var(--text3);flex-shrink:0">Meta: '+targetDateStr+'</span>'+
      '<span style="font-size:11px;color:'+color+';text-align:right;min-width:0">'+projLabel+'</span>'+
      '</div>'+
      '</div>';
  }).join('');
}

/* ── C11: Alertas inteligentes ── */
async function _buildAlertsList(){
  const alerts=[];
  const today=new Date();today.setHours(0,0,0,0);

  // 1) fatura de cartão vencendo em <=3 dias
  let nearestCard=null;
  try{
    const cartoes=await cartoesAll();
    cartoes.forEach(ct=>{
      let d=new Date(today.getFullYear(),today.getMonth(),ct.vencimento);
      if(d<today)d=new Date(today.getFullYear(),today.getMonth()+1,ct.vencimento);
      const diff=Math.ceil((d-today)/86400000);
      if(diff<=3&&(!nearestCard||diff<nearestCard.diff))nearestCard={diff,name:ct.name};
    });
  }catch(e){}
  if(nearestCard){
    alerts.push({
      icon:'💳',color:'var(--amber)',bg:'var(--amber-bg)',border:'var(--amber-border)',
      text:'Fatura do '+nearestCard.name+' vence '+(nearestCard.diff<=0?'hoje':nearestCard.diff===1?'amanhã':'em '+nearestCard.diff+'d'),
      onClick:"showPage('cards',document.querySelector('.nav-btn:nth-child(3)'))"
    });
  }

  // 2) categoria estourada (realizado >= orçado)
  try{
    const allBudgetItems=await budgetAll();
    const todosGastos=await gastosAll();
    const todasTx=await dbAll();
    const cartoesAllList=await cartoesAll();
    const cats=allBudgetItems.filter(b=>b.categoriaKey);
    let overCategoria=null;
    for(const cat of cats){
      const realizado=calcCategoriaRealizado(cat.id,todosGastos,todasTx,cartoesAllList,curMonth,curYear);
      if(cat.value>0&&realizado>=cat.value){overCategoria=cat;break;}
    }
    if(overCategoria){
      alerts.push({
        icon:'⚠️',color:'var(--red)',bg:'var(--red-bg)',border:'var(--red-border)',
        text:'Categoria "'+overCategoria.name+'" já estourou o orçamento',
        onClick:"showPage('budget',document.querySelector('.nav-btn:nth-child(5)'))"
      });
    }
  }catch(e){}

  // 3) saldo projetado negativo (mesma lógica de acumulação usada em renderProj)
  try{
    const negativeWarning=await _findNegativeProjection();
    if(negativeWarning){
      alerts.push({
        icon:'📉',color:'var(--red)',bg:'var(--red-bg)',border:'var(--red-border)',
        text:'Saldo projetado fica negativo em '+negativeWarning.month,
        onClick:"showPage('proj',document.querySelector('.nav-btn:nth-child(4)'))"
      });
    }
  }catch(e){}

  return alerts.slice(0,3);
}

/* Replica a soma progressiva de saldo mensal usada em renderProj() (projection.js),
   mas isolada aqui para não tocar em projection.js (fora de escopo/fase 4 em paralelo).
   Horizonte fixo de 12 meses a partir do mês atual, suficiente para detectar o primeiro
   mês em que o acumulado fica negativo. */
async function _findNegativeProjection(){
  const all=await dbAll();
  const budgets=await budgetAll();
  const allDone=await _budgetDoneAll();
  let projGastos=[],projCartoes=[];
  try{projGastos=await gastosAll();}catch(e){}
  try{projCartoes=await cartoesAll();}catch(e){}
  const categoriaItems=budgets.filter(b=>b.isCategoriaOnly&&b.categoriaKey);
  const txFiltered=pessoaFilter?all.filter(t=>t.pessoaId===pessoaFilter):all;
  const budgetsFiltered=pessoaFilter
    ?budgets.filter(item=>item.pessoaId===pessoaFilter&&!item.isCategoriaOnly)
    :budgets.filter(item=>!item.isCategoriaOnly);
  const doneKeySet=new Set(allDone.map(d=>d.key));
  const refM=parseInt(localStorage.getItem('refMonth'));
  const refY=parseInt(localStorage.getItem('refYear'));
  let _refM=refM,_refY=refY;
  if(isNaN(_refM)||isNaN(_refY)){const n=new Date();_refM=n.getMonth();_refY=n.getFullYear();}

  let acc=0;
  for(let i=0;i<12;i++){
    const m=(curMonth+i)%12;
    const y=curYear+Math.floor((curMonth+i)/12);
    const monthResult=calcMonth(txFiltered,y,m);
    let income=monthResult.income;
    let expense=monthResult.expense+monthResult.credit;
    const mm=String(m+1).padStart(2,'0');
    for(const item of budgetsFiltered){
      if(!_budgetItemAppliesTo(item,y,m))continue;
      const key=item.id+'_'+y+mm;
      if(doneKeySet.has(key))continue;
      const val=item.value||0;
      if(item.type==='income')income+=val;else expense+=val;
    }
    let citensDoMes=[];
    try{
      citensDoMes=await getCartaoBudgetItems(m,y);
      if(pessoaFilter)citensDoMes=citensDoMes.filter(c=>c.pessoaId===pessoaFilter);
    }catch(e){}
    for(const citem of citensDoMes){
      const ckey=citem.id+'_'+y+mm;
      if(doneKeySet.has(ckey))continue;
      expense+=citem.value||0;
    }
    const absMes=y*12+m,absRef=_refY*12+_refM;
    if(absMes>=absRef){
      for(const cat of categoriaItems){
        const orcado=cat.value||0;
        let realizado=0;
        if(absMes===absRef)realizado=calcCategoriaRealizado(cat.id,projGastos,all,projCartoes,m,y);
        expense+=Math.max(0,orcado-realizado);
      }
    }
    acc+=(income-expense);
    if(acc<0)return{month:MONTHS[m],idx:i};
  }
  return null;
}

async function renderAlertsDash(){
  const el=document.getElementById('alerts-list');
  if(!el)return;
  try{
    const alerts=await _buildAlertsList();
    if(!alerts.length){el.innerHTML='';el.style.display='none';return;}
    el.style.display='flex';
    el.innerHTML=alerts.map(al=>
      '<div onclick="'+al.onClick+'" class="dash-alert-row" style="display:flex;align-items:center;gap:10px;background:'+al.bg+';border:1px solid '+al.border+';border-radius:12px;padding:10px 12px;cursor:pointer;transition:transform .1s">'+
      '<span style="font-size:16px;flex-shrink:0">'+al.icon+'</span>'+
      '<span style="flex:1;font-size:12px;font-weight:500;color:'+al.color+';min-width:0">'+al.text+'</span>'+
      '<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:'+al.color+';fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>'+
      '</div>'
    ).join('');
  }catch(e){
    console.error('[renderAlertsDash]',e);
  }
}

/* ── C10: render da barra de limite de gasto livre ── */
async function renderLimiteVariavelDash(){
  const card=document.getElementById('limite-variavel-card');
  if(!card)return;
  const limiteVariavel=getLimiteVariavel();
  if(!(limiteVariavel>0)){card.style.display='none';return;}
  try{
    const all=await dbAll();
    const{rows:allRows}=calcMonth(all,curYear,curMonth);
    const filteredRows=pessoaFilter?allRows.filter(t=>t.pessoaId===pessoaFilter):allRows;
    const variableSpend=filteredRows.filter(t=>t.type==='variable').reduce((s,t)=>s+t.value,0);
    const limPctRaw=Math.round(variableSpend/limiteVariavel*100);
    const limPctCapped=Math.min(100,limPctRaw);
    const limColor=limPctRaw<70?'var(--green)':limPctRaw<100?'var(--amber)':'var(--red)';
    card.style.display='block';
    card.innerHTML=
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
      '<span class="card-title" style="margin-bottom:0">Limite de gasto livre</span>'+
      '<span style="font-size:12px;font-weight:600;font-family:var(--mono);color:'+limColor+'">'+limPctRaw+'%</span>'+
      '</div>'+
      '<div class="limite-bar-track" style="margin-bottom:6px"><div style="width:'+limPctCapped+'%;height:100%;background:'+limColor+';transition:width .5s cubic-bezier(.4,0,.2,1)"></div></div>'+
      '<div style="font-size:11px;color:var(--text3)">'+fmt(variableSpend)+' de '+fmt(limiteVariavel)+' em gastos variáveis</div>';
  }catch(e){
    console.error('[renderLimiteVariavelDash]',e);
  }
}

/* Handler do input em Configurações → Orçamento */
function onLimiteVariavelInput(val){
  setLimiteVariavel(val);
}

/* Ponto único de entrada, chamado a partir de renderDash() (transactions.js). */
async function renderPlanningDash(){
  await Promise.all([renderAlertsDash(),renderLimiteVariavelDash(),renderGoalsDash()]);
}
