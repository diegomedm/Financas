function entryFormHtml(t=null){
  const isEdit=!!t;
  const defDate=t?.date||todayISO();
  const defMonth=t!=null?t.month:curMonth;
  const defYear=t!=null?t.year:curYear;
  const defType=t?.type||'variable';
  const defObs=t?.obs||'';
  const defVal=isEdit?(t.rawExpr?String(t.rawExpr):String(t.value)):'';
  const canDuplicate=!!(isEdit&&t.id);
  return`
    <div class="modal-title">${isEdit?'✏️ Editar lançamento':'Novo lançamento'}</div>
    <div class="form-group">
      <label>Descrição</label>
      <input id="f-name" placeholder="Ex: Aluguel, Salário, Netflix..." oninput="clearFieldError('f-name')" value="${isEdit?t.name.replace(/"/g,'&quot;'):''}">
      <div class="field-error-msg" id="f-name-err"></div>
    </div>
    <div class="form-group">
      <label>Valor</label>
      <div class="row-flex">
        <input id="f-val" type="text" inputmode="decimal" placeholder="0,00" value="${defVal}" style="flex:1" oninput="onValInput()">
      <div class="field-error-msg" id="f-val-err"></div>
        <button type="button" onclick="openValNumpad()" class="btn-calc" title="Calculadora">📟</button>
      </div>
      <div id="val-preview" class="hint"></div>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Tipo</label>
        <select id="f-type" onchange="onTypeChange()" ${(isEdit&&(t?.fromBudget||t?.fromCartao))?'disabled':''}>
          <option value="income"${defType==='income'?' selected':''}>💵 Receita</option>
          ${(isEdit&&t?.type==='fixed')?'<option value="fixed"'+(defType==='fixed'?' selected':'')+'>🏠 Despesa Fixa</option>':''}
          <option value="variable"${defType==='variable'?' selected':''}>🛒 Despesa Variável</option>
          ${(isEdit&&t?.fromCartao)?'<option value="credit" selected>💳 Fatura cartão</option>':''}
        </select>
      </div>
      <div class="form-group">
        <label>Vencimento <span class="label-muted">(opcional)</span></label>
        <div class="row-flex">
          <input id="f-date" type="date" value="${t?.date||''}" style="flex:1" onchange="toggleDateClear('f-date-clear',this.value)">
          <button type="button" id="f-date-clear" onclick="clearDate('f-date','f-date-clear')" class="btn-clear-date" style="display:${(t?.date)?'inline':'none'}" title="Limpar">✕</button>
        </div>
      </div>
    </div>
    <div class="form-grid" style="margin-top:-4px">
      <div class="form-group">
        <label>Pago em <span class="label-muted">(opcional)</span></label>
        <div class="row-flex">
          <input id="f-paid" type="date" value="${t?.paidDate||''}" style="flex:1" onchange="toggleDateClear('f-paid-clear',this.value)">
          <button type="button" id="f-paid-clear" onclick="clearDate('f-paid','f-paid-clear')" class="btn-clear-date" style="display:${(t?.paidDate)?'inline':'none'}" title="Limpar">✕</button>
        </div>
      </div>
      <div></div>
    </div>
    <div class="form-group">
      <label>Período (mês/ano em que entra no controle)</label>
      <div style="display:flex;gap:8px">
        <select id="f-month" style="flex:1">${MONTHS.map((m,i)=>`<option value="${i}"${i===defMonth?' selected':''}>${m}</option>`).join('')}</select>
        <input id="f-year" type="number" value="${defYear}" style="width:80px;flex-shrink:0" inputmode="numeric">
      </div>
    </div>

    <div class="form-group">
      <div class="row-between-mb">
        <label style="margin:0">Subitens</label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="addSubitem()">+ Subitem</button>
      </div>
      <div id="subitems-area"></div>
      <div class="hint">O valor total será calculado automaticamente pelos subitens</div>
    </div>

    <div class="form-group" id="f-pessoa-group">
      <label>Responsável <span class="label-muted">(opcional)</span></label>
      <div id="f-pessoa-chips" class="row-flex-wrap"></div>
    </div>
    <div class="form-group">
      <label>Observações <span class="label-muted">(opcional)</span></label>
      <textarea id="f-obs" placeholder="Detalhes, itens agrupados...">${defObs}</textarea>
    </div>
    <div class="form-group">
      <label>Categoria <span class="label-muted">(opcional)</span></label>
      <select id="f-categoria"></select>
    </div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-primary" style="flex:1" onclick="${isEdit?`updateEntry(${t.id})`:'saveEntry()'}">${isEdit?'Salvar edição':'Salvar'}</button>
      ${canDuplicate?'<button type="button" class="btn btn-ghost" style="flex:0;padding:11px 14px" onclick="duplicateDraft()" title="Cria uma cópia deste lançamento">⧉</button>':''}
      <button class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancelar</button>
    </div>`;
}

function onValInput(){
  clearFieldError('f-val');
  const inp=document.getElementById('f-val');
  const raw=inp?.value||'';
  if(inp&&inp.dataset)inp.dataset.rawExpr='';
  const prev=document.getElementById('val-preview');
  if(!prev)return;
  if(hasOp(raw)){
    const r=evalExpr(raw);
    prev.textContent=isNaN(r)?'⚠ Expressão inválida':'= '+fmt(r);
    prev.style.color=isNaN(r)?'var(--red)':'var(--green)';
  }else{prev.textContent=''}
}
function clearDate(inputId,btnId){
  const inp=document.getElementById(inputId);
  if(inp)inp.value='';
  const btn=document.getElementById(btnId);
  if(btn)btn.style.display='none';
}
function toggleDateClear(btnId,val){
  const btn=document.getElementById(btnId);
  if(btn)btn.style.display=val?'inline':'none';
}
async function openValNumpad(){
  const valInp=document.getElementById('f-val');
  const cur=valInp?.dataset.rawExpr||valInp?.value||'';
  const result=await openNumpad(cur);
  if(result!==null&&valInp){clearFieldError('f-val');
    if(hasOp(result)){
      const r=evalExpr(result);
      if(!isNaN(r)){
        valInp.dataset.rawExpr=result;
        valInp.value=result;
        const prev=document.getElementById('val-preview');
        if(prev){prev.textContent='= '+fmt(r);prev.style.color='var(--green)';}
      }
    }else{
      valInp.dataset.rawExpr='';
      valInp.value=result;
      const prev=document.getElementById('val-preview');
      if(prev)prev.textContent='';
    }
  }
}

function onTypeChange(){
  // type change handler mantido para compatibilidade com o select existente
}

