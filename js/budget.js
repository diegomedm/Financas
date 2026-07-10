function toCategoriaKey(name){
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')
    .replace(/_+/g,'_').replace(/^_|_$/g,'');
}

function onBudgetTypeChange(){
  const t=document.getElementById('b-type')?.value;
  const recArea=document.getElementById('b-recurrence-area');
  if(recArea)recArea.style.display=(t==='variable'||t==='income')?'block':'none';
  const recurSel=document.getElementById('b-recur');
  if(recurSel&&!recurSel.dataset.userChanged){
    recurSel.value=t==='income'?'always':'once';
    onBudgetRecurChange();
  }
  const hint=document.getElementById('b-type-hint');
  if(hint)hint.textContent='';
}
function onBudgetRecurChange(){
  const sel=document.getElementById('b-recur');
  const v=sel?.value;
  if(sel)sel.dataset.userChanged='1';
  const instArea=document.getElementById('b-installments-area');
  if(instArea)instArea.style.display=v==='installments'?'block':'none';
  const hint=document.getElementById('b-type-hint');
  if(hint)hint.textContent=v==='always'?'Aparece automaticamente em todos os meses':'';
}
function getBudgetVal(){
  const inp=document.getElementById('b-val');
  const fieldVal=(inp?.value||'').trim();
  const storedExpr=inp?.dataset?.rawExpr||'';
  const exprToEval=storedExpr||fieldVal;
  let val=NaN;
  if(hasOp(exprToEval)){val=evalExpr(exprToEval);}
  if(isNaN(val)){val=parseFloat(fieldVal.replace(',','.'));}
  if(isNaN(val)){val=parseFloat(fieldVal.replace('.','').replace(',','.'));}
  return val;
}
function getBudgetRawExpr(){
  const inp=document.getElementById('b-val');
  const storedExpr=inp?.dataset?.rawExpr||'';
  const fieldVal=(inp?.value||'').trim();
  const expr=storedExpr||(hasOp(fieldVal)?fieldVal:'');
  return expr||null;
}
function onBudgetValInput(){
  clearFieldError('b-val');
  const inp=document.getElementById('b-val');
  if(inp&&inp.dataset)inp.dataset.rawExpr='';
  const raw=inp?.value||'';
  const prev=document.getElementById('b-val-preview');
  if(!prev)return;
  if(hasOp(raw)){const r=evalExpr(raw);prev.textContent=isNaN(r)?'⚠ inválido':'= '+fmt(r);prev.style.color=isNaN(r)?'var(--red)':'var(--green)';}
  else prev.textContent='';
}
function onBudgetDelayedToggle(){
  const on=document.getElementById('b-delayed-toggle')?.checked;
  const cfg=document.getElementById('b-delayed-config');
  if(cfg)cfg.style.display=on?'block':'none';
}
function getBudgetDelayed(){
  const on=document.getElementById('b-delayed-toggle')?.checked;
  if(!on)return null;
  const toVal=document.getElementById('b-delayed-to')?.value||'';
  const parts=toVal.split('_');
  const tm=parseInt(parts[0]),ty=parseInt(parts[1]);
  // se nao tem select (novo item) ou valor invalido, retorna so o flag
  if(isNaN(tm))return{noDestino:true};
  return{to:{month:tm,year:ty}};
}
function onBudgetDueOffsetChange(){
  const day=parseInt(document.getElementById('b-day')?.value)||null;
  const offset=parseInt(document.getElementById('b-due-offset')?.value)||0;
  const prev=document.getElementById('b-due-preview');
  if(!prev)return;
  if(day){const rawM=curMonth+offset;const dm=(rawM%12+12)%12;const dy=curYear+Math.floor(rawM/12);prev.textContent='📅 '+String(Math.min(day,28)).padStart(2,'0')+'/'+MONTHS[dm].slice(0,3)+'/'+dy;}else{prev.textContent='';}
}
function onBudgetCategoriaToggle(){
  var on=document.getElementById('b-categoria-toggle')?.checked;
  var cfg=document.getElementById('b-categoria-config');
  if(cfg)cfg.style.display=on?'block':'none';
  if(on){
    var nameVal=(document.getElementById('b-name')?.value||'').trim();
    var slug=nameVal?toCategoriaKey(nameVal):'';
    var slugEl=document.getElementById('b-categoria-slug');
    if(slugEl)slugEl.textContent=slug;
  }
}

