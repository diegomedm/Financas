const PERSON_COLORS=['#5b8eff','#a78bfa','#22c55e','#f97316','#ec4899','#14b8a6'];
const PERSON_LABELS=['Azul','Roxo','Verde','Laranja','Rosa','Teal'];
 // null = todos

function personInitials(nome){
  const parts=nome.trim().split(' ');
  if(parts.length>=2)return(parts[0][0]+parts[parts.length-1][0]).toUpperCase();
  return nome.substring(0,2).toUpperCase();
}
function personAvatarHtml(pessoa,size,fontSize){
  if(!pessoa)return'';
  const sz=size||24;
  const fs=fontSize||Math.round(sz*0.42);
  return`<span class="person-avatar" style="background:${pessoa.color};width:${sz}px;height:${sz}px;font-size:${fs}px">${personInitials(pessoa.nome)}</span>`;
}
async function getPessoaById(id){
  if(!id)return null;
  const all=await pessoasAll();
  return all.find(p=>p.id===id)||null;
}

async function renderPessoasConfig(){

  try{
    const list=document.getElementById('pessoas-list');
    if(!list)return;
    const pessoas=await pessoasAll();
    if(!pessoas.length){list.innerHTML='<div style="font-size:13px;color:var(--text3);padding:8px 0">Nenhuma pessoa cadastrada.</div>';return;}
    list.innerHTML=pessoas.map(p=>`
      <div class="person-row" style="flex-direction:column;align-items:stretch;gap:9px">
        <div style="display:flex;align-items:center;gap:10px">
          ${personAvatarHtml(p,24)}
          <span class="person-row-name" style="flex:1">${p.nome}</span>
          <button class="tx-btn edit" onclick="showEditPessoaModal(${p.id})">✏️</button>
          <button class="tx-btn del" onclick="deletePessoa(${p.id})">✕</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${PERSON_COLORS.map(c=>`<button onclick="setPessoaColorQuick(${p.id},'${c}')" class="person-color-swatch" style="width:20px;height:20px;border-radius:50%;background:${c};border:none;cursor:pointer;padding:0;flex-shrink:0;transition:transform .1s,box-shadow .15s;box-shadow:${p.color===c?`0 0 0 2px var(--bg3),0 0 0 3.5px ${c}`:'none'}"></button>`).join('')}
          <div style="flex:1"></div>
          <label title="Cor personalizada" style="position:relative;width:24px;height:24px;border-radius:50%;background:conic-gradient(#f55,#fa0,#ff5,#5f5,#5ff,#55f,#f5f,#f55);box-shadow:0 0 0 1px var(--border2);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;opacity:.9"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
            <input type="color" value="${p.color}" oninput="setPessoaColorQuick(${p.id},this.value)" style="position:absolute;inset:0;opacity:0;cursor:pointer;border:none;padding:0">
          </label>
        </div>
      </div>`).join('');

  }catch(e){
    console.error('[renderPessoasConfig]',e);
    toast('Erro ao carregar pessoas','var(--red)');
  }
}

function showAddPessoaModal(pessoa=null){
  const isEdit=!!pessoa;
  const defColor=pessoa?.color||PERSON_COLORS[0];
  openModal(`
    <div class="modal-title">${isEdit?'Editar pessoa':'Nova pessoa'}</div>
    <div class="form-group">
      <label>Nome</label>
      <input id="p-nome" placeholder="Ex: Diego, Camila..." value="${isEdit?pessoa.nome:''}" oninput="clearFieldError('p-nome')">
    <div class="field-error-msg" id="p-nome-err"></div>
    </div>
    <div class="form-group">
      <label>Cor</label>
      <div class="color-swatches" id="p-color-swatches" style="display:flex;gap:8px;align-items:center">
        ${PERSON_COLORS.map((c,i)=>`<div class="color-swatch${c===defColor?' selected':''}" style="background:${c}" data-color="${c}" onclick="selectPessoaColor('${c}')"></div>`).join('')}
        <div style="flex:1"></div>
        <label title="Cor personalizada" style="position:relative;width:24px;height:24px;border-radius:50%;background:conic-gradient(#f55,#fa0,#ff5,#5f5,#5ff,#55f,#f5f,#f55);box-shadow:0 0 0 1px var(--border2);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden">
          <svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;opacity:.9"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
          <input type="color" value="${defColor}" oninput="selectPessoaColor(this.value)" style="position:absolute;inset:0;opacity:0;cursor:pointer;border:none;padding:0">
        </label>
      </div>
      <input type="hidden" id="p-color" value="${defColor}">
    </div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn btn-primary" style="flex:1" onclick="${isEdit?`savePessoaEdit(${pessoa.id})`:'savePessoa()'}">Salvar</button>
      <button class="btn btn-ghost" style="flex:1" onclick="closeModal()">Cancelar</button>
    </div>`);
}

async function setPessoaColorQuick(id,color){
  try{
    const all=await pessoasAll();
    const existing=all.find(x=>x.id===id);
    if(!existing)return;
    await pessoasPut({...existing,color});
    renderPessoasConfig();renderPersonFilterBars();renderAll();
  }catch(e){
    console.error('[setPessoaColorQuick]',e);
    toast('Erro ao salvar cor','var(--red)');
  }
}