function _popularCategoriaTx(selectedId){
  budgetAll().then(function(budgets){
    var sel=document.getElementById('f-categoria');
    if(!sel)return;
    var filtered=budgets.filter(function(b){return b.categoriaKey;});
    var sorted=filtered.slice().sort(function(a,b){return(a.name||'').localeCompare(b.name||'');});
    var opts='<option value="">— Sem categoria —</option>';
    for(var i=0;i<sorted.length;i++){
      var b=sorted[i];
      var sel2=selectedId&&b.id===selectedId?'selected':'';
      opts+='<option value="'+b.id+'" '+sel2+'>'+b.name+'</option>';
    }
    sel.innerHTML=opts;
  }).catch(function(){});
}
function showAddModal(){
  openModal(entryFormHtml());
  setTimeout(function(){
    renderPessoaChips('f-pessoa-chips',null);
    _popularCategoriaTx(null);
  },50);
}
function showEditModal(id){dbAll().then(all=>{
  const t=all.find(x=>x.id===id);
  if(!t)return;
  _openTxModalWith(t);
})}

// Abre o modal de lançamento (novo ou edição) já populado com um objeto tipo TX.
// Reutilizada por showEditModal (id real) e duplicateDraft (id null, sem persistência).
function _openTxModalWith(t){
  openModal(entryFormHtml(t));
  const mc=document.getElementById('modal-content');
  if(mc){if(t&&t.id)mc.dataset.editingId=String(t.id);else delete mc.dataset.editingId;}
  setTimeout(()=>{
    const inp=document.getElementById('f-val');
    if(inp&&t.rawExpr){
      inp.dataset.rawExpr=t.rawExpr;
      const r=evalExpr(t.rawExpr);
      const prev=document.getElementById('val-preview');
      if(prev&&!isNaN(r)){prev.textContent='= '+fmt(r);prev.style.color='var(--green)';}
    }
    if(t.subitems?.length){
      t.subitems.forEach(s=>addSubitem(s.name,s.value,s.repeat||0,s.sgid||'',s.skip||[]));
      updateSubitemsTotal();
    }
    renderPessoaChips('f-pessoa-chips',t.pessoaId||null);
    _popularCategoriaTx(t.categoriaId||null);
  },50);
}

// Duplicar lançamento (Fase 2, seção 3) — le o form atual (draft em edição) e reabre
// o modal como criação nova: id=null, paidDate='', subitems clonados (shallow copy).
// Mantém month/year/date do original (apenas repeatLast usa o mês navegado atual).
function duplicateDraft(){
  const mc=document.getElementById('modal-content');
  const editingId=mc?.dataset?.editingId;
  if(!editingId)return;
  const{name,val,rawExpr,type,date,month,year,obs,subitems,pessoaId,categoriaId}=getFormValues();
  const draft={
    id:null,
    name,value:val,rawExpr,type,date,paidDate:'',month,year,obs,
    subitems:(subitems||[]).map(x=>({...x})),
    pessoaId,categoriaId
  };
  _openTxModalWith(draft);
  toast('Duplicado — ajuste e salve','var(--blue)');
}


function addSubitem(name='',value='',repeat=1,sgid='',skip=[]){
  const area=document.getElementById('modal-b-subitems-area')||document.getElementById('b-subitems-area')||document.getElementById('subitems-area');
  if(!area)return;
  const isTxArea=area.id==='subitems-area';
  const row=document.createElement('div');
  row.className='subitem-row';
  const hasRepeat=repeat>0;
  // gerar sgid se tem repeat e nao foi passado
  const sid=hasRepeat?(sgid||Date.now().toString(36)+Math.random().toString(36).slice(2,5)):'';
  if(sid)row.dataset.sgid=sid;
  if(skip&&skip.length)row.dataset.skip=JSON.stringify(skip);
  if(isTxArea){
    // form de TX: apenas nome e valor, sem repeat
    row.innerHTML=
      '<input class="sub-name" placeholder="Nome do subitem" value="'+name+'">'
      +'<input class="sub-value" type="number" step="0.01" placeholder="0,00" value="'+value+'" oninput="updateSubitemsTotal()">'
      +'<button type="button" class="subitem-remove" onclick="removeSubitem(this)">✕</button>';
  }else{
    row.innerHTML=
      '<input class="sub-name" placeholder="Nome do subitem" value="'+name+'">'
      +'<input class="sub-value" type="number" step="0.01" placeholder="0,00" value="'+value+'" oninput="updateSubitemsTotal()">'
      +'<button type="button" class="subitem-repeat'+(hasRepeat?' active':'')+'" title="N vezes" onclick="toggleSubitemRepeat(this)">&#x27F3;</button>'
      +'<input class="sub-repeat" type="number" min="1" max="99" placeholder="N" value="'+(hasRepeat?repeat:'')+'" oninput="updateSubitemsTotal()" style="'+(hasRepeat?'':'display:none')+'">'
      +'<button type="button" class="subitem-remove" onclick="removeSubitem(this)">✕</button>';
  }
  area.appendChild(row);
  updateSubitemsTotal();
}
function toggleSubitemRepeat(btn){
  const row=btn.parentElement;
  const inp=row.querySelector('.sub-repeat');
  const active=btn.classList.toggle('active');
  inp.style.display=active?'block':'none';
  if(!active){
    inp.value='';
    delete row.dataset.sgid;
    updateSubitemsTotal();
  }else{
    if(!row.dataset.sgid)row.dataset.sgid=Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    inp.value='2';inp.focus();updateSubitemsTotal();
  }
}