async function openBudgetValNumpad(){
  const valInp=document.getElementById('b-val');
  const cur=valInp?.dataset?.rawExpr||valInp?.value||'';
  const result=await openNumpad(cur);
  if(result!==null&&valInp){clearFieldError('b-val');
    if(hasOp(result)){
      const r=evalExpr(result);
      if(!isNaN(r)){
        valInp.dataset.rawExpr=result;
        valInp.value=result;
        const prev=document.getElementById('b-val-preview');
        if(prev){prev.textContent='= '+fmt(r);prev.style.color='var(--green)';}
      }
    }else{
      valInp.dataset.rawExpr='';
      valInp.value=result;
      const prev=document.getElementById('b-val-preview');
      if(prev)prev.textContent='';
    }
  }
}
function onSwipeEditBudget(id,key){closeSwipe(key,function(){patchBudgetCard(id);});showBudgetEditById(id);}
async function showBudgetEditById(id){

  try{
    const all=await budgetAll();
    const item=all.find(x=>x.id===id);
    if(item)showBudgetAddModal(item);

  }catch(e){
    console.error('[showBudgetEditById]',e);
    toast('Erro ao abrir item','var(--red)');
  }
}
function showBudgetAddModal(item=null){
  const isEdit=!!item;
  openModal(`
    <div class="modal-title">${isEdit?'✏️ Editar item':'Novo item do orçamento'}</div>
    <div class="form-group">
      <label>Descrição</label>
      <input id="b-name" placeholder="Ex: Aluguel, Cartão, Streaming..." value="${isEdit?item.name.replace(/"/g,'&quot;'):''}" oninput="clearFieldError('b-name')">
      <div class="field-error-msg" id="b-name-err"></div>
    </div>
    <div class="form-group">
      <label>Valor esperado</label>
      <div class="row-flex">
        <input id="b-val" type="text" inputmode="decimal" placeholder="0,00" value="${isEdit?(item.rawExpr||item.value):''}" style="flex:1" oninput="onBudgetValInput()">
      <div class="field-error-msg" id="b-val-err"></div>
        <button type="button" onclick="openBudgetValNumpad()" class="btn-calc">📟</button>
      </div>
      <div id="b-val-preview" class="hint"></div>
    </div>
    <div class="form-group">
      <label>Tipo</label>
      <select id="b-type" onchange="onBudgetTypeChange()">
        <option value="income"${item?.type==='income'?' selected':''}>💵 Receita</option>
        <option value="fixed"${(!item||item?.type==='fixed')?' selected':''}>🏠 Despesa Fixa</option>
        <option value="variable"${item?.type==='variable'?' selected':''}>🛒 Variável</option>
      </select>
      <div id="b-type-hint" class="hint"></div>
    </div>
    <div class="form-group">
      <label>Vencimento <span class="label-muted">(opcional)</span></label>
      <div class="budget-due-grid">
        <div>
          <div class="label-sm">Dia</div>
          <input id="b-day" type="text" inputmode="numeric" placeholder="Ex: 10" value="${isEdit&&item.dueDay?item.dueDay:''}" style="text-align:center" oninput="onBudgetDueOffsetChange()">
        </div>
        <div>
          <div class="label-sm">Mês</div>
          <select id="b-due-offset" onchange="onBudgetDueOffsetChange()">
            <option value="0"${!isEdit||!item.dueMonthOffset?' selected':''}>${MONTHS[curMonth].slice(0,3)}/${String(curYear).slice(2)}</option>
            <option value="1"${isEdit&&item.dueMonthOffset===1?' selected':''}>${MONTHS[(curMonth+1)%12].slice(0,3)}/${String(curYear+Math.floor((curMonth+1)/12)).slice(2)}</option>
            <option value="2"${isEdit&&item.dueMonthOffset===2?' selected':''}>${MONTHS[(curMonth+2)%12].slice(0,3)}/${String(curYear+Math.floor((curMonth+2)/12)).slice(2)}</option>
          </select>
        </div>
        <div id="b-due-preview" class="hint-due"></div>
      </div>
    </div>
    <div id="b-recurrence-area" style="${(item?.type==='variable'||item?.type==='income')?'':'display:none'}">
      <div class="form-group">
        <label>Recorrência</label>
        <select id="b-recur" onchange="onBudgetRecurChange()">
          <option value="always" ${item?.type==='income'&&(!item?.recurrence||item?.recurrence==='always')?'selected':''}>Fixo (todo mês)</option>
          <option value="once" ${item?.recurrence==='once'||((!item?.recurrence||item?.recurrence==='always')&&item?.type!=='income')?'selected':''}>Único (só este mês)</option>
          <option value="installments" ${item?.recurrence==='installments'?'selected':''}>Parcelado (N meses)</option>
        </select>
      </div>
      <div id="b-installments-area" style="${item?.recurrence==='installments'?'':'display:none'}">
        <div class="form-grid">
          <div class="form-group">
            <label>Parcela atual</label>
            <input id="b-inst-cur" type="text" inputmode="numeric" placeholder="1" value="${isEdit&&item.installmentCur?item.installmentCur:'1'}">
          </div>
          <div class="form-group">
            <label>Total de parcelas</label>
            <input id="b-inst-total" type="text" inputmode="numeric" placeholder="Ex: 6" value="${isEdit&&item.installmentTotal?item.installmentTotal:''}">
          </div>
        </div>
        <div class="hint">Aparece como "descrição N/M" em cada mês</div>
      </div>
    </div>
    <div class="form-group">
      <label>Responsável <span class="label-muted">(opcional)</span></label>
      <div id="b-pessoa-chips" class="row-flex-wrap"></div>
    </div>
    <div class="form-group">
      <label>Observações <span class="label-muted">(opcional)</span></label>
      <textarea id="b-obs" placeholder="Detalhes...">${isEdit?item.obs||'':''}</textarea>
    </div>
    <div class="form-group" id="b-delayed-area">
      <label>Atrasado / Pendente <span class="label-muted">(opcional)</span></label>
      <div class="row-flex">
        <label class="toggle" style="flex-shrink:0">
          <input type="checkbox" id="b-delayed-toggle" onchange="onBudgetDelayedToggle()" ${isEdit&&item.delayed?'checked':''}>
          <div class="toggle-track"></div><div class="toggle-thumb"></div>
        </label>
        <span class="label-sm-green">⚠️ Marcar como atrasado</span>
      </div>
      ${isEdit?'<div id="b-delayed-config" style="'+(item.delayed?'display:block':'display:none')+';margin-top:10px">'+
        '<div class="label-sm">Mover para o período</div>'+
        '<select id="b-delayed-to" style="width:100%">'+
        (()=>{let o='';for(let i=-6;i<=12;i++){const rawM=curMonth+i;const m=(rawM%12+12)%12;const y=curYear+Math.floor(rawM/12);
        let sel=false;
        if(item.delayed&&item.budgetMonth!=null){
          const nx=(item.budgetYear||curYear)*12+item.budgetMonth+1;
          sel=(y*12+m===nx);
        }else sel=(i===1);
        o+='<option value="'+m+'_'+y+'" '+(sel?'selected':'')+'>'+MONTHS[m].slice(0,3)+'/'+y+'</option>';}return o;})()+'</select>'+
        '<div style="font-size:11px;color:var(--amber);margin-top:6px">ℹ️ Some do período atual e aparece no destino com badge de atraso.</div>'+
        '</div>':''}
    </div>
    <div class="form-group">
      <label>Subitens <span class="label-muted">(opcional)</span></label>
      <div class="row-end">
        <button type="button" class="btn btn-ghost btn-sm" onclick="addSubitem()">+ Subitem</button>
      </div>
      <div id="modal-b-subitems-area"></div>
      <div class="hint">O valor total será calculado automaticamente pelos subitens</div>
    </div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-primary" style="flex:1" onclick="${isEdit?'saveBudgetEdit('+item.id+')':'saveBudgetItem()'}">
        ${isEdit?'Salvar':'Adicionar'}
      </button>
      <button class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancelar</button>
    </div>`);
  setTimeout(()=>{
    renderPessoaChips('b-pessoa-chips',isEdit?item.pessoaId||null:null);
    if(isEdit){
      // Restore recurrence UI
      const recArea=document.getElementById('b-recurrence-area');
      if(recArea)recArea.style.display=(item.type==='variable'||item.type==='income')?'block':'none';
      const recurSel=document.getElementById('b-recur');
      if(recurSel)recurSel.value=item.recurrence||(item.type==='income'?'always':'once');
      onBudgetRecurChange();
      const instArea=document.getElementById('b-installments-area');
      if(instArea)instArea.style.display=item.recurrence==='installments'?'block':'none';
    }
    if(isEdit&&item.rawExpr){
      const inp=document.getElementById('b-val');
      if(inp){
        inp.dataset.rawExpr=item.rawExpr;
        const r=evalExpr(item.rawExpr);
        const prev=document.getElementById('b-val-preview');
        if(prev&&!isNaN(r)){prev.textContent='= '+fmt(r);prev.style.color='var(--green)';}
      }
    }
  },50);
  setTimeout(()=>{
    if(isEdit&&item.subitems?.length){
      // calcular elapsed para filtrar subitems ja encerrados
      const srs=item.subRepeatStart;
      const elap=srs?(curYear*12+curMonth-(srs.year*12+srs.month)):0;
      item.subitems.forEach(s=>{
        const rep=s.repeat||0;
        const skip=s.skip||[];
        if(rep>0&&elap>=rep)return; // ja acabou, nao restaura
        // repeatCap: se skip transformou o repeat em valor menor via repeatCap salvo
        // (nao ha repeatCap no banco, skip e repeat sao os campos canonicos)
        addSubitem(s.name,s.value,rep,s.sgid||'',skip);
        // mostrar indicador visual se tem skips ou repeatCap aplicado
        if(skip.length>0){
          const area=document.getElementById('modal-b-subitems-area');
          const rows=area?area.querySelectorAll('.subitem-row'):[];
          const lastRow=rows[rows.length-1];
          if(lastRow)lastRow.title='Pulado em: '+skip.map(e=>{
            const rawM=item.subRepeatStart.month+e;
            return MONTHS[(rawM%12+12)%12].slice(0,3)+'/'+(item.subRepeatStart.year+Math.floor(rawM/12));
          }).join(', ');
        }
      });
    }
    // marcar modal com id do item editado e se tem subRepeatStart
    const modal=document.getElementById('modal-content');
    if(isEdit&&modal){
      modal.dataset.editingId=String(item.id);
      if(item.subRepeatStart)modal.dataset.subRepeatStart=JSON.stringify(item.subRepeatStart);
      else delete modal.dataset.subRepeatStart;
    }
    // guardar periodo original e periodo atual do item no modal
    if(modal&&isEdit){
      // origMonth = periodo onde o item deveria estar sem atraso
      const origM=item.delayedFrom?item.delayedFrom.month:item.budgetMonth;
      const origY=item.delayedFrom?item.delayedFrom.year:item.budgetYear;
      if(origM!=null)modal.dataset.origMonth=String(origM);
      if(origY!=null)modal.dataset.origYear=String(origY);
    }
    if(isEdit&&item.delayed){
      const tog=document.getElementById('b-delayed-toggle');
      if(tog){tog.checked=true;onBudgetDelayedToggle();}
      if(item.delayedTo){
        const sel=document.getElementById('b-delayed-to');
        if(sel)sel.value=item.delayedTo.month+'_'+item.delayedTo.year;
      }
    }
  },50);
}
function getBudgetRecurrence(){
  const type=document.getElementById('b-type')?.value;
  if(type==='fixed')return{recurrence:'always',installmentCur:null,installmentTotal:null};
  const recur=document.getElementById('b-recur')?.value||'once';
  if(recur==='always')return{recurrence:'always',installmentCur:null,installmentTotal:null};
  if(recur==='installments'){
    return{
      recurrence:'installments',
      installmentCur:parseInt(document.getElementById('b-inst-cur')?.value)||1,
      installmentTotal:parseInt(document.getElementById('b-inst-total')?.value)||1
    };
  }
  return{recurrence:'once',installmentCur:null,installmentTotal:null};
}
async function saveBudgetItem(){

  try{
    const subitems=getRawSubitems();
    const name=document.getElementById('b-name')?.value.trim();
    const val=getBudgetVal();
    const type=document.getElementById('b-type')?.value;
    const dueDay=parseInt(document.getElementById('b-day')?.value)||null;
    const dueMonthOffset=parseInt(document.getElementById('b-due-offset')?.value)||0;
    const obs=document.getElementById('b-obs')?.value.trim()||'';
    const bPessoaId=getSelectedPessoa('b-pessoa-chips');
    const bRawExpr=getBudgetRawExpr();
    const{recurrence,installmentCur,installmentTotal}=getBudgetRecurrence();
    const bCatToggle=document.getElementById('b-categoria-toggle')?.checked;
    const bCategoriaKey=bCatToggle&&name?toCategoriaKey(name):null;
    if(!name){setFieldError('b-name','Informe o nome');return}
      if(!val||isNaN(val)||val<=0){setFieldError('b-val','Informe um valor válido');return}
    if(recurrence==='installments'&&installmentTotal>1){
      // Create N installment items starting from installmentCur
          const bGroupId=Date.now()+'_'+Math.random().toString(36).slice(2,7);
      for(let i=installmentCur-1;i<installmentTotal;i++){
        const label=name+' '+(i+1)+'/'+installmentTotal;
        await budgetAdd({name:label,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
          pessoaId:bPessoaId,recurrence:'once',groupId:bGroupId,
          installmentCur:i+1,installmentTotal,
          categoriaKey:bCategoriaKey||null,
          budgetMonth:(curMonth+i-(installmentCur-1)+1200)%12,
          budgetYear:curYear+Math.floor((curMonth+i-(installmentCur-1))/12),
          createdAt:Date.now()});
      }
      toast(installmentTotal-installmentCur+1+' parcelas adicionadas!','var(--teal)');
    }else{
      // item fixo com subitems que tem repeat: salva 1 registro always com subitems raw
      const hasSubRepeat=subitems.some(s=>s.repeat>0);
      if(hasSubRepeat&&recurrence!=='installments'){
        await budgetAdd({name,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
          pessoaId:bPessoaId,recurrence:'always',categoriaKey:bCategoriaKey||null,
          subRepeatStart:{month:curMonth,year:curYear},
          budgetMonth:null,budgetYear:null,createdAt:Date.now()});
        toast('Item adicionado!','var(--teal)');
      }else{
        const isDelayedNew=document.getElementById('b-delayed-toggle')?.checked;
        await budgetAdd({name,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
          pessoaId:bPessoaId,
          recurrence:isDelayedNew?'once':recurrence,
          installmentCur:isDelayedNew?null:installmentCur,
          installmentTotal:isDelayedNew?null:installmentTotal,
          categoriaKey:bCategoriaKey||null,
          budgetMonth:(isDelayedNew||recurrence==='once')?curMonth:null,
          budgetYear:(isDelayedNew||recurrence==='once')?curYear:null,
          delayed:isDelayedNew?true:undefined,
          delayedFrom:isDelayedNew?{month:curMonth,year:curYear}:undefined,
          createdAt:Date.now()});
        toast(isDelayedNew?'Item adicionado como atrasado!':'Item adicionado!',isDelayedNew?'var(--amber)':'var(--teal)');
      }
    }
    closeModal();renderBudget();

  }catch(e){
    console.error('[saveBudgetItem]',e);
    toast('Erro ao salvar item','var(--red)');
  }
}
async function saveBudgetEdit(id){

  try{
    const subitems=getRawSubitems();
    const name=document.getElementById('b-name')?.value.trim();
    const val=getBudgetVal();
    const type=document.getElementById('b-type')?.value;
    const dueDay=parseInt(document.getElementById('b-day')?.value)||null;
    const dueMonthOffset=parseInt(document.getElementById('b-due-offset')?.value)||0;
    const obs=document.getElementById('b-obs')?.value.trim()||'';
    const bPessoaId=getSelectedPessoa('b-pessoa-chips');
    const bRawExpr=getBudgetRawExpr();
    const{recurrence,installmentCur,installmentTotal}=getBudgetRecurrence();
    const bCatToggleEdit=document.getElementById('b-categoria-toggle')?.checked;
    const bCategoriaKeyEdit=bCatToggleEdit&&name?toCategoriaKey(name):null;
    if(!name){setFieldError('b-name','Informe o nome');return}
      if(!val||isNaN(val)||val<=0){setFieldError('b-val','Informe um valor válido');return}
    const all=await budgetAll();
    const existing=all.find(x=>x.id===id);
    if(!existing)return;
    if(recurrence==='installments'&&installmentTotal>1){
      // If converting from once/always to installments, ask for confirmation
      if(existing.recurrence!=='installments'){
        closeModal();
        showConfirm('Transformar em parcelas?','O item atual será removido e '+(installmentTotal-installmentCur+1)+' parcelas serão criadas a partir deste mês.',[
          {label:'Confirmar',cls:'btn-primary',action:async()=>{
            await budgetDel(id);
            const newBGroupId=Date.now()+'_'+Math.random().toString(36).slice(2,7);
            for(let i=installmentCur-1;i<installmentTotal;i++){
              const label=name.replace(/\s+\d+\/\d+$/,'').trim()+' '+(i+1)+'/'+installmentTotal;
              const mOffset=i-(installmentCur-1);
              const rawM=curMonth+mOffset;
              await budgetAdd({name:label,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
                pessoaId:bPessoaId,recurrence:'once',groupId:newBGroupId,
                installmentCur:i+1,installmentTotal,
                categoriaKey:bCategoriaKeyEdit||null,
                budgetMonth:(rawM%12+12)%12,
                budgetYear:curYear+Math.floor(rawM/12),
                createdAt:Date.now()});
            }
            toast(installmentTotal-installmentCur+1+' parcelas criadas!','var(--teal)');
            renderBudget();
          }},
          {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
        ]);
        return;
      }
      // Already installments - rebuild series (existing logic)
      await budgetDel(id);
      const newBGroupId=Date.now()+'_'+Math.random().toString(36).slice(2,7);
      for(let i=installmentCur-1;i<installmentTotal;i++){
        const label=name.replace(/\s+\d+\/\d+$/,'').trim()+' '+(i+1)+'/'+installmentTotal;
        const mOffset=i-(installmentCur-1);
        const rawM=curMonth+mOffset;
        await budgetAdd({name:label,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
          pessoaId:bPessoaId,recurrence:'once',groupId:newBGroupId,
          installmentCur:i+1,installmentTotal,
          categoriaKey:bCategoriaKeyEdit||null,
          budgetMonth:(rawM%12+12)%12,
          budgetYear:curYear+Math.floor(rawM/12),
          createdAt:Date.now()});
      }
      toast(installmentTotal-installmentCur+1+' parcelas criadas!','var(--teal)');
      closeModal();renderBudget();
    }else if(existing.groupId&&recurrence!=='installments'){
      // Part of a series - offer series edit
      const allBuds=await budgetAll();
      // future = same group, budgetMonth >= this item's budgetMonth
      const thisTotal=existing.budgetYear*12+existing.budgetMonth;
      const future=allBuds.filter(b=>b.groupId===existing.groupId&&
        b.id!==existing.id&&(b.budgetYear*12+b.budgetMonth)>thisTotal);
      if(future.length>0){
        closeModal();
        showConfirm('Editar parcela do orçamento','Esta parcela faz parte de uma série.',[
          {label:'Apenas esta',cls:'btn-ghost',action:async()=>{
            const dEd=getBudgetDelayed();
            if(dEd&&dEd.to){
              // mover para outro periodo
              const toM=dEd.to.month,toY=dEd.to.year;
              const fromM=existing.budgetMonth!=null?existing.budgetMonth:curMonth;
              const fromY=existing.budgetYear!=null?existing.budgetYear:curYear;
              await budgetPut({...existing,name,value:val,rawExpr:bRawExpr,type,
                dueDay:existing.dueDay,dueMonthOffset:existing.dueMonthOffset,
                obs,subitems,pessoaId:bPessoaId,recurrence:'once',
                installmentCur:existing.installmentCur,installmentTotal:existing.installmentTotal,
                categoriaKey:bCategoriaKeyEdit||null,
                budgetMonth:toM,budgetYear:toY,
                delayed:true,delayedFrom:{month:fromM,year:fromY},delayedTo:{month:toM,year:toY}});
              toast('Parcela movida para '+MONTHS[toM].slice(0,3)+'/'+toY,'var(--amber)');
            }else if(existing.delayed&&!dEd){
              // desmarcar delayed: voltar ao periodo original
              const restM=existing.delayedFrom?existing.delayedFrom.month:existing.budgetMonth;
              const restY=existing.delayedFrom?existing.delayedFrom.year:existing.budgetYear;
              await budgetPut({...existing,name,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
                pessoaId:bPessoaId,recurrence:'once',
                installmentCur:existing.installmentCur,installmentTotal:existing.installmentTotal,
                categoriaKey:bCategoriaKeyEdit||null,
                budgetMonth:restM,budgetYear:restY,
                delayed:false,delayedFrom:null,delayedTo:null});
              toast('Parcela restaurada!','var(--teal)');
            }else{
              await budgetPut({...existing,name,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
                pessoaId:bPessoaId,recurrence:'once',
                categoriaKey:bCategoriaKeyEdit||null,
                budgetMonth:existing.budgetMonth,budgetYear:existing.budgetYear,
                delayed:false,delayedFrom:null,delayedTo:null});
              toast('Parcela atualizada!','var(--teal)');
            }
            closeModal();renderBudget();
          }},
          {label:'Esta e seguintes',cls:'btn-primary',action:async()=>{
            await budgetDel(existing.id);
            for(const b of future) await budgetDel(b.id);
            const newG=Date.now()+'_'+Math.random().toString(36).slice(2,7);
            const remaining=future.length+1;
            const startInst=existing.installmentCur||1;
            const totalInst=existing.installmentTotal||remaining;
            const baseName2=(name).replace(/\s+\d+\/\d+$/,'').trim();
            let rawM2=(existing.budgetYear*12+existing.budgetMonth)-(curYear*12+curMonth);
            const baseYM=existing.budgetYear*12+existing.budgetMonth;
            for(let i=0;i<remaining;i++){
              const ym2=baseYM+i;
              const bm=(ym2%12+12)%12;
              const by=Math.floor(ym2/12);
              const label2=baseName2+' '+(startInst+i)+'/'+totalInst;
              await budgetAdd({name:label2,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
                pessoaId:bPessoaId,recurrence:'once',groupId:newG,
                installmentCur:startInst+i,installmentTotal:totalInst,
                categoriaKey:bCategoriaKeyEdit||null,
                budgetMonth:bm,budgetYear:by,createdAt:Date.now()});
            }
            toast('Série atualizada!','var(--teal)');renderBudget();
          }},
          {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
        ]);
        return;
      }
      await budgetPut({...existing,name,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems,
        pessoaId:bPessoaId,recurrence:'once',
        categoriaKey:bCategoriaKeyEdit||null,
        budgetMonth:existing.budgetMonth,budgetYear:existing.budgetYear});
      toast('Item atualizado!','var(--teal)');
      closeModal();renderBudget();
    }else{
      // Para itens com subRepeatStart: mesclar subitems do DOM com os originais do banco
      // Os subitems que ja acabaram ficam no banco mas nao aparecem no DOM
      let finalSubitems=subitems;
      if(existing.subRepeatStart&&existing.subitems?.length){
        const srs=existing.subRepeatStart;
        const elap=(curYear*12+curMonth)-(srs.year*12+srs.month);
        // subitems do banco que ja acabaram (nao estao no DOM)
        const ended=existing.subitems.filter(s=>(s.repeat||0)>0&&elap>=(s.repeat||0));
        // subitems do DOM (ativos ou marcados com skip/repeatCap)
        finalSubitems=[...subitems,...ended];
      }
      const delayedEdit=getBudgetDelayed();
      if(delayedEdit){
        // from = onde o item esta agora (budgetMonth para once, curMonth para always)
        const fromM=existing.budgetMonth!=null?existing.budgetMonth:curMonth;
        const fromY=existing.budgetYear!=null?existing.budgetYear:curYear;
        // se nao tem destino (novo item ou toggle sem select): manter no periodo atual
        const toM=delayedEdit.to?delayedEdit.to.month:fromM;
        const toY=delayedEdit.to?delayedEdit.to.year:fromY;
        if(existing.delayed){
          // ja atrasado: apenas mover para novo destino, preservar delayedFrom original
          await budgetPut({...existing,name,value:val,rawExpr:bRawExpr,type,
            dueDay:existing.dueDay,dueMonthOffset:existing.dueMonthOffset,
            obs,subitems:finalSubitems,
            pessoaId:bPessoaId,recurrence:'once',
            categoriaKey:bCategoriaKeyEdit||null,
            budgetMonth:toM,budgetYear:toY,
            delayed:true,
            delayedFrom:existing.delayedFrom||{month:fromM,year:fromY},
            delayedTo:{month:toM,year:toY}});
        }else if(recurrence==='always'){
          // fixo: skip no mes de origem + criar once no destino
          const delSkips=[...(existing.delayedSkipMonths||[]),{month:fromM,year:fromY}];
          await budgetPut({...existing,name,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems:finalSubitems,
            pessoaId:bPessoaId,recurrence:'always',categoriaKey:bCategoriaKeyEdit||null,delayedSkipMonths:delSkips});
          await budgetAdd({name,value:val,rawExpr:bRawExpr,type,
            dueDay:existing.dueDay,dueMonthOffset:existing.dueMonthOffset,
            obs,subitems:finalSubitems,
            pessoaId:bPessoaId,recurrence:'once',
            categoriaKey:bCategoriaKeyEdit||null,
            budgetMonth:toM,budgetYear:toY,
            delayed:true,delayedFrom:{month:fromM,year:fromY},delayedTo:{month:toM,year:toY},
            delayedFromId:existing.id,createdAt:Date.now()});
        }else{
          // once/parcelado: mover budgetMonth para destino
          await budgetPut({...existing,name,value:val,rawExpr:bRawExpr,type,
            dueDay:existing.dueDay,dueMonthOffset:existing.dueMonthOffset,
            obs,subitems:finalSubitems,
            pessoaId:bPessoaId,recurrence:'once',installmentCur,installmentTotal,
            categoriaKey:bCategoriaKeyEdit||null,
            budgetMonth:toM,budgetYear:toY,
            delayed:true,delayedFrom:{month:fromM,year:fromY},delayedTo:{month:toM,year:toY}});
        }
        toast('Item movido para '+MONTHS[toM].slice(0,3)+'/'+toY,'var(--amber)');
      }else{
        // desmarcar: restaurar periodo original
        const modal2=document.getElementById('modal-content');
        const origM=modal2?.dataset.origMonth!=null?parseInt(modal2.dataset.origMonth):null;
        const origY=modal2?.dataset.origYear!=null?parseInt(modal2.dataset.origYear):null;
        const restoreM=origM!=null?origM:(existing.delayedFrom?existing.delayedFrom.month:existing.budgetMonth);
        const restoreY=origY!=null?origY:(existing.delayedFrom?existing.delayedFrom.year:existing.budgetYear);
        // item fixo: restaurar recurrence always e remover skips
        // item once/parcelado: mover de volta ao periodo original
        const wasAlways=existing.delayedFromId!=null; // era fixo (tinha clone criado)
        if(wasAlways){
          // restaurar original (always) sem o skip do mes que foi atrasado
          const allBuds2=await budgetAll();
          const origItem=allBuds2.find(b=>b.id===existing.delayedFromId);
          if(origItem){
            const fromM=existing.delayedFrom?.month;
            const skipsClean=(origItem.delayedSkipMonths||[]).filter(s=>!(s.month===fromM&&s.year===existing.delayedFrom?.year));
            await budgetPut({...origItem,delayedSkipMonths:skipsClean.length?skipsClean:null});
          }
          // deletar este clone atrasado
          await budgetDel(existing.id);
        }else{
          await budgetPut({...existing,name,value:val,rawExpr:bRawExpr,type,dueDay,dueMonthOffset,obs,subitems:finalSubitems,
            pessoaId:bPessoaId,recurrence:recurrence==='always'?'always':'once',installmentCur,installmentTotal,
            categoriaKey:bCategoriaKeyEdit||null,
            budgetMonth:restoreM!=null?restoreM:null,budgetYear:restoreY!=null?restoreY:null,
            delayed:false,delayedFrom:null,delayedTo:null,delayedSkipMonths:null});
        }
        toast('Item restaurado!','var(--teal)');
      }
      closeModal();renderBudget();
    }

  }catch(e){
    console.error('[saveBudgetEdit]',e);
    toast('Erro ao salvar item','var(--red)');
  }
}



async function toggleBudgetDone(budgetId){
  // verificar se já está marcado (desmarcar não precisa confirmar)
  const key=doneKey(budgetId,curYear,curMonth);
  const existing=await doneGet(key);
  if(existing){
    // já marcado — desmarcar sem confirmar
    return _toggleBudgetDoneInternal(budgetId,'');
  }
  // vai marcar — pedir confirmação com campo de data
  const todayVal=todayISO();
  const msg='<p>Confirmar a realização deste item?</p>'
    +'<label style="display:block;margin-top:12px;font-size:0.85rem">Data de realização</label>'
    +'<input type="date" id="done-date-input" value="'+todayVal+'" style="width:100%;margin-top:4px;padding:6px;border:1px solid var(--border);border-radius:6px;font-size:1rem">';
  showConfirm('Marcar como realizado?',msg,[
    {label:'Confirmar',cls:'btn-primary',action:()=>{
      const doneDate=document.getElementById('done-date-input')?.value||'';
      _toggleBudgetDoneInternal(budgetId,doneDate);
    }},
    {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
  ]);
}
async function _toggleBudgetDoneInternal(budgetId,doneDate){

  try{
    // Handle cartao virtual items (string ids like 'cartao_3')
    if(typeof budgetId==='string'&&budgetId.startsWith('cartao_')){
      const cartaoId=parseInt(budgetId.replace('cartao_',''));
      const key=doneKey(budgetId,curYear,curMonth);
      const existing=await doneGet(key);
      if(existing){
        if(existing.txId)await dbDel(existing.txId);
        await doneDel(key);
        toast('Marcação desfeita','var(--amber)');
      }else{
        const cartoes=await cartoesAll();
        const cartao=cartoes.find(c=>c.id===cartaoId);
        if(!cartao)return;
        const gastosFatura=await getCartaoFaturaGastos(cartaoId,curMonth,curYear);
        const allRec2=await recorrentesAll();
        const recFatura=allRec2.filter(r=>r.cartaoId===cartaoId);
        const total=(gastosFatura.reduce((s,g)=>s+g.value,0))+(recFatura.reduce((s,r)=>s+r.value,0));
        const vencDate=getFaturaVencimento(curYear,curMonth,cartao);
        const obsLines=[...gastosFatura,...recFatura].map(g=>g.name+(g.value?' ('+fmt(g.value)+')':'')).join(', ');
        const txSubitems=[...gastosFatura,...recFatura].map(g=>({name:g.name,value:g.value}));
        const txId=await dbAdd({
          name:'Fatura '+cartao.name,value:total,type:'credit',
          month:curMonth,year:curYear,ym:ym(curYear,curMonth),
          date:vencDate,obs:'',subitems:txSubitems,
          pessoaId:cartao.pessoaId||null,
          fromBudget:true,fromCartao:cartaoId,createdAt:Date.now()
        });
        await donePut({key,budgetId,txId,doneAt:Date.now()});
        toast('Fatura lançada! ✅','var(--green)');
      }
      renderBudget();
      return;
    }
    // Normal manual budget items
    const id=typeof budgetId==='string'?parseInt(budgetId):budgetId;
    const key=doneKey(id,curYear,curMonth);
    const existing=await doneGet(key);
    if(existing){
      if(existing.txId)await dbDel(existing.txId);
      await doneDel(key);
      toast('Marcação desfeita','var(--amber)');
    }else{
      const buds=await budgetAll();
      const item=buds.find(x=>x.id===id);
      if(!item)return;
      const day=item.dueDay||1;
      const offset=item.dueMonthOffset||0;
      const rawDueMonth=curMonth+offset;
      const dueYear=curYear+Math.floor(rawDueMonth/12);
      const dueMonth=(rawDueMonth%12+12)%12;
      const dateStr=dueYear+'-'+String(dueMonth+1).padStart(2,'0')+'-'+String(Math.min(day,28)).padStart(2,'0');
      // calcular subitems e valor ativos para este mes
      let txSubs=item.subitems||[];
      let txVal=item.value;
      if(item.subRepeatStart&&txSubs.length){
        txSubs=getActiveSubitems(txSubs,item.subRepeatStart.month,item.subRepeatStart.year,curMonth,curYear);
        if(txSubs.length)txVal=txSubs.reduce((t,s)=>t+s.value,0);
      }
      const txId=await dbAdd({
        name:item.name,value:txVal,rawExpr:item.rawExpr||null,
        subitems:txSubs,type:item.type,
        month:curMonth,year:curYear,ym:ym(curYear,curMonth),
        date:dateStr,paidDate:doneDate||'',obs:item.obs||'',pessoaId:item.pessoaId||null,
        fromBudget:true,createdAt:Date.now()
      });
      await donePut({key,budgetId:id,txId,doneAt:Date.now()});
      toast('Lançamento registrado! ✅','var(--green)');
    }
    renderBudget();
    const p=document.querySelector('.page.active');
    if(p&&(p.id==='page-dash'||p.id==='page-tx'))renderAll();

  }catch(e){
    console.error('[toggleBudgetDone]',e);
    toast('Erro ao marcar item','var(--red)');
  }
}

async function deleteBudgetItem(id){

  try{
    const allBuds=await budgetAll();
    const item=allBuds.find(b=>b.id===id);
    // se item delayed com clone (delayedFromId), limpar skip do original ao deletar
    if(item&&item.delayed&&item.delayedFromId){
      const origItem=allBuds.find(b=>b.id===item.delayedFromId);
      if(origItem&&origItem.delayedSkipMonths?.length){
        const fromM=item.delayedFrom?.month,fromY=item.delayedFrom?.year;
        const skipsClean=origItem.delayedSkipMonths.filter(s=>!(s.month===fromM&&s.year===fromY));
        await budgetPut({...origItem,delayedSkipMonths:skipsClean.length?skipsClean:null});
      }
    }
    async function delOne(bid){
      await budgetDel(bid);
      await new Promise(res=>{
        const t=db.transaction('budgetDone','readwrite');
        const store=t.objectStore('budgetDone');
        store.getAll().onsuccess=e=>{
          (e.target.result||[]).filter(r=>r.budgetId===bid).forEach(r=>store.delete(r.key));
          res();
        };
      });
    }
    const isSeries=item&&(item.groupId||(item.installmentTotal>1&&item.recurrence==='once'));
    if(isSeries){
      const thisTotal=item.budgetYear*12+item.budgetMonth;
      const allInGroup=item.groupId
        ?allBuds.filter(b=>b.groupId===item.groupId&&b.id!==id)
        :allBuds.filter(b=>b.id!==id&&b.installmentTotal===item.installmentTotal&&b.recurrence==='once'&&b.pessoaId===item.pessoaId&&b.name.replace(/\s+\d+\/\d+$/,'')===item.name.replace(/\s+\d+\/\d+$/,''));
      const future=allInGroup.filter(b=>(b.budgetYear*12+b.budgetMonth)>thisTotal);
      const instLabel=item.installmentCur&&item.installmentTotal?' ('+item.installmentCur+'/'+item.installmentTotal+')':'';
      const futureCount=future.length+1;
      const totalCount=allInGroup.length+1;
      showConfirm('Remover parcela do orçamento','Esta parcela'+instLabel+' faz parte de uma série de '+totalCount+'.',[
        {label:'Só esta parcela',cls:'btn-ghost',action:async()=>{
          await delOne(id);toast('Parcela removida','var(--red)');renderBudget();
        }},
        ...(future.length>0?[{label:'Esta e as seguintes ('+futureCount+')',cls:'btn-ghost',action:async()=>{
          await delOne(id);
          for(const b of future)await delOne(b.id);
          toast(futureCount+' parcelas removidas','var(--red)');renderBudget();
        }}]:[]),
        {label:'Todas as parcelas ('+totalCount+')',cls:'btn-danger',action:async()=>{
          await delOne(id);
          for(const b of allInGroup)await delOne(b.id);
          toast('Série removida ('+totalCount+' parcelas)','var(--red)');renderBudget();
        }},
        {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
      ]);
      return;
    }
    showConfirm('Remover item do orçamento','Os lançamentos já realizados serão mantidos.',[
      {label:'Remover',cls:'btn-danger',action:async()=>{
        await delOne(id);toast('Item removido','var(--red)');renderBudget();
      }},
      {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
    ]);

  }catch(e){
    console.error('[deleteBudgetItem]',e);
    toast('Erro ao remover item','var(--red)');
  }
}

function calcCategoriaRealizado(budgetId, todosGastos, todasTx, cartoes, tm, ty){
  var r=0;
  for(var i=0;i<todosGastos.length;i++){
    var g=todosGastos[i];
    if(g.categoriaId!==budgetId)continue;
    // Calcular mes da fatura deste gasto
    var gc=null;
    for(var ci=0;ci<cartoes.length;ci++){
      if(cartoes[ci].id===g.cartaoId){gc=cartoes[ci];break;}
    }
    if(!gc){ console.warn('[calcCategoriaRealizado] cartao nao encontrado para gasto id='+g.id); continue; }
    var fm=getFaturaMonth(g.date,gc);
    var inMonth=false;
    if(fm&&fm.month===tm&&fm.year===ty){
      inMonth=true;
    }else if(g.subRepeatStart&&g.subitems&&g.subitems.length){
      var activeSubs=getActiveSubitems(g.subitems,g.subRepeatStart.month,g.subRepeatStart.year,tm,ty);
      inMonth=activeSubs.length>0;
    }
    if(!inMonth)continue;
    var res=gastoValueForFatura(g,tm,ty);
    if(res)r+=res.value;
  }
  for(var j=0;j<todasTx.length;j++){
    var t=todasTx[j];
    if(t.categoriaId===budgetId&&t.month===tm&&t.year===ty){
      r+=Math.abs(t.value)||0;
    }
  }
  return r;
}

async function renderBudget(){
  try{
  const allBudgetItems=await budgetAll();
  // Carregar dados para calcCategoriaRealizado uma unica vez (evita N round-trips).
  // As três leituras são independentes entre si — rodam em paralelo em vez de sequenciais;
  // Promise.allSettled preserva a resiliência individual (uma falhar não derruba as outras).
  var todosGastosRender=[],todasTxRender=[],cartoesRender=[];
  const [_gastosR,_txR,_cartoesR]=await Promise.allSettled([gastosAll(),dbAll(),cartoesAll()]);
  if(_gastosR.status==='fulfilled')todosGastosRender=_gastosR.value;
  else console.warn('[renderBudget] falha ao ler gastos, seguindo com array vazio:',_gastosR.reason);
  if(_txR.status==='fulfilled')todasTxRender=_txR.value;
  else console.warn('[renderBudget] falha ao ler transações, seguindo com array vazio:',_txR.reason);
  if(_cartoesR.status==='fulfilled')cartoesRender=_cartoesR.value;
  else console.warn('[renderBudget] falha ao ler cartões, seguindo com array vazio:',_cartoesR.reason);
  // Renderizar seção de categorias orçadas
  _renderCategoriasBudget(allBudgetItems, todosGastosRender, todasTxRender, cartoesRender);
  // Filter manual items by recurrence logic (excluir categorias puras da lista)
  const manualItemsBeforePessoa=allBudgetItems.filter(item=>{
    if(item.isCategoriaOnly)return false;
    const rec=item.recurrence||'always';
    if(rec==='always'){
      if(item.delayedSkipMonths?.some(s=>s.month===curMonth&&s.year===curYear))return false;
      return true;
    }
    if(rec==='once'){
      // Show only in specific month - use budgetMonth/budgetYear if set
      if(item.budgetMonth!=null&&item.budgetYear!=null){
        // Normalize budgetMonth for multi-month offsets
        const totalMonths=item.budgetYear*12+item.budgetMonth;
        const curTotalMonths=curYear*12+curMonth;
        return totalMonths===curTotalMonths;
      }
      return true; // backward compat: no month stored, always show
    }
    if(rec==='installments'){
      if(item.budgetMonth!=null&&item.budgetYear!=null){
        const totalMonths=item.budgetYear*12+item.budgetMonth;
        const curTotalMonths=curYear*12+curMonth;
        return totalMonths===curTotalMonths;
      }
      return true;
    }
    return true;
  });
  // Apply pessoa filter to manual items
  const manualItems=pessoaFilter?manualItemsBeforePessoa.filter(item=>item.pessoaId===pessoaFilter):manualItemsBeforePessoa;
  // Add cartao virtual items safely (cartoes store may not exist yet)
  let cartaoForMonth=[];
  try{
    const cartaoVirtualItems=await getCartaoBudgetItems(curMonth,curYear);
    cartaoForMonth=cartaoVirtualItems.filter(ci=>{
      if(ci.faturaMonth!==curMonth||ci.faturaYear!==curYear)return false;
      if(pessoaFilter&&ci.pessoaId!==pessoaFilter)return false;
      return true;
    });
  }catch(e){console.warn('Cartoes store not ready:',e);}
  const items=[...manualItems,...cartaoForMonth];
  const doneList=await doneAllForMonth(curYear,curMonth);
  const doneIds=new Set(doneList.map(d=>d.budgetId));
  const listEl=document.getElementById('budget-list');
  if(!items.length){
    document.getElementById('budget-summary-card').style.display='none';
    listEl.innerHTML=typeof emptyStateBudgetHtml==='function'
      ?emptyStateBudgetHtml()
      :`<div class="empty"><div class="empty-icon">📋</div>Nenhum item no orçamento.<br>Toque em <strong>+ Item</strong> para começar.</div>`;
    return;
  }
  const pessoasBud=await pessoasAll();
  const pessoaMapBud=Object.fromEntries(pessoasBud.map(p=>[p.id,p]));
  const enrichedItems=items.map(i=>{
    const base={...i,_pessoa:i._pessoa||(i.pessoaId?pessoaMapBud[i.pessoaId]:null)};
    if(i.subRepeatStart&&i.subitems&&i.subitems.length){
      const activeSubs=getActiveSubitems(i.subitems,i.subRepeatStart.month,i.subRepeatStart.year,curMonth,curYear);
      const activeVal=activeSubs.length?activeSubs.reduce((t,s)=>t+s.value,0):i.value;
      return {...base,subitems:activeSubs,value:activeVal};
    }
    return base;
  });
  /* Somar saldo restante das categorias ao total de despesas do resumo */
  /* Só aplica no mês atual (>= refMonth): mesma lógica da projeção */
  var _refMB=parseInt(localStorage.getItem('refMonth'));var _refYB=parseInt(localStorage.getItem('refYear'));
  if(isNaN(_refMB)||isNaN(_refYB)){var _nb=new Date();_refMB=_nb.getMonth();_refYB=_nb.getFullYear();}
  var _catRealizado=0;var _catOrcado=0;
  if(curYear*12+curMonth>=_refYB*12+_refMB){
    var _catItems=allBudgetItems.filter(function(b){return b.isCategoriaOnly&&b.categoriaKey;});
    for(var _ci=0;_ci<_catItems.length;_ci++){
      var _cat=_catItems[_ci];
      var _realizado=calcCategoriaRealizado(_cat.id,todosGastosRender,todasTxRender,cartoesRender,curMonth,curYear);
      _catRealizado+=_realizado;
      _catOrcado+=(_cat.value||0);
    }
  }
  document.getElementById('budget-summary-card').style.display='block';
  const _saldoPlanejado=_renderBudgetSummaryTable(enrichedItems, doneIds, _catRealizado, _catOrcado);
  const _avulsosDoMes=_getAvulsosDoMes(todasTxRender,curMonth,curYear,pessoaFilter);
  _renderBudgetAvulsosCard(_avulsosDoMes,_saldoPlanejado);
  const sorted=[...enrichedItems].sort((a,b)=>{
    const ad=doneIds.has(a.id)?1:0,bd=doneIds.has(b.id)?1:0;
    if(ad!==bd)return ad-bd;
    return((a.dueMonthOffset||0)*100+(a.dueDay||99))-((b.dueMonthOffset||0)*100+(b.dueDay||99));
  });
  const prevCache=_budgetListCache;
  _budgetListCache=sorted;
  _budgetListCtx={doneIds,todosGastosRender,todasTxRender,cartoesRender};
  _reconcileBudgetList(listEl,prevCache,sorted,_budgetListCtx);
  }catch(err){console.error('renderBudget error:',err);}
}

/* Cache do último array + contexto renderizados por renderBudget() — usado por
   patchBudgetCard() para atualizar um único item no swipe sem re-renderizar a lista
   inteira (evita reiniciar a animação listItemIn em todos os itens a cada swipe). */
var _budgetListCache=[];
var _budgetListCtx=null;

/* Reconciliação da lista de orçamento: em vez de sempre substituir o innerHTML inteiro
   (o que reanima listItemIn em TODOS os itens e fecha qualquer swipe aberto), reaproveita
   os nós DOM de itens que só mudaram de dado (ex: marcar como realizado altera o próprio
   item) e só recria o que precisa mudar de POSIÇÃO na lista (ex: item concluído que vai
   para o final). Itens cujo id já existia no DOM mantêm o nó (sem replay de animação),
   mesmo que precisem ser movidos via insertBefore — mover um nó existente não reinicia
   uma animation com fill-mode:both já concluída. */
function _reconcileBudgetList(listEl,prevList,sorted,ctx){
  if(!sorted.length){
    listEl.innerHTML=typeof emptyStateBudgetHtml==='function'
      ?emptyStateBudgetHtml()
      :`<div class="empty"><div class="empty-icon">📋</div>Nenhum item no orçamento.<br>Toque em <strong>+ Item</strong> para começar.</div>`;
    return;
  }
  sorted.forEach(function(item,idx){
    const idKey=String(item.id);
    const oldNode=document.getElementById('budget'+idKey+'-wrap');
    const tmp=document.createElement('div');
    tmp.innerHTML=_budgetItemCard(item,idx,ctx);
    const node=tmp.firstElementChild;
    // Item que já existia no DOM (mesmo mudando de posição/dado, ex: marcar como feito) não
    // reanima listItemIn — só itens genuinamente novos entram com a animação de entrada.
    if(oldNode){
      node.style.animation='none';
      oldNode.replaceWith(node);
    }
    listEl.appendChild(node); // garante a posição correta ao final (no-op se já está lá)
  });
}
function patchBudgetCard(id){
  const idx=_budgetListCache.findIndex(function(i){return i.id===id;});
  if(idx===-1||!_budgetListCtx){renderBudget();return;}
  const wrap=document.getElementById('budget'+id+'-wrap');
  if(!wrap){renderBudget();return;}
  const html=_budgetItemCard(_budgetListCache[idx],idx,_budgetListCtx);
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  const newWrap=tmp.firstElementChild;
  newWrap.style.animation='none';
  wrap.replaceWith(newWrap);
}

/* Pílula de status do item (spec do protótipo, linhas 2134-2141): ✓ Pago quando realizado,
   ↪ Atrasado quando movido explicitamente, ⚠ Atrasado quando o vencimento já passou (mês
   atual/passado), "Vence em Xd" quando faltam ≤5 dias, Pendente nos demais casos.
   Avisos por proximidade de data só valem quando o mês de referência (pin 📌) é o mês real
   do sistema — com o pin em outro mês, comparar datas contra o relógio real geraria falso
   "atrasado" em tudo, então o item fica como Pendente neutro. */
function _budgetStatusPill(item,done){
  let label='Pendente',color='var(--text3)',bg='var(--bg4)',border='var(--border)';
  if(done){label='✓ Pago';color='var(--green)';bg='var(--green-bg)';border='var(--green-border)';}
  else if(item.delayed){label='↪ Atrasado';color='var(--amber)';bg='var(--amber-bg)';border='var(--amber-border)';}
  else if(item.dueDay){
    const today=new Date();today.setHours(0,0,0,0);
    var refM=parseInt(localStorage.getItem('refMonth'));var refY=parseInt(localStorage.getItem('refYear'));
    if(isNaN(refM)||isNaN(refY)){refM=today.getMonth();refY=today.getFullYear();}
    const refIsRealToday=(refY===today.getFullYear()&&refM===today.getMonth());
    if(refIsRealToday){
      const rawDue=curMonth+(parseInt(item.dueMonthOffset)||0);
      const dueYear=curYear+Math.floor(rawDue/12);
      const dueMonth=((rawDue%12)+12)%12;
      const dueDate=new Date(dueYear,dueMonth,parseInt(item.dueDay));dueDate.setHours(0,0,0,0);
      const diffDays=Math.round((dueDate-today)/86400000);
      const isCurrentOrPastMonth=(curYear<today.getFullYear())||(curYear===today.getFullYear()&&curMonth<=today.getMonth());
      if(isCurrentOrPastMonth&&diffDays<0){label='⚠ Atrasado';color='var(--red)';bg='var(--red-bg)';border='var(--red-border)';}
      else if(diffDays>=0&&diffDays<=5){label='Vence em '+(diffDays===0?'hoje':diffDays+'d');color='var(--amber)';bg='var(--amber-bg)';border='var(--amber-border)';}
    }
  }
  return'<span style="display:inline-flex;align-items:center;padding:1px 8px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap;color:'+color+';background:'+bg+';border:1px solid '+border+'">'+label+'</span>';
}

function _budgetItemCard(item,idx,ctx){
  const doneIds=ctx.doneIds,todosGastosRender=ctx.todosGastosRender,todasTxRender=ctx.todasTxRender,cartoesRender=ctx.cartoesRender;
  const entryDelay=(idx*30)+'ms';
  if(item._isCartao){
    const done=doneIds.has(item.id);
    const pessoa=item._pessoa;
    /* A animação de entrada fica no wrapper externo, não no .budget-item — animar opacity
       diretamente no elemento que recebe a classe .done fazia a keyframe listItemIn (que
       termina em opacity:1) sobrescrever o opacity:.55 de .budget-item.done, deixando o item
       "realizado" sem o esmaecimento visual dos demais itens da lista. */
    return`<div id="budget${item.id}-wrap" style="animation:listItemIn .32s cubic-bezier(.16,1,.3,1) both;animation-delay:${entryDelay}">
      <div class="budget-item${done?' done':''}">
      <div class="budget-check${done?' checked':''}" data-no-swipe="1" onclick="toggleBudgetDone('${item.id}')">${done?'✓':''}</div>
      <div class="budget-info">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="card-logo" style="background:${item._cartao.color};height:20px;width:32px;font-size:10px;border-radius:4px">${item.name.substring(0,3).toUpperCase()}</div>
          <div class="budget-name">${item.name}</div>
        </div>
        <div class="budget-meta">
          <span style="white-space:nowrap">💳 Fatura cartão</span>
          ${item.dueDay?'<span style="color:var(--blue);font-size:10px">📅 '+String(item.dueDay).padStart(2,'0')+(item.dueMonthOffset?'/'+MONTHS[(curMonth+item.dueMonthOffset)%12].slice(0,3):'')+'</span>':''}
          ${_budgetStatusPill(item,done)}
          ${pessoa?'<span class="person-tag" style="white-space:nowrap">'+personAvatarHtml(pessoa,14,8)+' '+pessoa.nome+'</span>':''}
        </div>
      </div>
      <div class="budget-right">
        <div class="budget-val" style="color:var(--red)">-${fmt(item.value)}</div>
        <button class="tx-btn edit" style="margin-top:3px" onclick="showPage('cards',document.querySelector('.nav-btn:nth-child(3)'))">ver</button>
      </div>
      ${item._gastos&&item._gastos.length?'<div class="budget-item-full">'+renderSubitemsHtml(item._gastos.map(g=>({name:g.name,value:g.value})))+'</div>':''}
      </div>
    </div>`;
  }
  const done=doneIds.has(item.id);
  const income=item.type==='income';
  // Barra de progresso categoria (RN-03, RN-12)
  var catBarHtml='';
  if(item.categoriaKey){
    var realizado=calcCategoriaRealizado(item.id,todosGastosRender,todasTxRender,cartoesRender,curMonth,curYear);
    var orcado=item.value||0;
    var pct=orcado>0?(realizado/orcado*100):0;
    var barColor=pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--green)';
    var barWidth=Math.min(100,pct);
    catBarHtml='<div style="margin-top:8px">'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">'+
      '<span style="font-size:11px;color:var(--text3)">Realizado</span>'+
      '<span style="font-size:11px;color:'+barColor+';font-family:var(--mono)">'+fmt(realizado)+' / '+fmt(orcado)+'</span>'+
      '</div>'+
      '<div style="height:4px;background:var(--bg4);border-radius:2px;overflow:hidden">'+
      '<div style="height:100%;border-radius:2px;background:'+barColor+';width:'+barWidth+'%"></div>'+
      '</div>'+
      '</div>';
  }
  const swKey='budget'+item.id;
  const isOpen=!!swipeOpen[swKey];
  const isClosing=!!swipeClosing[swKey];
  const isSwipeOpen=isOpen||isClosing;
  const swipeX=isOpen?'-128px':'0px';
  const actionsHtml=isSwipeOpen?
    '<div style="position:absolute;inset:0;display:flex;justify-content:flex-end">'+
    '<div style="width:20px;background:var(--blue);flex-shrink:0"></div>'+
    '<button class="swipe-action-btn" style="background:var(--blue)" onclick="onSwipeEditBudget('+item.id+',\''+swKey+'\')">'+
    '<svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'+
    'Editar'+
    '</button>'+
    '<button class="swipe-action-btn" style="background:var(--red)" onclick="deleteBudgetItem('+item.id+')">'+
    '<svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'+
    'Excluir'+
    '</button>'+
    '</div>':'';
  return'<div id="'+swKey+'-wrap" style="position:relative;overflow:hidden;border-radius:var(--radius-sm);animation:listItemIn .32s cubic-bezier(.16,1,.3,1) both;animation-delay:'+entryDelay+'">'+
    actionsHtml+
    '<div class="budget-item'+(done?' done':'')+'" style="transform:translateX('+swipeX+');transition:transform .28s cubic-bezier(.4,0,.2,1),opacity .15s" onpointerdown="swipeDown(event)" onpointermove="swipeMove(event)" onpointerup="swipeUp(\''+swKey+'\',event,function(){showBudgetEditById('+item.id+')},function(){patchBudgetCard('+item.id+')})">'+
    '<div class="budget-check'+(done?' checked':'')+'" data-no-swipe="1" onclick="toggleBudgetDone('+item.id+')">'+(done?'✓':'')+'</div>'+
    '<div class="budget-info">'+
    '<div class="budget-name">'+item.name+'</div>'+
    '<div class="budget-meta">'+
    '<span class="budget-meta-row">'+
    (CAT_LABELS[item.type]||'')+
    (!item.delayed&&(item.recurrence==='always'||item.type==='fixed'||item.type==='income')?'<span class="badge badge-blue">fixo</span>':'')+
    (item.installmentCur&&item.installmentTotal&&!item.subRepeatStart?'<span class="badge badge-amber">'+item.installmentCur+'/'+item.installmentTotal+'</span>':'')+
    (item.dueDay?'<span style="color:var(--blue);font-size:10px">📅 '+String(item.dueDay).padStart(2,'0')+(item.dueMonthOffset?'/'+MONTHS[(curMonth+item.dueMonthOffset)%12].slice(0,3):'')+'</span>':'')+
    '</span>'+
    _budgetStatusPill(item,done)+
    (item._pessoa?'<span class="person-tag" style="white-space:nowrap">'+personAvatarHtml(item._pessoa,14,8)+' '+item._pessoa.nome+'</span>':'')+
    (item.obs?'<div class="tx-obs" style="font-size:11px;color:var(--text2);margin-top:3px">💬 '+item.obs+'</div>':'')+
    '</div>'+
    '</div>'+
    '<div class="budget-right">'+
    '<div class="budget-val" style="'+(income?'color:var(--green)':'color:var(--text2)')+'">'+
    (income?'+':'-')+fmt(item.value)+
    '</div>'+
    '</div>'+
    ((item.subitems&&item.subitems.length)||catBarHtml?'<div class="budget-item-full">'+
      (item.subitems&&item.subitems.length?renderSubitemsHtml(item.subitems):'')+
      catBarHtml+
    '</div>':'')+
    '</div>'+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════════
   FASE 4 — Resumo do Orçamento como mini-tabela (seção 6 da spec extraída).
   Previsto x Realizado por natureza (Receita/Despesa/Saldo). `manualItems`
   já é o equivalente do `budgetFiltered` da spec (exclui categorias puras,
   respeita recorrência e filtro de pessoa). Fórmulas copiadas literalmente.
   ══════════════════════════════════════════════════════════════════════ */
function _renderBudgetSummaryTable(budgetFiltered, doneIds, catRealizado, catOrcado){
  const tableEl=document.getElementById('budget-summary-table');
  if(!tableEl)return 0;
  catRealizado=catRealizado||0;
  catOrcado=catOrcado||0;

  const bIncItems=budgetFiltered.filter(function(b){return b.type==='income';});
  const bExpItems=budgetFiltered.filter(function(b){return b.type!=='income';});
  const bOrcInc=bIncItems.reduce(function(a,b){return a+b.value;},0);
  const bRealInc=bIncItems.filter(function(b){return doneIds.has(b.id);}).reduce(function(a,b){return a+b.value;},0);
  // Previsto usa o Valor Orçado Mensal fixo de cada categoria (catOrcado) — não varia se a
  // categoria estourar o orçado. Antes o Previsto somava catRealizado + o saldo restante da
  // categoria, que sobe junto com o gasto real quando ela passa do limite, distorcendo o que de
  // fato foi planejado pro período.
  const bOrcExp=bExpItems.reduce(function(a,b){return a+b.value;},0)+catOrcado;
  const bRealExp=bExpItems.filter(function(b){return doneIds.has(b.id);}).reduce(function(a,b){return a+b.value;},0)+catRealizado;
  const bOrcSaldo=bOrcInc-bOrcExp, bRealSaldo=bRealInc-bRealExp;

  const bDoneCount=budgetFiltered.filter(function(b){return doneIds.has(b.id);}).length;
  const bCountPct=budgetFiltered.length>0?Math.round(bDoneCount/budgetFiltered.length*100):0;
  const sgn=function(v){return v<0?'−':'+';};

  const rows=[
    {label:'Receita', prevStr:fmt(bOrcInc), realStr:fmt(bRealInc), color:'var(--green)', isSaldo:false},
    {label:'Despesa', prevStr:fmt(bOrcExp), realStr:fmt(bRealExp), color:'var(--red)', isSaldo:false},
    {label:'Saldo',   prevStr:sgn(bOrcSaldo)+fmt(Math.abs(bOrcSaldo)).replace('R$ ',''),
                       realStr:sgn(bRealSaldo)+fmt(Math.abs(bRealSaldo)).replace('R$ ',''),
                       color:bRealSaldo>=0?'var(--green)':'var(--red)', isSaldo:true}
  ].map(function(r){return Object.assign({},r,{rowBorder:r.isSaldo?'1px solid var(--border)':'none'});});

  const budgetCountLabel=bDoneCount+'/'+budgetFiltered.length+' realizados';
  const budgetPctW=bCountPct+'%';
  const budgetPctColor=bCountPct<50?'var(--amber)':bCountPct<100?'var(--blue)':'var(--green)';

  const rowsHtml=rows.map(function(r){
    return'<div style="display:contents">'
      +'<div style="font-size:12px;color:var(--text2);font-weight:500;padding:3px 0;border-top:'+r.rowBorder+'">'+r.label+'</div>'
      +'<div style="font-size:12px;font-family:var(--mono);color:var(--text3);text-align:right;white-space:nowrap;padding:3px 0;border-top:'+r.rowBorder+'">'+r.prevStr+'</div>'
      +'<div style="font-size:13px;font-weight:600;font-family:var(--mono);color:'+r.color+';text-align:right;white-space:nowrap;padding:3px 0;border-top:'+r.rowBorder+'">'+r.realStr+'</div>'
      +'</div>';
  }).join('');

  tableEl.innerHTML=
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px">'
    +'<span class="card-title" style="margin-bottom:0">Resumo do mês</span>'
    +'<span style="font-size:12px;color:var(--text3)">'+budgetCountLabel+'</span>'
    +'</div>'
    +'<div style="height:6px;background:var(--bg4);border-radius:3px;margin-bottom:14px;overflow:hidden">'
    +'<div style="width:'+budgetPctW+';height:100%;background:'+budgetPctColor+';transition:width .4s"></div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:6px 12px;align-items:center">'
    +'<div></div>'
    +'<div style="font-size:10px;color:var(--text3);text-align:right;text-transform:uppercase;letter-spacing:.5px">Previsto</div>'
    +'<div style="font-size:10px;color:var(--text3);text-align:right;text-transform:uppercase;letter-spacing:.5px">Realizado</div>'
    +rowsHtml
    +'</div>';
  return bRealSaldo;
}

/* ══════════════════════════════════════════════════════════════════════
   Lançamentos avulsos do mês — TXs feitas direto pela aba Lançamentos que
   não passam pelo fluxo de Orçamento nem de Categorias Orçadas, então hoje
   não aparecem em nenhum resumo. "Avulso" = sem fromBudget (não veio de um
   item de orçamento marcado como realizado) e sem categoriaId (já contado
   no card de Categorias Orçadas, senão duplicaria o valor em dois lugares).
   ══════════════════════════════════════════════════════════════════════ */
function _getAvulsosDoMes(todasTx,tm,ty,pFilter){
  return todasTx.filter(function(t){
    if(t.month!==tm||t.year!==ty||t.fromBudget||t.categoriaId)return false;
    if(pFilter&&t.pessoaId!==pFilter)return false;
    return true;
  });
}

function _renderBudgetAvulsosCard(avulsos,saldoPlanejado){
  const cardEl=document.getElementById('budget-avulsos-card');
  const tableEl=document.getElementById('budget-avulsos-table');
  if(!cardEl||!tableEl)return;
  cardEl.style.display='block';

  if(!avulsos.length){
    tableEl.innerHTML=
      '<div class="card-title" style="margin-bottom:8px">Lançamentos avulsos do mês</div>'
      +'<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">'
      +'Nenhum lançamento fora do orçamento neste período.'
      +'</div>';
    return;
  }

  const incs=avulsos.filter(function(t){return t.type==='income';});
  const exps=avulsos.filter(function(t){return t.type!=='income';});
  const totalInc=incs.reduce(function(a,t){return a+t.value;},0);
  const totalExp=exps.reduce(function(a,t){return a+t.value;},0);
  const saldoAvulsos=totalInc-totalExp;
  const saldoTotal=saldoPlanejado+saldoAvulsos;
  const sgn=function(v){return v<0?'−':'+';};

  const sorted=[...avulsos].sort(function(a,b){return(b.date||'')>(a.date||'')?1:(b.date||'')<(a.date||'')?-1:b.id-a.id;});
  const itemsHtml=sorted.map(function(t){
    const inc=t.type==='income';
    return'<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--border)">'
      +'<span style="font-size:12px;color:var(--text2);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+t.name+'</span>'
      +'<span style="font-size:12px;font-family:var(--mono);font-weight:600;color:'+(inc?'var(--green)':'var(--red)')+';white-space:nowrap;margin-left:8px">'+(inc?'+':'−')+fmt(t.value)+'</span>'
      +'</div>';
  }).join('');

  tableEl.innerHTML=
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px">'
    +'<span class="card-title" style="margin-bottom:0">Lançamentos avulsos do mês</span>'
    +'<span style="font-size:12px;color:var(--text3)">'+avulsos.length+' lançamento'+(avulsos.length>1?'s':'')+'</span>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;margin-bottom:4px">'
    +'<span style="font-size:12px;color:var(--text2)">Receita</span>'
    +'<span style="font-size:13px;font-weight:600;font-family:var(--mono);color:var(--green);text-align:right">'+fmt(totalInc)+'</span>'
    +'<span style="font-size:12px;color:var(--text2)">Despesa</span>'
    +'<span style="font-size:13px;font-weight:600;font-family:var(--mono);color:var(--red);text-align:right">'+fmt(totalExp)+'</span>'
    +'<span style="font-size:12px;color:var(--text2)">Saldo dos avulsos</span>'
    +'<span style="font-size:13px;font-weight:600;font-family:var(--mono);color:'+(saldoAvulsos>=0?'var(--green)':'var(--red)')+';text-align:right">'+sgn(saldoAvulsos)+fmt(Math.abs(saldoAvulsos)).replace('R$ ','')+'</span>'
    +'</div>'
    +'<div style="max-height:180px;overflow-y:auto">'+itemsHtml+'</div>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;margin-top:8px;border-top:1px solid var(--border)">'
    +'<span style="font-size:12px;font-weight:600;color:var(--text2)">Saldo total do mês</span>'
    +'<span style="font-size:14px;font-weight:600;font-family:var(--mono);color:'+(saldoTotal>=0?'var(--green)':'var(--red)')+'">'+sgn(saldoTotal)+fmt(Math.abs(saldoTotal)).replace('R$ ','')+'</span>'
    +'</div>';
}

/* ── CATEGORIAS ORÇADAS ── */

function _isRefMonthOrFuture(){
  var rm=parseInt(localStorage.getItem('refMonth')),ry=parseInt(localStorage.getItem('refYear'));
  if(isNaN(rm)||isNaN(ry)){var n=new Date();rm=n.getMonth();ry=n.getFullYear();}
  return curYear*12+curMonth>=ry*12+rm;
}
function _renderCategoriasBudget(allBudgetItems, todosGastos, todasTx, cartoes){
  const section=document.getElementById('categorias-budget-section');
  const list=document.getElementById('categorias-budget-list');
  if(!section||!list)return;
  if(!_isRefMonthOrFuture()){section.style.display='none';return;}
  section.style.display='';
  const cats=allBudgetItems.filter(function(b){return b.categoriaKey;});
  if(!cats.length){
    list.innerHTML=typeof emptyStateCategoriasHtml==='function'
      ?emptyStateCategoriasHtml()
      :'<div style="font-size:13px;color:var(--text3);text-align:center;padding:8px 0">Nenhuma categoria criada ainda</div>';
    return;
  }
  var html='';
  cats.forEach(function(cat,idx){
    var realizado=calcCategoriaRealizado(cat.id,todosGastos,todasTx,cartoes,curMonth,curYear);
    var pct=cat.value>0?Math.min(100,Math.round(realizado/cat.value*100)):0;
    var cor=pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--green)';
    var entryDelay=(idx*35)+'ms';
    html+='<div class="row-between-mt4" style="align-items:center;animation:listItemIn .32s cubic-bezier(.16,1,.3,1) both;animation-delay:'+entryDelay+'">'+
      '<div class="cat-open-detail" style="flex:1;min-width:0;cursor:pointer;transition:opacity .1s" onclick="openCategoriaDetail('+cat.id+')">'+
        '<div style="font-size:14px;font-weight:500"><span style="margin-right:6px">'+(cat.icon||'🏷️')+'</span>'+cat.name+'</div>'+
        '<div style="font-size:11px;color:var(--text3);margin-top:2px">'+
          'Realizado: '+fmt(realizado)+' / '+fmt(cat.value)+
        '</div>'+
        '<div style="background:var(--bg3);border-radius:4px;height:4px;margin-top:4px">'+
          '<div style="width:'+pct+'%;height:4px;border-radius:4px;background:'+cor+';transition:width .3s"></div>'+
        '</div>'+
      '</div>'+
      '<div style="display:flex;gap:6px;margin-left:12px;flex-shrink:0">'+
        '<button class="cat-edit-btn" onclick="showEditCategoriaModal('+cat.id+')">Editar</button>'+
        '<button class="cat-del-btn" onclick="deleteCategoriaModal('+cat.id+')">Excluir</button>'+
      '</div>'+
    '</div>';
  });
  list.innerHTML=html;
}

/* ══════════════════════════════════════════════════════════════════════
   FASE 4 — Detalhe de categoria orçada (seção 4 da spec extraída), bottom sheet.
   Reutiliza o modal padrão do projeto (openModal/closeModal, já usado como bottom
   sheet em toda a aplicação) em vez de criar uma nova infraestrutura de sheet.
   ══════════════════════════════════════════════════════════════════════ */
async function openCategoriaDetail(catId){
  try{
    const allBudgetItems=await budgetAll();
    const cat=allBudgetItems.find(function(b){return b.id===catId;});
    if(!cat){toast('Categoria não encontrada','var(--red)');return;}

    let todosGastos=[],todasTx=[],cartoes=[];
    try{todosGastos=await gastosAll();}catch(e){console.warn('[openCategoriaDetail] falha ao ler gastos, seguindo com array vazio:',e);}
    try{todasTx=await dbAll();}catch(e){console.warn('[openCategoriaDetail] falha ao ler transações, seguindo com array vazio:',e);}
    try{cartoes=await cartoesAll();}catch(e){console.warn('[openCategoriaDetail] falha ao ler cartões, seguindo com array vazio:',e);}

    const realizado=calcCategoriaRealizado(cat.id,todosGastos,todasTx,cartoes,curMonth,curYear);
    const pct=cat.value>0?Math.min(100,Math.round(realizado/cat.value*100)):0;
    const cor=pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--green)';

    // Lançamentos vinculados do mês corrente: união de gastos de cartão + tx normais
    const gLinked=todosGastos.filter(function(g){return g.categoriaId===cat.id&&g.month===curMonth&&g.year===curYear;});
    const tLinked=todasTx.filter(function(t){return t.categoriaId===cat.id&&t.month===curMonth&&t.year===curYear;});
    const linked=[]
      .concat(tLinked.map(function(t){return{name:t.name,value:t.value,date:t.date||''};}))
      .concat(gLinked.map(function(g){return{name:g.name,value:g.value,date:g.date||''};}))
      .sort(function(a,b){return(b.date||'')>(a.date||'')?1:(b.date||'')<(a.date||'')?-1:0;});

    const itemsHtml=linked.length?linked.map(function(x){
      const dateStr=x.date?fmtDate(x.date):'Sem data';
      return'<div style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px 12px">'
        +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+x.name+'</div>'
        +'<div style="font-size:10px;color:var(--text3)">'+dateStr+'</div></div>'
        +'<span style="color:var(--red);font-size:13px;font-weight:600;font-family:var(--mono);flex-shrink:0">−'+fmt(x.value)+'</span>'
        +'</div>';
    }).join(''):'<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">Nenhum lançamento vinculado este mês</div>';

    // Evolução 6 meses (incluindo o corrente): soma gastos + tx vinculados por mês
    const evo=[];
    for(let i=5;i>=0;i--){
      let em=curMonth-i,ey=curYear;while(em<0){em+=12;ey--;}
      const gm=todosGastos.filter(function(g){return g.categoriaId===cat.id&&g.month===em&&g.year===ey;}).reduce(function(a,g){return a+g.value;},0);
      const tm=todasTx.filter(function(t){return t.categoriaId===cat.id&&t.month===em&&t.year===ey;}).reduce(function(a,t){return a+t.value;},0);
      evo.push({label:MONTHS[em].slice(0,3),val:gm+tm});
    }
    const evoMax=Math.max.apply(null,evo.map(function(e){return e.val;}).concat([1]));
    const barsHtml=evo.map(function(e){
      const h=Math.max(3,e.val/evoMax*100).toFixed(0)+'%';
      return'<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:5px">'
        +'<div style="width:100%;flex:1;display:flex;align-items:flex-end;justify-content:center">'
        +'<div style="width:14px;height:'+h+';background:var(--amber);border-radius:3px;transform-origin:bottom;animation:barGrow .5s cubic-bezier(.34,1.56,.64,1) both"></div>'
        +'</div>'
        +'<span style="font-size:10px;color:var(--text3)">'+e.label+'</span>'
        +'</div>';
    }).join('');

    openModal(
      '<div style="font-size:16px;font-weight:600;margin-bottom:4px">'+(cat.icon||'🏷️')+' '+cat.name+'</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-bottom:10px">Realizado: '+fmt(realizado)+' / '+fmt(cat.value)+'</div>'
      +'<div style="background:var(--bg4);border-radius:4px;height:5px;margin-bottom:18px">'
      +'<div style="width:'+pct+'%;height:5px;border-radius:4px;background:'+cor+'"></div>'
      +'</div>'
      +'<div class="card-title" style="margin-bottom:8px">Lançamentos vinculados este mês</div>'
      +'<div style="display:flex;flex-direction:column;gap:7px;margin-bottom:20px">'+itemsHtml+'</div>'
      +'<div class="card-title" style="margin-bottom:8px">Evolução — 6 meses</div>'
      +'<div style="display:flex;align-items:flex-end;gap:8px;height:80px;margin-bottom:8px">'+barsHtml+'</div>'
      +'<div class="btn-row" style="margin-top:12px">'
      +'<button class="btn btn-primary" style="flex:1" onclick="closeModal()">Fechar</button>'
      +'</div>'
    );

  }catch(e){
    console.error('[openCategoriaDetail]',e);
    toast('Erro ao abrir detalhe da categoria','var(--red)');
  }
}

function showAddCategoriaModal(){
  var iconPickerHtml=typeof buildCatIconPickerHtml==='function'?buildCatIconPickerHtml(null):'';
  openModal(
    '<div class="modal-title">Nova Categoria Orçada</div>'+
    '<div class="form-group">'+
      '<label>Nome</label>'+
      '<input id="cat-nome" placeholder="Ex: Gasolina, Mercado..." oninput="clearFieldError(\'cat-nome\')">'+
      '<div class="field-error-msg" id="cat-nome-err"></div>'+
    '</div>'+
    '<div class="form-group">'+
      '<label>Valor Orçado Mensal</label>'+
      '<input id="cat-valor" type="text" inputmode="decimal" placeholder="0,00" oninput="clearFieldError(\'cat-valor\')">'+
      '<div class="field-error-msg" id="cat-valor-err"></div>'+
    '</div>'+
    iconPickerHtml+
    '<div class="btn-row">'+
      '<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
      '<button class="btn btn-primary" id="cat-save-btn">Adicionar</button>'+
    '</div>'
  );
  setTimeout(function(){
    var btn=document.getElementById('cat-save-btn');
    if(btn)btn.onclick=saveCategoriaModal;
    var inp=document.getElementById('cat-nome');
    if(inp)inp.focus();
  },80);
}

async function saveCategoriaModal(){
  var name=(document.getElementById('cat-nome')?.value||'').trim();
  var valorRaw=(document.getElementById('cat-valor')?.value||'').replace(',','.');
  var valor=parseFloat(valorRaw);
  if(!name){setFieldError('cat-nome','Informe o nome');return;}
  if(isNaN(valor)||valor<=0){setFieldError('cat-valor','Informe um valor válido');return;}
  try{
    await budgetAdd({
      name:name,
      value:valor,
      type:'expense',
      recurrence:'always',
      categoriaKey:toCategoriaKey(name),
      isCategoriaOnly:true,
      icon:(typeof _catIconSelected!=='undefined'?_catIconSelected:null)||null
    });
    toast('Categoria adicionada!','var(--teal)');
    closeModal();
    renderBudget();
  }catch(e){
    console.error('[saveCategoriaModal]',e);
    toast('Erro ao salvar categoria','var(--red)');
  }
}

async function showEditCategoriaModal(id){
  var all=[];
  try{all=await budgetAll();}catch(e){console.warn('[showEditCategoriaModal] falha ao ler itens de orçamento:',e);}
  var cat=all.find(function(b){return b.id===id;});
  if(!cat){toast('Categoria não encontrada','var(--red)');return;}
  var iconPickerHtml=typeof buildCatIconPickerHtml==='function'?buildCatIconPickerHtml(cat.icon||null):'';
  openModal(
    '<div class="modal-title">Editar Categoria</div>'+
    '<div class="form-group">'+
      '<label>Nome</label>'+
      '<input id="cat-nome" value="'+cat.name.replace(/"/g,'&quot;')+'" oninput="clearFieldError(\'cat-nome\')">'+
      '<div class="field-error-msg" id="cat-nome-err"></div>'+
    '</div>'+
    '<div class="form-group">'+
      '<label>Valor Orçado Mensal</label>'+
      '<input id="cat-valor" type="text" inputmode="decimal" value="'+cat.value+'" oninput="clearFieldError(\'cat-valor\')">'+
      '<div class="field-error-msg" id="cat-valor-err"></div>'+
    '</div>'+
    iconPickerHtml+
    '<div class="btn-row">'+
      '<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'+
      '<button class="btn btn-primary" id="cat-save-btn">Salvar</button>'+
    '</div>'
  );
  setTimeout(function(){
    var btn=document.getElementById('cat-save-btn');
    if(btn)btn.onclick=function(){saveEditCategoriaModal(id,cat);};
  },80);
}

async function saveEditCategoriaModal(id, catOriginal){
  var name=(document.getElementById('cat-nome')?.value||'').trim();
  var valorRaw=(document.getElementById('cat-valor')?.value||'').replace(',','.');
  var valor=parseFloat(valorRaw);
  if(!name){setFieldError('cat-nome','Informe o nome');return;}
  if(isNaN(valor)||valor<=0){setFieldError('cat-valor','Informe um valor válido');return;}
  try{
    await budgetPut(Object.assign({},catOriginal,{
      name:name,
      value:valor,
      categoriaKey:toCategoriaKey(name),
      icon:(typeof _catIconSelected!=='undefined'?_catIconSelected:null)||null
    }));
    toast('Categoria atualizada!','var(--teal)');
    closeModal();
    renderBudget();
  }catch(e){
    console.error('[saveEditCategoriaModal]',e);
    toast('Erro ao salvar categoria','var(--red)');
  }
}

function deleteCategoriaModal(id){
  showConfirm(
    'Excluir categoria',
    'Os gastos vinculados perdem a referência mas não são apagados.',
    [
      {label:'Cancelar',cls:'btn-ghost',action:function(){}},
      {label:'Excluir',cls:'btn-danger',action:async function(){
        try{
          await budgetDel(id);
          toast('Categoria excluída','var(--red)');
          renderBudget();
        }catch(e){
          console.error('[deleteCategoriaModal]',e);
          toast('Erro ao excluir','var(--red)');
        }
      }}
    ]
  );
}