function selectPessoaColor(c){
  document.querySelectorAll('.color-swatch').forEach(s=>s.classList.toggle('selected',s.dataset.color===c));
  const inp=document.getElementById('p-color');
  if(inp)inp.value=c;
}

async function showEditPessoaModal(id){
  const all=await pessoasAll();
  const p=all.find(x=>x.id===id);
  if(p)showAddPessoaModal(p);
}

async function savePessoa(){

  try{
    const nome=document.getElementById('p-nome')?.value.trim();
    const color=document.getElementById('p-color')?.value||PERSON_COLORS[0];
    if(!nome){setFieldError('p-nome','Informe o nome');return;}
    await pessoasAdd({nome,color,createdAt:Date.now()});
    toast('Pessoa adicionada!','var(--teal)');
    closeModal();renderPessoasConfig();renderPersonFilterBars();

  }catch(e){
    console.error('[savePessoa]',e);
    toast('Erro ao salvar pessoa','var(--red)');
  }
}

async function savePessoaEdit(id){

  try{
    const nome=document.getElementById('p-nome')?.value.trim();
    const color=document.getElementById('p-color')?.value||PERSON_COLORS[0];
    if(!nome){setFieldError('p-nome','Informe o nome');return;}
    const all=await pessoasAll();
    const existing=all.find(x=>x.id===id);
    if(!existing)return;
    await pessoasPut({...existing,nome,color});
    toast('Pessoa atualizada!','var(--teal)');
    closeModal();renderPessoasConfig();renderPersonFilterBars();renderAll();

  }catch(e){
    console.error('[savePessoaEdit]',e);
    toast('Erro ao salvar pessoa','var(--red)');
  }
}

async function deletePessoa(id){

  try{
    if(!confirm('Remover esta pessoa? Os lançamentos associados não serão apagados.'))return;
    await pessoasDel(id);
    if(pessoaFilter===id)pessoaFilter=null;
    toast('Pessoa removida','var(--red)');
    renderPessoasConfig();renderPersonFilterBars();renderAll();

  }catch(e){
    console.error('[deletePessoa]',e);
    toast('Erro ao remover pessoa','var(--red)');
  }
}

// Render pessoa chips inside a form (tx or budget)
async function renderPessoaChips(containerId,selectedId){

  try{
    const el=document.getElementById(containerId);
    if(!el)return;
    const pessoas=await pessoasAll();
    if(!pessoas.length){
      const group=document.getElementById(containerId.replace('-chips','-group'));
      if(group)group.style.display='none';
      return;
    }
    el.innerHTML=pessoas.map(p=>`
      <div class="person-chip${p.id===selectedId?' selected':''}" style="color:${p.color};border-color:${p.id===selectedId?p.color:'transparent'}"
        data-pid="${p.id}" onclick="togglePessoaChip(this,'${containerId}')">
        ${personAvatarHtml(p,18)} ${p.nome}
      </div>`).join('');

  }catch(e){
    console.error('[renderPessoaChips]',e);
    toast('Erro ao carregar pessoas','var(--red)');
  }
}

function togglePessoaChip(el,containerId){
  const already=el.classList.contains('selected');
  document.querySelectorAll('#'+containerId+' .person-chip').forEach(c=>{
    c.classList.remove('selected');
    c.style.borderColor='transparent';
  });
  if(!already){
    el.classList.add('selected');
    el.style.borderColor=el.style.color;
  }
}

function getSelectedPessoa(containerId){
  const sel=document.querySelector('#'+containerId+' .person-chip.selected');
  return sel?parseInt(sel.dataset.pid):null;
}

// Person filter bars
/* Estilo do pill de filtro de pessoa — réplica exata de pessoaPillStyle() do protótipo. */
function _pessoaPillStyle(color,active){
  if(!color)return active
    ?'padding:4px 12px;border-radius:20px;border:1px solid var(--blue);background:var(--blue-bg);color:var(--blue);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap'
    :'padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap';
  return active
    ?'padding:4px 12px;border-radius:20px;border:1.5px solid '+color+';background:'+color+'22;color:'+color+';font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap'
    :'padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;color:'+color+';font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap';
}

async function renderPersonFilterBars(){

  try{
    const pessoas=await pessoasAll();
    const filters=[{label:'Todos',id:null,color:null}].concat(pessoas.map(p=>({label:p.nome,id:p.id,color:p.color})));
    ['dash','tx','cards','budget','proj'].forEach(page=>{
      const el=document.getElementById('person-filter-bar-'+page);
      if(!el)return;
      if(!pessoas.length){el.innerHTML='';return;}
      el.innerHTML=filters.map(function(pf){
        const active=pessoaFilter===pf.id;
        const pid=pf.id===null?'all':pf.id;
        return'<button class="person-filter-btn" data-pid="'+pid+'" onclick="setPessoaFilter('+(pf.id===null?'null':pf.id)+',this)" style="'+_pessoaPillStyle(pf.color,active)+'">'+pf.label+'</button>';
      }).join('');
    });

  }catch(e){
    console.error('[renderPersonFilterBars]',e);
    toast('Erro ao carregar filtros','var(--red)');
  }
}

function setPessoaFilter(id,btn){
  pessoaFilter=id;
  renderPersonFilterBars();
  renderAll();
}