function removeSubitem(btn){
  const row=btn.parentElement;
  const sgid=row.dataset.sgid||'';
  // Se nao tem sgid ou nao esta editando item com subRepeatStart: remove direto
  const modal=document.getElementById('modal-content');
  const hasRepeatCtx=modal&&modal.dataset.subRepeatStart&&modal.dataset.editingId;
  if(!sgid||!hasRepeatCtx){row.remove();updateSubitemsTotal();return;}
  const srs=JSON.parse(modal.dataset.subRepeatStart);
  const elapsed=(curYear*12+curMonth)-(srs.year*12+srs.month);
  const name=row.querySelector('.sub-name').value.trim()||'este subitem';
  const repeatInp=row.querySelector('.sub-repeat');
  const rep=parseInt(repeatInp?.value)||0;
  const remaining=rep-elapsed;
  showConfirm('Remover subitem','"'+name+'" — '+remaining+' mês(es) restante(s).',[
    {label:'Só este mês',cls:'btn-ghost',action:()=>{
      const skips=row.dataset.skip?JSON.parse(row.dataset.skip):[];
      skips.push(elapsed);
      row.dataset.skip=JSON.stringify(skips);
      row.style.opacity='0.5';
      updateSubitemsTotal();
    }},
    {label:'Este e seguintes',cls:'btn-ghost',action:()=>{
      row.dataset.repeatCap=String(elapsed);
      row.style.opacity='0.5';
      btn.disabled=true;
      updateSubitemsTotal();
    }},
    {label:'Todos os meses',cls:'btn-danger',action:()=>{
      row.remove();updateSubitemsTotal();
    }},
    {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
  ]);
}

function getSubitems(){
  const area=document.getElementById('modal-b-subitems-area')||document.getElementById('b-subitems-area')||document.getElementById('subitems-area');
  const rows=area?[...area.querySelectorAll('.subitem-row')]:[...document.querySelectorAll('.subitem-row')];
  return rows.map(r=>{
    const name=r.querySelector('.sub-name').value.trim();
    const value=parseFloat(r.querySelector('.sub-value').value)||0;
    if(!name||value<=0)return null;
    const repeatInp=r.querySelector('.sub-repeat');
    const repeat=repeatInp&&repeatInp.style.display!=='none'?Math.max(1,parseInt(repeatInp.value)||1):0;
    return {name:repeat>1?name+' 1/'+repeat:name,value};
  }).filter(Boolean);
}
function getRawSubitems(){
  const area=document.getElementById('modal-b-subitems-area')||document.getElementById('b-subitems-area')||document.getElementById('subitems-area');
  const rows=area?[...area.querySelectorAll('.subitem-row')]:[...document.querySelectorAll('.subitem-row')];
  return rows.map(r=>{
    const name=r.querySelector('.sub-name').value.trim();
    const value=parseFloat(r.querySelector('.sub-value').value)||0;
    if(!name||value<=0)return null;
    const repeatInp=r.querySelector('.sub-repeat');
    const repeatActive=repeatInp&&repeatInp.style.display!=='none';
    let repeat=repeatActive?Math.max(1,parseInt(repeatInp.value)||1):0;
    const sgid=r.dataset.sgid||'';
    if(r.dataset.repeatCap!=null)repeat=parseInt(r.dataset.repeatCap)||0;
    const skip=r.dataset.skip?JSON.parse(r.dataset.skip):[];
    if(repeat>0)return skip.length?{name,value,repeat,sgid,skip}:{name,value,repeat,sgid};
    return{name,value};
  }).filter(Boolean);
}

// Retorna os subitems ativos para um dado mes/ano, com label 'Nome X/N' quando repeat
function getActiveSubitems(subitems, startMonth, startYear, curM, curY){
  if(!subitems||!subitems.length)return[];
  const result=[];
  subitems.forEach(s=>{
    // subitem pode ter start proprio (adicionado em mes diferente)
    const sM=s.startMonth!=null?s.startMonth:startMonth;
    const sY=s.startYear!=null?s.startYear:startYear;
    const elapsed=(curY*12+curM)-(sY*12+sM);
    const rep=s.repeat; // 0/undefined=fixo, N>=1=limitado
    const skip=s.skip||[];
    if(!rep){
      if(!skip.includes(elapsed))result.push({name:s.name,value:s.value});
    } else if(elapsed>=0&&elapsed<rep){
      if(!skip.includes(elapsed)){
        result.push({name:s.name+' '+(elapsed+1)+'/'+rep,value:s.value});
      }
    }
  });
  return result;
}
function updateSubitemsTotal(){
  const subs=getSubitems();
  const total=subs.reduce((s,i)=>s+i.value,0);
  const valInp=document.getElementById('f-val')||document.getElementById('b-val');
  if(!valInp)return;
  const calcBtn=valInp.parentElement?.querySelector('button[title="Calculadora"]');
  if(subs.length){
    valInp.value=String(total.toFixed(2)).replace('.',',');
    if(valInp.dataset)valInp.dataset.rawExpr='';
    valInp.readOnly=true;
    valInp.style.opacity='.7';
    if(calcBtn){calcBtn.disabled=true;calcBtn.style.opacity='.3';calcBtn.style.cursor='not-allowed';}
    const prev=document.getElementById('val-preview')||document.getElementById('b-val-preview');
    if(prev)prev.textContent='';
  }else{
    valInp.readOnly=false;
    valInp.style.opacity='1';
    if(calcBtn){calcBtn.disabled=false;calcBtn.style.opacity='1';calcBtn.style.cursor='pointer';}
  }
}

function getFormValues(){
  const name=document.getElementById('f-name').value.trim();
  const valInp=document.getElementById('f-val');
  const fieldVal=(valInp?.value||'').trim();
  const storedExpr=valInp?.dataset?.rawExpr||'';
  const exprToEval=storedExpr||fieldVal;
  let val=NaN, rawExpr=null;
  if(hasOp(exprToEval)){
    val=evalExpr(exprToEval);
    if(!isNaN(val))rawExpr=exprToEval;
  }
  if(isNaN(val)){val=parseFloat(fieldVal.replace(',','.'));}
  if(isNaN(val)){val=parseFloat(fieldVal.replace('.','').replace(',','.'));}
  const type=document.getElementById('f-type').value;
  const date=document.getElementById('f-date')?.value||'';
  const paidDate=document.getElementById('f-paid')?.value||'';
  const month=parseInt(document.getElementById('f-month').value);
  const year=parseInt(document.getElementById('f-year').value);
  const obs=document.getElementById('f-obs')?.value.trim()||'';
  const subitems=getRawSubitems();
  const pessoaId=getSelectedPessoa('f-pessoa-chips');
  const categoriaId=parseInt(document.getElementById('f-categoria')?.value)||null;
  return{name,val,rawExpr,type,date,paidDate,month,year,obs,subitems,pessoaId,categoriaId};
}

async function saveEntry(){

  try{
    const{name,val,rawExpr,type,date,paidDate,month,year,obs,subitems,pessoaId,categoriaId}=getFormValues();
    if(!name){setFieldError('f-name','Informe o nome');return}
      if(!val||isNaN(val)||val<=0){setFieldError('f-val','Informe um valor válido');return}
    // item com subitems que tem repeat: salva 1 registro com subitems raw
    const rawSubs=getRawSubitems();
    const hasSubRepeat=rawSubs.some(s=>s.repeat>0);
    if(hasSubRepeat){
      await dbAdd({name,value:val,rawExpr,type,month,year,ym:ym(year,month),date,paidDate,obs,
        subitems:rawSubs,pessoaId,categoriaId,
        subRepeatStart:{month,year},
        createdAt:Date.now()});
      toast('Lançamento salvo!');
    }else{
      await dbAdd({name,value:val,rawExpr,type,month,year,ym:ym(year,month),date,paidDate,obs,subitems,pessoaId,categoriaId,createdAt:Date.now()});
      toast('Lançamento salvo!');
    }
    closeModal();renderAll();

  }catch(e){
    console.error('[saveEntry]',e);
    toast('Erro ao salvar lançamento','var(--red)');
  }
}

async function updateEntry(id){

  try{
    const{name,val,rawExpr,type,date,paidDate,month,year,obs,subitems,pessoaId,categoriaId}=getFormValues();
    if(!name){setFieldError('f-name','Informe o nome');return}
      if(!val||isNaN(val)||val<=0){setFieldError('f-val','Informe um valor válido');return}
    const all=await dbAll();
    const existing=all.find(x=>x.id===id);
    if(!existing)return;

    const hasGroup=!!existing.groupId;

    if(hasGroup){
      const futureInGroup=all.filter(x=>x.groupId===existing.groupId&&ym(x.year,x.month)>ym(existing.year,existing.month));
      if(futureInGroup.length>0){
        closeModal();
        showConfirm('Editar lançamento','Este lançamento faz parte de uma série. O que deseja atualizar?',[
          {label:'Apenas este período',cls:'btn-ghost',action:async()=>{await dbPut({...existing,name,value:val,rawExpr,type,date,paidDate,month,year,ym:ym(year,month),obs,subitems,pessoaId,categoriaId});toast('Lançamento atualizado!','var(--green)');renderAll()}},
          {label:'Este e todos os seguintes',cls:'btn-primary',action:async()=>{
            const toUpdate=[existing,...futureInGroup].sort((a,b)=>ym(a.year,a.month)-ym(b.year,b.month));
            let m=month,y=year,d=date;
            for(const x of toUpdate){
              await dbPut({...x,name,value:val,rawExpr,type,month:m,year:y,ym:ym(y,m),date:d,paidDate,obs,subitems,pessoaId,categoriaId});
              if(d){const nd=addMonths(d,1);if(nd)d=nd;}m++;if(m>11){m=0;y++}
            }
            toast('Série atualizada!','var(--green)');renderAll();
          }},
          {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
        ]);
        return;
      }
    }
    await dbPut({...existing,name,value:val,rawExpr,type,date,paidDate,month,year,ym:ym(year,month),obs,subitems,pessoaId,categoriaId});
    toast('Lançamento atualizado!','var(--green)');
    closeModal();renderAll();

  }catch(e){
    console.error('[updateEntry]',e);
    toast('Erro ao salvar lançamento','var(--red)');
  }
}

async function deleteTx(id){

  try{
    const all=await dbAll();
    const item=all.find(x=>x.id===id);
    if(!item){await dbDel(id);renderAll();return}
    if(item.groupId){
      const future=all.filter(x=>x.groupId===item.groupId&&ym(x.year,x.month)>ym(item.year,item.month));
      if(future.length>0){
        showConfirm('Remover lançamento','Este lançamento faz parte de uma série.',[
          {label:'Remover só este',cls:'btn-ghost',action:async()=>{await dbDel(id);toast('Removido','var(--red)');renderAll()}},
          {label:`Remover este + ${future.length} seguinte(s)`,cls:'btn-danger',action:async()=>{
            await dbDel(id);
            for(const x of future)await dbDel(x.id);
            toast(`${future.length+1} lançamentos removidos`,'var(--red)');renderAll();
          }},
          {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
        ]);
        return;
      }
    }
    if(!confirm('Remover este lançamento?'))return;
    await dbDel(id);toast('Removido','var(--red)');renderAll();

  }catch(e){
    console.error('[deleteTx]',e);
    toast('Erro ao remover lançamento','var(--red)');
  }
}

// ── Swipe em lançamentos (Fase 2, seção 5) ──
// Algoritmo replicado 1:1 do protótipo: threshold de 42px para abrir/fechar,
// 8px para diferenciar tap de drag, pointer events, translateX -128px quando aberto.
function swipeDown(e){
  if(e&&e.target&&e.target.closest&&e.target.closest('[data-no-swipe]')){_swIgnore=true;_swX=null;return;}
  _swIgnore=false;_swX=e.clientX;_swY=e.clientY;_swMoved=false;
}
function swipeMove(e){
  if(_swIgnore||_swX==null)return;
  if(Math.abs(e.clientX-_swX)>8)_swMoved=true;
}
function swipeUp(key,e,tapFn,renderFn){
  // Re-checa o alvo também no "up" (não só no "down") — evita vazamento de estado
  // de arraste entre linhas diferentes quando o toque começa fora e termina dentro
  // (ou vice-versa) de um controle [data-no-swipe].
  renderFn=renderFn||renderTx;
  if(_swIgnore||(e&&e.target&&e.target.closest&&e.target.closest('[data-no-swipe]'))){_swIgnore=false;_swX=null;return;}
  const dx=(_swX!=null)?(e.clientX-_swX):0;
  _swX=null;
  if(dx<-42){swipeOpen={...swipeOpen,[key]:true};renderFn();return;}
  if(dx>42){closeSwipeGraceful(key,renderFn);return;}
  if(swipeOpen[key]){closeSwipeGraceful(key,renderFn);return;}
  if(!_swMoved&&tapFn)tapFn();
}
function closeSwipe(key,renderFn){renderFn=renderFn||renderTx;swipeOpen={...swipeOpen,[key]:false};renderFn();}
function closeSwipeGraceful(key,renderFn){
  renderFn=renderFn||renderTx;
  swipeOpen={...swipeOpen,[key]:false};
  swipeClosing={...swipeClosing,[key]:true};
  renderFn();
  clearTimeout(_swCloseTimers[key]);
  _swCloseTimers[key]=setTimeout(()=>{
    swipeClosing={...swipeClosing,[key]:false};
    renderFn();
  },300);
}
function onSwipeEditTx(id,key){closeSwipe(key,function(){patchTxCard(id);});showEditModal(id);}

function txTypeIconSvg(type){
  if(type==='income')return'<svg viewBox="0 0 24 24" style="stroke:var(--green)"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
  if(type==='fixed')return'<svg viewBox="0 0 24 24" style="stroke:var(--blue)"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  if(type==='credit')return'<svg viewBox="0 0 24 24" style="stroke:var(--purple)"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';
  return'<svg viewBox="0 0 24 24" style="stroke:var(--amber)"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>';
}

/* Cache do último array renderizado por renderTx() — usado por patchTxCard() para
   atualizar um único card no swipe sem re-renderizar a lista inteira (evita reiniciar
   a animação listItemIn em todos os itens a cada abrir/fechar de swipe). */
var _txListCache=[];
function patchTxCard(id){
  const idx=_txListCache.findIndex(t=>t.id===id);
  if(idx===-1){renderTx();return;}
  const wrap=document.getElementById('tx'+id+'-wrap');
  if(!wrap){renderTx();return;}
  const html=txCard(_txListCache[idx],idx);
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  const newWrap=tmp.firstElementChild;
  newWrap.style.animation='none';
  wrap.replaceWith(newWrap);
}

function txCard(t,idx){
  const income=t.type==='income';
  const entryDelay=((idx||0)*30)+'ms';
  const swKey='tx'+t.id;
  const isOpen=!!swipeOpen[swKey];
  const isClosing=!!swipeClosing[swKey];
  const isSwipeOpen=isOpen||isClosing;
  const swipeX=isOpen?'-128px':'0px';
  const actionsHtml=isSwipeOpen?`
    <div style="position:absolute;inset:0;display:flex;justify-content:flex-end">
      <div style="width:20px;background:var(--blue);flex-shrink:0"></div>
      <button class="swipe-action-btn" style="background:var(--blue)" onclick="onSwipeEditTx(${t.id},'${swKey}')">
        <svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        Editar
      </button>
      <button class="swipe-action-btn" style="background:var(--red)" onclick="deleteTx(${t.id})">
        <svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        Excluir
      </button>
    </div>`:'';
  return`<div id="${swKey}-wrap" style="position:relative;overflow:hidden;border-radius:var(--radius-sm);animation:listItemIn .3s cubic-bezier(.16,1,.3,1) both;animation-delay:${entryDelay}">
    ${actionsHtml}
    <div class="tx-item" style="transform:translateX(${swipeX});transition:transform .28s cubic-bezier(.4,0,.2,1),opacity .15s"
      onpointerdown="swipeDown(event)" onpointermove="swipeMove(event)" onpointerup="swipeUp('${swKey}',event,function(){showEditModal(${t.id})},function(){patchTxCard(${t.id})})">
    <div class="tx-icon ${t.type}">${txTypeIconSvg(t.type)}</div>
    <div class="tx-info">
      <div class="tx-name">${t.name}</div>
      <div class="tx-meta">
        <span>${CAT_LABELS[t.type]||''}</span>
        ${t.recurring||t.groupId?'<span class="badge badge-blue">série</span>':''}
        ${t.date?`<span>📅 Venc. ${fmtDate(t.date)}</span>`:''}
        ${t.paidDate?`<span style="color:var(--green)">✅ Pago ${fmtDate(t.paidDate)}</span>`:''}
        ${t._pessoa?`<span class="person-tag">${personAvatarHtml(t._pessoa,14,8)} ${t._pessoa.nome}</span>`:''}
      </div>
      ${t.obs?`<div class="tx-obs">💬 ${t.obs}</div>`:''}
    </div>
    <div class="tx-right">
      <div class="tx-val ${income?'income':'expense'}">${income?'+':'-'}${fmt(t.value)}</div>
    </div>
    ${t.subitems&&t.subitems.length?`<div class="tx-item-full">${renderSubitemsHtml(t.subitems)}</div>`:''}
    </div>
  </div>`;
}

function _fmtUpdateDate(ts){
  const d=new Date(parseInt(ts));
  const dia=String(d.getDate()).padStart(2,'0');
  const mes=String(d.getMonth()+1).padStart(2,'0');
  const ano=d.getFullYear();
  const h=String(d.getHours()).padStart(2,'0');
  const m=String(d.getMinutes()).padStart(2,'0');
  return dia+'/'+mes+'/'+ano+' às '+h+':'+m;
}
function loadLastUpdate(){
  const el=document.querySelector('.hero-saldo-footer');
  if(!el)return;
  const history=JSON.parse(localStorage.getItem('lastUpdateHistory')||'[]');
  const ts=history.length?history[history.length-1]:null;
  el.textContent=(ts?'🕐 Atualizado em '+_fmtUpdateDate(ts):'🕐 Nunca atualizado')+' · toque para marcar';
}
function markLastUpdate(){
  const history=JSON.parse(localStorage.getItem('lastUpdateHistory')||'[]');
  history.push(Date.now());
  if(history.length>20)history.splice(0,history.length-20);
  localStorage.setItem('lastUpdateHistory',JSON.stringify(history));
  localStorage.setItem('lastUpdate',String(history[history.length-1]));
  loadLastUpdate();
  toast('Marcado como atualizado!','var(--teal)');
}

function clearUpdateHistory(){
  showConfirm('Limpar histórico?','Todo o histórico de atualizações será removido.',[
    {label:'Limpar',cls:'btn-danger',action:()=>{
      localStorage.removeItem('lastUpdateHistory');
      localStorage.removeItem('lastUpdate');
      loadLastUpdate();
      closeModal();
    }},
    {label:'Cancelar',cls:'btn-ghost',action:()=>{}}
  ]);
}
function showUpdateHistory(){
  const history=JSON.parse(localStorage.getItem('lastUpdateHistory')||'[]');
  if(!history.length){toast('Nenhum registro de atualização','var(--amber)');return;}
  const rows=history.slice().reverse().map((ts,i)=>{
    const label=i===0?'<span style="font-size:10px;color:var(--teal);margin-left:6px">mais recente</span>':'';
    return '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">'+_fmtUpdateDate(ts)+label+'</div>';
  }).join('');
  openModal(
    '<div class="modal-title">🕐 Histórico de atualizações</div>'+
    '<div style="max-height:320px;overflow-y:auto">'+rows+'</div>'+
    '<div style="margin-top:12px;display:flex;gap:8px">'+
    '<button class="btn btn-ghost" style="flex:1" onclick="clearUpdateHistory()">Limpar histórico</button>'+
    '<button class="btn btn-primary" style="flex:1" onclick="closeModal()">Fechar</button>'+
    '</div>'
  );
}

function renderHeroSaldoCard(balance,balDelta,hasPrevData,dailyBal){
  const isPos=balance>=0;
  const valStr=(isPos?'+':'-')+fmt(Math.abs(balance));
  const digitsHtml=(typeof renderSlotDigits==='function')?renderSlotDigits(valStr):valStr;
  const badgeHtml=hasPrevData?(
    '<span class="hero-saldo-badge'+(balDelta<0?' neg':'')+'">'+(balDelta>=0?'▲':'▼')+' '+Math.abs(balDelta)+'% vs mês ant.</span>'
  ):'';
  // Sparkline: normaliza dailyBal (saldo acumulado dia a dia) em viewBox 300x40
  let sparkHtml='';
  if(dailyBal&&dailyBal.length>1){
    const w=300,h=40,pad=4;
    const max=Math.max.apply(null,dailyBal.concat([0]));
    const min=Math.min.apply(null,dailyBal.concat([0]));
    const range=(max-min)||1;
    const stepX=(w-pad*2)/(dailyBal.length-1);
    const pts=dailyBal.map((v,i)=>{
      const x=pad+i*stepX;
      const y=pad+(1-(v-min)/range)*(h-pad*2);
      return x.toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    sparkHtml='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="width:100%;height:34px;margin-top:13px;display:block">'
      +'<polyline points="'+pts+'" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1;animation:drawLine 1.1s cubic-bezier(.4,0,.2,1) .1s forwards"></polyline>'
      +'</svg>';
  }
  return '<div class="hero-saldo" onclick="markLastUpdate()" role="button" tabindex="0">'
    +'<div class="hero-saldo-top">'
    +'<span class="hero-saldo-label">Saldo de '+MONTHS[curMonth]+'</span>'
    +'<span style="display:inline-flex;align-items:center;gap:8px">'
    +badgeHtml
    +'<button id="hide-values-icon" class="hide-values-btn-el" onclick="toggleHideValues(event)" title="Ocultar valores"></button>'
    +'</span></div>'
    +'<div class="hero-saldo-value '+(isPos?'green':'red')+'">'+digitsHtml+'</div>'
    +sparkHtml
    +'<div class="hero-saldo-footer">🕐 toque para marcar como atualizado</div>'
    +'</div>';
}

async function renderDash(){

  try{
    loadLastUpdate();
    updateMonthLabels();
    const all=await dbAll();
    const pessoas=await pessoasAll();
    const pessoaMap=Object.fromEntries(pessoas.map(p=>[p.id,p]));
    // Apply pessoa filter to ALL calculations if active
    const{rows:allRows}=calcMonth(all,curYear,curMonth);
    const filteredRows=pessoaFilter?allRows.filter(t=>t.pessoaId===pessoaFilter):allRows;
    const income=filteredRows.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
    const expense=filteredRows.filter(t=>t.type!=='income'&&t.type!=='credit').reduce((s,t)=>s+t.value,0);
    const credit=filteredRows.filter(t=>t.type==='credit').reduce((s,t)=>s+t.value,0);
    const balance=income-expense-credit;
    const rows=filteredRows;
    const fixed=rows.filter(t=>t.type==='fixed').reduce((s,t)=>s+t.value,0);
    const variable=rows.filter(t=>t.type==='variable').reduce((s,t)=>s+t.value,0);
    const totalOut=expense+credit;
    const pct=income>0?Math.min(100,Math.round(totalOut/income*100)):0;
    const barColor=pct<60?'var(--green)':pct<85?'var(--amber)':'var(--red)';

    // Hero de saldo — badge de variação vs mês anterior
    const prevM=curMonth-1<0?11:curMonth-1, prevY=curMonth-1<0?curYear-1:curYear;
    const{rows:prevAllRows}=calcMonth(all,prevY,prevM);
    const prevRows=pessoaFilter?prevAllRows.filter(t=>t.pessoaId===pessoaFilter):prevAllRows;
    const prevIncome=prevRows.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
    const prevExpense=prevRows.filter(t=>t.type!=='income'&&t.type!=='credit').reduce((s,t)=>s+t.value,0);
    const prevCredit=prevRows.filter(t=>t.type==='credit').reduce((s,t)=>s+t.value,0);
    const prevBalance=prevIncome-prevExpense-prevCredit;
    const hasPrevData=prevRows.length>0;
    const balDelta=hasPrevData?(prevBalance===0?(balance===0?0:100):Math.round((balance-prevBalance)/Math.abs(prevBalance)*100)):0;

    // Sparkline — saldo acumulado dia a dia dentro do mês corrente (últimos até 7 pontos com movimento)
    const daysInCurMonth=new Date(curYear,curMonth+1,0).getDate();
    let _accDay=0;
    const dailyBal=[];
    for(let d=1;d<=daysInCurMonth;d++){
      const dayTxs=rows.filter(t=>{const raw=t.date||t.paidDate;const dnum=raw?parseInt(raw.split('-')[2]):1;return dnum===d;});
      const dIn=dayTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
      const dOut=dayTxs.filter(t=>t.type!=='income').reduce((s,t)=>s+t.value,0);
      _accDay+=(dIn-dOut);
      dailyBal.push(_accDay);
    }
    document.getElementById('hero-saldo-card').innerHTML=renderHeroSaldoCard(balance,balDelta,hasPrevData,dailyBal);
    if(typeof updateHideValuesIcon==='function')updateHideValuesIcon();

    // saudação (header)
    const greetEl=document.getElementById('dash-greeting');
    if(greetEl){
      const hr=new Date().getHours();
      greetEl.textContent=hr<12?'Bom dia':hr<18?'Boa tarde':'Boa noite';
    }

    // entradas/saídas — barra dupla (fiel ao protótipo: pct = out/income, cor por faixa)
    const out=totalOut;
    document.getElementById('dash-income-val').textContent=fmt(income);
    document.getElementById('dash-out-val').textContent=fmt(out);
    document.getElementById('dash-inout-bar-fill').style.width=pct+'%';
    document.getElementById('dash-inout-pct').textContent=pct+'%';
    document.getElementById('dash-inout-pct').style.color=barColor;
    document.getElementById('dash-inout-label').textContent=pct<60?'saudável':pct<85?'atenção':'alto';

    // composição — donut (conic-gradient), fórmula idêntica ao protótipo
    const denom=out||1;
    const fp=Math.round(fixed/denom*100), vp=Math.round(variable/denom*100), cp=Math.max(0,100-fp-vp);
    const donutGradient='conic-gradient(var(--blue) 0% '+fp+'%,var(--amber) '+fp+'% '+(fp+vp)+'%,var(--purple) '+(fp+vp)+'% 100%)';
    document.getElementById('dash-donut').style.background=donutGradient;
    document.getElementById('dash-donut-total').textContent=fmtN(out);
    document.getElementById('dash-donut-legend').innerHTML=
      '<div class="dash-donut-legend-row"><span class="dash-inout-dot" style="background:var(--blue)"></span><span>Fixas</span><span>'+fp+'%</span></div>'
      +'<div class="dash-donut-legend-row"><span class="dash-inout-dot" style="background:var(--amber)"></span><span>Variáveis</span><span>'+vp+'%</span></div>'
      +'<div class="dash-donut-legend-row"><span class="dash-inout-dot" style="background:var(--purple)"></span><span>Cartão</span><span>'+cp+'%</span></div>';

    // pessoa summary card — com barra de progresso (teto fixo de normalização, igual ao protótipo)
    const pessoaSummaryEl=document.getElementById('pessoa-summary');
    const pessoaSummaryCard=document.getElementById('pessoa-summary-card');
    if(pessoaSummaryEl&&pessoas.length>1){
      const PESSOA_BAR_MAX=11200;
      const summaryHtml=pessoas.map(p=>{
        const pRows=allRows.filter(t=>t.pessoaId===p.id);
        const pInc=pRows.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
        const pExp=pRows.filter(t=>t.type!=='income'&&t.type!=='credit').reduce((s,t)=>s+t.value,0);
        const pCred=pRows.filter(t=>t.type==='credit').reduce((s,t)=>s+t.value,0);
        const pBal=pInc-pExp-pCred;
        const barW=Math.min(100,Math.abs(pBal)/PESSOA_BAR_MAX*100)+'%';
        return'<div class="dash-pessoa-row">'
          +'<div class="dash-pessoa-top">'
          +'<div class="dash-pessoa-avatar" style="background:'+p.color+'">'+p.nome.charAt(0).toUpperCase()+'</div>'
          +'<span style="flex:1;font-size:13px;font-weight:500">'+p.nome+'</span>'
          +'<span style="font-family:var(--mono);font-size:13px;font-weight:600;color:'+(pBal>=0?'var(--green)':'var(--red)')+'">'+(pBal>=0?'+':'-')+fmt(Math.abs(pBal))+'</span>'
          +'</div>'
          +'<div class="dash-pessoa-bar"><div style="width:'+barW+';background:'+p.color+'"></div></div>'
          +'</div>';
      }).join('');
      pessoaSummaryEl.innerHTML=summaryHtml;
      if(pessoaSummaryCard)pessoaSummaryCard.style.display='block';
    }else{
      if(pessoaSummaryCard)pessoaSummaryCard.style.display='none';
    }

    // histórico 6 meses — barras CSS puro (fiel ao protótipo, sem Chart.js)
    renderDashHistChart(all);

    if(typeof renderPlanningDash==='function')renderPlanningDash();
  }catch(e){
    console.error('[renderDash]',e);
    toast('Erro ao carregar dashboard','var(--red)');
  }
}

function renderDashHistChart(all){
  const el=document.getElementById('dash-hist-chart');
  if(!el)return;
  const MABBR=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const hist=[];
  for(let i=5;i>=0;i--){
    let hm=curMonth-i, hy=curYear;
    while(hm<0){hm+=12;hy--;}
    const mr=pessoaFilter?all.filter(t=>t.year===hy&&t.month===hm&&t.pessoaId===pessoaFilter):all.filter(t=>t.year===hy&&t.month===hm);
    const inc=mr.filter(t=>t.type==='income').reduce((s,t)=>s+t.value,0);
    const o=mr.filter(t=>t.type!=='income').reduce((s,t)=>s+t.value,0);
    hist.push({label:MABBR[hm]+((hm===0||i===5)?'/'+String(hy).slice(2):''),income:inc,out:o});
  }
  const histMax=Math.max.apply(null,hist.map(h=>Math.max(h.income,h.out)).concat([1]));
  el.innerHTML=hist.map(h=>{
    const incH=Math.max(3,h.income/histMax*100).toFixed(0)+'%';
    const outH=Math.max(3,h.out/histMax*100).toFixed(0)+'%';
    return'<div class="dash-hist-col">'
      +'<div class="dash-hist-bars">'
      +'<div class="dash-hist-bar" style="height:'+incH+';background:var(--green)"></div>'
      +'<div class="dash-hist-bar" style="height:'+outH+';background:var(--red);animation-delay:.05s"></div>'
      +'</div>'
      +'<span class="dash-hist-label">'+h.label+'</span>'
      +'</div>';
  }).join('');
}

function filterTx(f,btn){
  txFilter=f;
  document.querySelectorAll('#tx-tabs .tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');renderTx();
}
async function renderTx(){

  try{
    updateMonthLabels();
    const all=await dbAll();
    const pessoas=await pessoasAll();
    const pessoaMap=Object.fromEntries(pessoas.map(p=>[p.id,p]));
    let rows=all.filter(t=>t.year===curYear&&t.month===curMonth);
    if(pessoaFilter)rows=rows.filter(t=>t.pessoaId===pessoaFilter);
    rows=rows.map(t=>{
      const base={...t,_pessoa:t.pessoaId?pessoaMap[t.pessoaId]:null};
      if(t.subRepeatStart&&t.subitems&&t.subitems.length){
        const activeSubs=getActiveSubitems(t.subitems,t.subRepeatStart.month,t.subRepeatStart.year,t.month,t.year);
        return {...base,subitems:activeSubs,value:activeSubs.length?activeSubs.reduce((s,x)=>s+x.value,0):t.value};
      }
      return base;
    });
    let filtered=txFilter==='all'?rows:rows.filter(t=>t.type===txFilter);
    // Busca (Fase 2, seção 2) — cumulativa (AND) com o filtro de tipo já aplicado acima.
    if(txSearch.trim()){
      const q=txSearch.trim().toLowerCase();
      const qNum=parseFloat(q.replace(',','.'));
      filtered=filtered.filter(t=>t.name.toLowerCase().includes(q)||(t.obs||'').toLowerCase().includes(q)||(!isNaN(qNum)&&Math.abs(t.value-qNum)<0.005));
    }
    const sorted=[...filtered].sort((a,b)=>(b.date||'')>(a.date||'')?1:(b.date||'')<(a.date||'')?-1:b.id-a.id);
    _txListCache=sorted;
    document.getElementById('tx-list').innerHTML=sorted.length
      ?sorted.map(txCard).join('')
      :(typeof emptyStateTxHtml==='function'?emptyStateTxHtml():`<div class="empty"><div class="empty-icon">🗂️</div>Nenhum lançamento em ${MONTHS[curMonth]}.</div>`);
    const searchClearBtn=document.getElementById('tx-search-clear');
    if(searchClearBtn)searchClearBtn.style.display=txSearch.trim()?'inline-flex':'none';

    // barra de contagem + saldo do período filtrado (fiel ao protótipo)
    const countLabelEl=document.getElementById('tx-count-label');
    const countBalanceEl=document.getElementById('tx-count-balance');
    if(countLabelEl&&countBalanceEl){
      const txBalance=filtered.reduce((s,t)=>s+(t.type==='income'?t.value:-t.value),0);
      countLabelEl.textContent=filtered.length+(filtered.length===1?' lançamento':' lançamentos');
      countBalanceEl.textContent=(txBalance>=0?'+':'-')+fmt(Math.abs(txBalance));
      countBalanceEl.style.color=txBalance>=0?'var(--green)':'var(--red)';
    }

    renderTxViewToggle();
    renderTxCalendarOrList();

  }catch(e){
    console.error('[renderTx]',e);
    toast('Erro ao carregar lançamentos','var(--red)');
  }
}

function setTxSearch(val){txSearch=val;renderTx();}
function clearTxSearch(){txSearch='';const inp=document.getElementById('tx-search-input');if(inp)inp.value='';renderTx();}

/* ══════════════════════════════════════════════════════════════════════
   FASE 4 — Calendário mensal em Lançamentos (seção 1 da spec extraída)
   Toggle lista/calendário. Não altera nenhuma função acima — apenas adiciona.
   ══════════════════════════════════════════════════════════════════════ */

let calView='list'; // 'list' | 'cal'
let calSelectedDay=null; // ISO 'YYYY-MM-DD' ou null

function setCalView(v){
  calView=v;
  calSelectedDay=null;
  renderTxViewToggle();
  renderTxCalendarOrList();
}

/* Renderiza o toggle lista/calendário no topo de Lançamentos (idempotente). */
function renderTxViewToggle(){
  const el=document.getElementById('tx-view-toggle');
  if(!el)return;
  const isListView=calView==='list', isCalView=calView==='cal';
  const listViewBg=isListView?'var(--blue)':'transparent', listViewColor=isListView?'#fff':'var(--text3)';
  const calViewBg=isCalView?'var(--blue)':'transparent', calViewColor=isCalView?'#fff':'var(--text3)';
  el.innerHTML=
    '<button onclick="setCalView(\'list\')" class="tx-view-toggle-btn" style="width:25px;height:25px;border:none;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:'+listViewBg+';color:'+listViewColor+';transition:background .15s,color .15s,transform .1s">'+
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'+
    '</button>'+
    '<button onclick="setCalView(\'cal\')" class="tx-view-toggle-btn" style="width:25px;height:25px;border:none;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:'+calViewBg+';color:'+calViewColor+';transition:background .15s,color .15s,transform .1s">'+
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>'+
    '</button>';
}

/* Decide entre renderTx() (lista) e renderTxCalendar() (calendário) conforme calView. */
function renderTxCalendarOrList(){
  const listEl=document.getElementById('tx-list');
  const calEl=document.getElementById('tx-calendar');
  if(!listEl||!calEl)return;
  const countBarEl=document.querySelector('.tx-count-bar');
  const tabsEl=document.getElementById('tx-tabs');
  const isCal=calView==='cal';
  listEl.style.display=isCal?'none':'';
  calEl.style.display=isCal?'block':'none';
  if(countBarEl)countBarEl.style.display=isCal?'none':'';
  if(tabsEl)tabsEl.style.display=isCal?'none':'';
  if(isCal)renderTxCalendar();
}

function selectCalDay(iso){
  calSelectedDay=(calSelectedDay===iso)?null:iso;
  renderTxCalendar();
}

/* Constrói e renderiza a grade de calendário + seção expandida do dia selecionado.
   Fórmula dos pontinhos e cores copiada literalmente da spec extraída (seção 1). */
async function renderTxCalendar(){
  try{
    const calEl=document.getElementById('tx-calendar');
    if(!calEl)return;
    const all=await dbAll();
    let rows=all.filter(t=>t.year===curYear&&t.month===curMonth);
    if(pessoaFilter)rows=rows.filter(t=>t.pessoaId===pessoaFilter);

    const calWeekdays=['D','S','T','Q','Q','S','S'];
    const calDaysInMonth=new Date(curYear,curMonth+1,0).getDate();
    const calFirstWeekday=new Date(curYear,curMonth,1).getDay();
    const calDayInfo={};
    rows.forEach(t=>{
      if(!t.date)return;
      if(!calDayInfo[t.date])calDayInfo[t.date]={in:false,out:false};
      if(t.type==='income')calDayInfo[t.date].in=true;
      else calDayInfo[t.date].out=true;
    });
    const todayC=new Date();todayC.setHours(0,0,0,0);
    const calEmptyMonth=Object.keys(calDayInfo).length===0;

    let cellsHtml='';
    for(let i=0;i<calFirstWeekday;i++){
      cellsHtml+='<div></div>';
    }
    for(let dd=1;dd<=calDaysInMonth;dd++){
      const iso=curYear+'-'+String(curMonth+1).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
      const info=calDayInfo[iso];
      const dDate=new Date(curYear,curMonth,dd);dDate.setHours(0,0,0,0);
      const isToday=dDate.getTime()===todayC.getTime();
      const isSelected=calSelectedDay===iso;
      let cellStyle;
      if(isSelected)cellStyle='background:var(--blue);color:#fff;border:1px solid var(--blue)';
      else if(isToday)cellStyle='background:var(--bg4);color:var(--text);border:1.5px solid var(--blue)';
      else cellStyle='background:var(--bg3);color:var(--text);border:1px solid transparent';
      const dayWeight=(isToday||isSelected)?'700':'500';
      const hasIn=!!(info&&info.in), hasOut=!!(info&&info.out);
      const inDotColor=isSelected?'rgba(255,255,255,.9)':'var(--green)';
      const outDotColor=isSelected?'rgba(255,255,255,.65)':'var(--red)';
      cellsHtml+='<button onclick="selectCalDay(\''+iso+'\')" class="tx-cal-cell" style="height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:10px;cursor:pointer;font-family:var(--font);transition:transform .1s,background .15s;'+cellStyle+'">'+
        '<span style="font-size:12px;font-weight:'+dayWeight+'">'+dd+'</span>'+
        '<div style="display:flex;gap:2px;height:4px">'+
          (hasIn?'<span style="width:4px;height:4px;border-radius:50%;background:'+inDotColor+'"></span>':'')+
          (hasOut?'<span style="width:4px;height:4px;border-radius:50%;background:'+outDotColor+'"></span>':'')+
        '</div>'+
      '</button>';
    }

    let expandedHtml='';
    if(calSelectedDay){
      const calSelectedLabel=fmtDate(calSelectedDay);
      const calDayTxList=rows.filter(t=>t.date===calSelectedDay).map(t=>({
        name:t.name,
        valStr:(t.type==='income'?'+':'−')+fmt(t.value),
        color:t.type==='income'?'var(--green)':'var(--red)',
        id:t.id
      }));
      expandedHtml='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px">'+
        '<div style="font-size:12px;color:var(--text2);margin-bottom:10px;font-weight:600">'+calSelectedLabel+'</div>'+
        '<div style="display:flex;flex-direction:column;gap:8px">'+
        (calDayTxList.length?calDayTxList.map(ct=>
          '<div onclick="showEditModal('+ct.id+')" class="tx-cal-day-item" style="display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px 12px;cursor:pointer;transition:transform .15s">'+
            '<span style="flex:1;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+ct.name+'</span>'+
            '<span style="font-size:13px;font-weight:600;font-family:var(--mono);color:'+ct.color+'">'+ct.valStr+'</span>'+
          '</div>'
        ).join(''):'<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">Sem lançamentos neste dia</div>')+
        '</div>'+
      '</div>';
    }

    let emptyStateHtml='';
    if(calEmptyMonth){
      emptyStateHtml=(typeof emptyStateCalendarioHtml==='function')?emptyStateCalendarioHtml():
        '<div class="empty"><div class="empty-icon">📅</div>Nenhum lançamento com data neste mês</div>';
    }

    calEl.innerHTML=
      '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px">'+
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">'+
          calWeekdays.map(w=>'<div style="text-align:center;font-size:10px;color:var(--text3);font-weight:600">'+w+'</div>').join('')+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">'+cellsHtml+'</div>'+
      '</div>'+
      expandedHtml+
      emptyStateHtml;

  }catch(e){
    console.error('[renderTxCalendar]',e);
    toast('Erro ao carregar calendário','var(--red)');
  }
}