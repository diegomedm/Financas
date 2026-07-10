async function getCartaoFaturaGastos(cartaoId, fatMonth, fatYear){
  const all=await gastosAll();
  const cartoes=await cartoesAll();
  const cartao=cartoes.find(c=>c.id===cartaoId);
  if(!cartao)return[];
  return all.filter(g=>{
    if(g.cartaoId!==cartaoId)return false;
    const fm=getFaturaMonth(g.date,cartao);
    if(!fm)return false;
    if(fm.month===fatMonth&&fm.year===fatYear)return true;
    if(g.subRepeatStart&&g.subitems?.length){
      const activeSubs=getActiveSubitems(g.subitems,g.subRepeatStart.month,g.subRepeatStart.year,fatMonth,fatYear);
      return activeSubs.length>0;
    }
    return false;
  }).map(g=>{
    const res=gastoValueForFatura(g,fatMonth,fatYear);
    if(!res)return null;
    return{...g,value:res.value,subitems:res.subitems};
  }).filter(Boolean);
}

async function getCartaoFaturaTotal(cartaoId, fatMonth, fatYear){
  const gastos=await getCartaoFaturaGastos(cartaoId,fatMonth,fatYear);
  return gastos.reduce((s,g)=>s+g.value,0);
}

// Retorna valor do gasto para a fatura indicada, considerando subRepeatStart
function gastoValueForFatura(gasto, fatMonth, fatYear){
  if(!gasto.subRepeatStart||!gasto.subitems?.length)return{value:gasto.value,subitems:gasto.subitems||[]};
  const srs=gasto.subRepeatStart;
  const activeSubs=getActiveSubitems(gasto.subitems,srs.month,srs.year,fatMonth,fatYear);
  if(!activeSubs.length)return null; // nenhum subitem ativo = gasto some
  return{value:activeSubs.reduce((t,s)=>t+s.value,0),subitems:activeSubs};
}
// Calcula total usado no limite: fatura atual + todas as faturas futuras com gastos
async function calcLimiteUsado(cartao, allGastos){
  const hojeKey=curYear*100+curMonth;
  let total=0;
  const gastosDoCarta=allGastos.filter(g=>g.cartaoId===cartao.id);
  // usar um Set para evitar contar o mesmo gasto+fatura duas vezes
  const seen=new Set();
  for(const g of gastosDoCarta){
    const fm=getFaturaMonth(g.date,cartao);
    if(!fm)continue;
    if(!g.subRepeatStart||!g.subitems?.length){
      // gasto simples: conta so na fatura original
      const key=fm.year*100+fm.month;
      if(key<hojeKey)continue;
      const res=gastoValueForFatura(g,fm.month,fm.year);
      if(res)total+=res.value;
    }else{
      // gasto com subRepeatStart: calcular maxRepeat e iterar sobre faturas futuras
      const srs=g.subRepeatStart;
      const maxRep=g.subitems.reduce((m,s)=>Math.max(m,s.repeat||1),1);
      for(let i=0;i<maxRep;i++){
        const rawM=srs.month+i;
        const fatM=(rawM%12+12)%12;
        const fatY=srs.year+Math.floor(rawM/12);
        const key=fatY*100+fatM;
        if(key<hojeKey)continue;
        const seenKey=g.id+'_'+key;
        if(seen.has(seenKey))continue;
        seen.add(seenKey);
        const res=gastoValueForFatura(g,fatM,fatY);
        if(res)total+=res.value;
      }
    }
  }
  // somar recorrentes do cartao (aparecem em todas as faturas futuras)
  const allRec=await recorrentesAll();
  for(const rec of allRec.filter(r=>r.cartaoId===cartao.id))total+=rec.value;
  return total;
}
// Estado de expansão/colapso dos cards de cartão (Fase 3) — persistido em memória por sessão
var expandedCards=expandedCards||{};
// Estado de "mostrar todos os gastos" por cartão (Fase 3)
var showAllGastosCards=showAllGastosCards||{};

function toggleCardExpand(id){
  expandedCards[id]=!expandedCards[id];
  patchCartaoCard(id);
}

function toggleShowAllGastosCard(id){
  showAllGastosCards[id]=!showAllGastosCards[id];
  patchCartaoTimeline(id);
}

/* Swipe-to-action no item de gasto avulso (mesmo padrão de Lançamentos/Orçamento:
   arrastar pra esquerda revela Editar/Excluir). Cache do último gasto+cartaoId
   renderizado por id — populado dentro de renderCards() — usado por patchGastoCard()
   para reconstruir só o wrapper daquele gasto sem re-renderizar a lista de cartões
   inteira (evitava reanimar entrada de todos os gastos/cartões a cada swipe). */
var _gastoCardCache={};
function patchGastoCard(id){
  const cached=_gastoCardCache[id];
  if(!cached){renderCards();return;}
  const wrap=document.getElementById('gasto'+id+'-wrap');
  if(!wrap){renderCards();return;}
  const html=gastoCardHtml(cached.gasto,cached.cartaoId);
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  const newWrap=tmp.firstElementChild;
  wrap.replaceWith(newWrap);
}
function gastoCardHtml(g,cartaoId){
  _gastoCardCache[g.id]={gasto:g,cartaoId:cartaoId};
  const hasParcela=!!(g.parcela&&g.totalParcelas);
  const parcelaStr=hasParcela?(g.parcela+'/'+g.totalParcelas):'';
  const subs=g._activeSubs||[];
  const subsHtml=subs.length?'<div class="cc-subs">'+subs.map(sb=>'<div class="cc-sub-row"><span>'+sb.name+'</span><span>'+fmt(sb.value)+'</span></div>').join('')+'</div>':'';
  const swKey='gasto'+g.id;
  const isOpen=!!swipeOpen[swKey];
  const isClosing=!!swipeClosing[swKey];
  const isSwipeOpen=isOpen||isClosing;
  const swipeX=isOpen?'-128px':'0px';
  const actionsHtml=isSwipeOpen?
    '<div style="position:absolute;inset:0;display:flex;justify-content:flex-end">'+
    '<div style="width:20px;background:var(--blue);flex-shrink:0"></div>'+
    '<button class="swipe-action-btn" style="background:var(--blue)" onclick="onSwipeEditGasto('+cartaoId+','+g.id+',\''+swKey+'\')">'+
    '<svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'+
    'Editar'+
    '</button>'+
    '<button class="swipe-action-btn" style="background:var(--red)" onclick="deleteGasto('+g.id+')">'+
    '<svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'+
    'Excluir'+
    '</button>'+
    '</div>':'';
  return '<div id="'+swKey+'-wrap" style="position:relative;overflow:hidden;border-radius:10px;margin-bottom:6px">'+
    actionsHtml+
    '<div class="cc-gasto-card" style="margin-bottom:0;transform:translateX('+swipeX+');transition:transform .28s cubic-bezier(.4,0,.2,1),opacity .15s" '+
    'onpointerdown="swipeDown(event)" onpointermove="swipeMove(event)" '+
    'onpointerup="swipeUp(\''+swKey+'\',event,function(){editGasto('+cartaoId+','+g.id+')},function(){patchGastoCard('+g.id+')})">'+
    '<div class="cc-gasto-top">'+
    '<div class="cc-gasto-name-wrap"><span class="cc-gasto-name">'+g.name+'</span>'+
    (hasParcela?'<span class="cc-parcela-badge">'+parcelaStr+'</span>':'')+
    '</div>'+
    '<div class="cc-gasto-val">-'+fmt(g.value)+'</div>'+
    '</div>'+
    subsHtml+
    '</div>'+
    '</div>';
}

function onSwipeEditGasto(cartaoId,gastoId,key){
  closeSwipe(key,function(){patchGastoCard(gastoId);});
  editGasto(cartaoId,gastoId);
}

// Monta o resumo do topo: total de todas as faturas + próximo vencimento (com empates)
function buildResumoTopoCartoesHtml(cartoes, faturaTotals){
  const faturasTotal=Object.values(faturaTotals).reduce((s,v)=>s+v,0);
  const monthName=MONTHS[curMonth];
  // próximo vencimento (mesma lógica do protótipo, seção 1.2 da spec)
  const todayV=new Date();
  let nextVenc=null;
  cartoes.forEach(ct=>{
    let d=new Date(todayV.getFullYear(),todayV.getMonth(),ct.vencimento);
    if(d<todayV)d=new Date(todayV.getFullYear(),todayV.getMonth()+1,ct.vencimento);
    const diff=Math.ceil((d-todayV)/86400000);
    if(!nextVenc||diff<nextVenc.diff)nextVenc={diff,names:[ct.name]};
    else if(diff===nextVenc.diff)nextVenc.names.push(ct.name);
  });
  const nextVencNames=nextVenc?nextVenc.names.join(' + '):'';
  const nextVencLabel=nextVenc?(nextVenc.diff===0?'Vence hoje · '+nextVencNames:nextVenc.diff===1?'Vence amanhã · '+nextVencNames:'Próximo venc. em '+nextVenc.diff+'d · '+nextVencNames):'';
  return '<div class="cartoes-resumo-topo">'+
    '<div class="cartoes-resumo-linha1">'+
    '<span style="font-size:12px;color:var(--text2)">Faturas de '+monthName+'</span>'+
    '<span class="cartoes-resumo-total">'+(faturasTotal===0?'R$ 0,00':'-'+fmt(faturasTotal))+'</span>'+
    '</div>'+
    (nextVenc?'<div class="cartoes-resumo-venc">'+
      '<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:var(--amber);fill:none;stroke-width:2;stroke-linecap:round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'+
      '<span style="font-size:11px;color:var(--text2)">'+nextVencLabel+'</span>'+
      '</div>':'')+
    '</div>';
}

/* Monta o HTML de um cartão inteiro (cabeçalho + corpo + timeline de gastos +
   recorrências + seção "Por Categoria"). Extraído de renderCards() para ser
   reutilizável tanto no render completo quanto no patch cirúrgico de um único
   cartão (toggleCardExpand/toggleShowAllGastosCard) — evita reanimar/recriar os
   outros cartões da lista quando só um muda de estado (expandir ou "ver mais"). */
async function _cartaoCardHtml(cartao,idx,ctx){
  const{pessoaMap,allGastos,allBudgetCats}=ctx;
  const entryDelay=(idx*45)+'ms';
  const fatura={month:curMonth,year:curYear};
  const gastosFaturaRaw=allGastos.filter(g=>{
    if(g.cartaoId!==cartao.id)return false;
    const fm=getFaturaMonth(g.date,cartao);
    if(!fm)return false;
    if(fm.month===fatura.month&&fm.year===fatura.year)return true;
    if(g.subRepeatStart&&g.subitems?.length){
      const activeSubs=getActiveSubitems(g.subitems,g.subRepeatStart.month,g.subRepeatStart.year,fatura.month,fatura.year);
      return activeSubs.length>0;
    }
    return false;
  });
  const gastosFatura=gastosFaturaRaw.map(g=>{
    const res=gastoValueForFatura(g,fatura.month,fatura.year);
    if(!res)return null;
    return{...g,value:res.value,_activeSubs:res.subitems};
  }).filter(Boolean);
  const total=gastosFatura.reduce((s,g)=>s+g.value,0);
  const allRecorrentes2=await recorrentesAll();
  const recDoCartao2=allRecorrentes2.filter(r=>r.cartaoId===cartao.id);
  const totalRec2=recDoCartao2.reduce((s,r)=>s+r.value,0);
  const totalComRec=total+totalRec2;
  const limiteUsado=cartao.limite?await calcLimiteUsado(cartao,allGastos):null;
  const limitePct=cartao.limite?Math.min(100,limiteUsado/cartao.limite*100):0;
  const limiteColor=limitePct>=90?'var(--red)':limitePct>=70?'var(--amber)':'var(--green)';
  const pessoa=cartao.pessoaId?pessoaMap[cartao.pessoaId]:null;
  ctx.faturaTotalsPorCartao[cartao.id]=totalComRec;

  const isExpanded=!!expandedCards[cartao.id];
  const disponivel=cartao.limite?cartao.limite-limiteUsado:null;
  const headerGrad='linear-gradient(135deg,'+cartao.color+'e8 0%,'+cartao.color+'80 60%,'+cartao.color+'50 100%)';
  const chevronTransform=isExpanded?'rotate(180deg)':'rotate(0deg)';

  const headerHtml='<div class="cc-header" style="background:'+headerGrad+'" onclick="toggleCardExpand('+cartao.id+')">'+
    '<div class="cc-header-top">'+
    (pessoa?'<span class="cc-pessoa-chip">'+personAvatarHtml(pessoa,15,8)+pessoa.nome+'</span>':'')+
    '<svg viewBox="0 0 24 24" class="cc-chevron" style="transform:'+chevronTransform+'"><polyline points="6 9 12 15 18 9"/></svg>'+
    '</div>'+
    '<div class="cc-chip"><div class="cc-chip-detail"></div></div>'+
    '<div class="cc-name">'+cartao.name+'</div>'+
    '<div class="cc-dates">Fecha dia '+cartao.fechamento+' · Vence dia '+cartao.vencimento+'</div>'+
    '<div class="cc-fatura-row">'+
    '<div><div class="cc-fatura-label">Fatura '+MONTHS[fatura.month].substring(0,3)+'/'+fatura.year+'</div>'+
    '<div class="cc-fatura-val">'+(totalComRec===0?'R$ 0,00':'-'+fmt(totalComRec))+'</div></div>'+
    (cartao.limite?'<div style="text-align:right"><div class="cc-fatura-label">Disponível</div>'+
      '<div class="cc-disp-val">'+(disponivel<0?'-':'')+fmt(Math.abs(disponivel))+'</div></div>':'')+
    '</div>'+
    '</div>';

  const limiteBarHtml=cartao.limite?
    '<div style="height:100%;border-radius:3px;background:'+limiteColor+';transition:width .5s cubic-bezier(.4,0,.2,1),background .3s;width:'+limitePct+'%"></div>':'';
  const usadoStr=cartao.limite?'Usado: '+fmt(limiteUsado)+' / '+fmt(cartao.limite):'';
  const corpoTopoHtml=cartao.limite?
    '<div class="limite-bar-track" style="margin-bottom:5px">'+limiteBarHtml+'</div>'+
    '<div class="row-between">'+
    '<span style="font-size:11px;color:var(--text3)">'+usadoStr+'</span>'+
    (!isExpanded?'<span style="font-size:11px;color:var(--text3)">'+gastosFatura.length+' gasto(s)</span>':'')+
    '</div>'+
    (limitePct>=90?'<div style="font-size:11px;color:var(--red);margin-top:3px">⚠️ Próximo do limite</div>':'')
    :(!isExpanded?'<div class="row-between"><span style="font-size:11px;color:var(--text3)">'+gastosFatura.length+' gasto(s)</span></div>':'');

  let timelineHtml='';
  if(isExpanded){
    timelineHtml=_cartaoTimelineHtml(cartao,gastosFatura);
  }

  return `<div id="cartao${cartao.id}-wrap" class="cc-card" style="animation:listItemIn .34s cubic-bezier(.16,1,.3,1) both;animation-delay:${entryDelay}">
    ${headerHtml}
    <div class="cc-body">
    ${corpoTopoHtml}
    ${isExpanded?'<div class="cc-body-expanded">'+
      timelineHtml+
      '<div class="cc-footer-row">'+
      '<button class="cc-edit-btn" onclick="editCartao('+cartao.id+')">Editar cartão</button>'+
      '<button class="cc-addgasto-btn" onclick="showAddGastoModal('+cartao.id+','+JSON.stringify(cartao).replace(/"/g,'&quot;')+')">+ Gasto</button>'+
      '</div>'+
      (recDoCartao2.length?'<div class="cc-subs" style="margin-top:14px;padding-top:12px">'+
        '<div class="cc-recs-header">'+
        '<span class="cc-recs-title">🔄 Recorrências mensais</span>'+
        '<span class="cc-recs-total">−'+fmt(recDoCartao2.reduce(function(s,r){return s+r.value;},0))+'</span>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;gap:6px">'+
        recDoCartao2.map(function(r){
          const meta=r.obs||'Mensal';
          const recSubs=r.subitems&&r.subitems.length?r.subitems:[];
          const recSubsHtml=recSubs.length?'<div class="cc-subs">'+recSubs.map(function(sb){return'<div class="cc-sub-row"><span>'+sb.name+'</span><span>'+fmt(sb.value)+'</span></div>';}).join('')+'</div>':'';
          return '<div class="cc-rec-row" onclick="editRecorrente('+r.id+')">'
            +'<div class="cc-rec-top">'
            +'<div style="flex:1"><div class="cc-rec-name">'+r.name+'</div><div class="cc-rec-meta">'+meta+'</div></div>'
            +'<div class="cc-rec-val">-'+fmt(r.value)+'</div>'
            +'</div>'
            +recSubsHtml
            +'</div>';
        }).join('')+
        '</div></div>':'')+
      '<button class="cc-addrec-btn" onclick="showAddRecorrenteModal('+cartao.id+')">+ Recorrência mensal</button>'+
      '</div>':''}
    ${(()=>{
      // Seção "Por Categoria" — lê de budgetAll() filtrado por categoriaKey (Sprint 5)
      if(!allBudgetCats.length)return'';
      var catTotals={};
      for(var gci=0;gci<gastosFatura.length;gci++){
        var gcat=gastosFatura[gci];
        if(!gcat.categoriaId)continue;
        var budItem=allBudgetCats.find(function(b){return b.id===gcat.categoriaId;});
        if(!budItem)continue; // orphan — ignorar silenciosamente
        catTotals[gcat.categoriaId]=(catTotals[gcat.categoriaId]||0)+gcat.value;
      }
      var catIds=Object.keys(catTotals);
      if(!catIds.length)return'';
      var secHtml='<div style="margin-top:12px">'+
        '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">Por Categoria</div>';
      for(var ki=0;ki<catIds.length;ki++){
        var cid=parseInt(catIds[ki]);
        var budgetItem=allBudgetCats.find(function(b){return b.id===cid;});
        if(!budgetItem)continue;
        var realizado=catTotals[cid];
        var orcado=budgetItem.value;
        var pct=orcado>0?realizado/orcado*100:0;
        var barColor=pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--green)';
        var barWidth=Math.min(100,pct);
        secHtml+='<div style="margin-bottom:10px">'+
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">'+
          '<span style="font-size:12px;font-weight:500;color:var(--text)">'+budgetItem.name+'</span>'+
          '<span style="font-size:11px;color:'+barColor+';font-family:var(--mono)">'+fmt(realizado)+' / '+fmt(orcado)+'</span>'+
          '</div>'+
          '<div style="height:4px;background:var(--bg4);border-radius:2px;overflow:hidden">'+
          '<div style="height:100%;border-radius:2px;background:'+barColor+';width:'+barWidth+'%"></div>'+
          '</div>'+
          '</div>';
      }
      secHtml+='</div>';
      return secHtml;
    })()}
    </div>
  </div>`;
}

/* Timeline por dia dos gastos avulsos — extraída à parte porque é reconstruída
   isoladamente por toggleShowAllGastosCard() (patch cirúrgico do "Ver mais"),
   sem precisar recriar o card do cartão inteiro (header, barra de limite etc). */
function _cartaoTimelineGroups(cartao,gastosFatura){
  const avulsos=gastosFatura;
  const sortedAv=[...avulsos].sort((a,b)=>(b.date||'')>(a.date||'')?1:(b.date||'')<(a.date||'')?-1:b.id-a.id);
  const showAll=!!showAllGastosCards[cartao.id];
  const LIMIT=5;
  const visible=showAll?sortedAv:sortedAv.slice(0,LIMIT);
  const hiddenCount=sortedAv.length-visible.length;
  const groupsMap={};const groupsOrder=[];
  visible.forEach(g=>{const k=g.date||'sem';if(!groupsMap[k]){groupsMap[k]=[];groupsOrder.push(k);}groupsMap[k].push(g);});
  return{groupsMap,groupsOrder,hiddenCount,showAll};
}

function _cartaoDayGroupHtml(k,items,groupDelay,cartaoId){
  const dTot=items.reduce((a,g)=>a+g.value,0);
  const dateLabel=k==='sem'?'Sem data':fmtDate(k).slice(0,5);
  const countStr=items.length+(items.length>1?' gastos':' gasto');
  const itemsHtml=items.map(g=>gastoCardHtml(g,cartaoId)).join('');
  return '<div class="cc-day-group" data-day-key="'+k+'" style="animation:listItemIn .28s cubic-bezier(.16,1,.3,1) both;animation-delay:'+groupDelay+'">'+
    '<div class="cc-day-header"><span class="cc-day-date">'+dateLabel+'</span><span class="cc-day-count">'+countStr+'</span><div class="cc-day-rule"></div><span class="cc-day-tot">-'+fmt(dTot)+'</span></div>'+
    itemsHtml+
    '</div>';
}

function _cartaoTimelineHtml(cartao,gastosFatura){
  const{groupsMap,groupsOrder,hiddenCount,showAll}=_cartaoTimelineGroups(cartao,gastosFatura);
  const dayGroupsHtml=groupsOrder.map((k,gi2)=>_cartaoDayGroupHtml(k,groupsMap[k],(gi2*40)+'ms',cartao.id)).join('');
  const hasHidden=hiddenCount>0;
  const showAllLabel=showAll?'Mostrar menos':'Ver mais '+hiddenCount+' gasto'+(hiddenCount>1?'s':'');
  return dayGroupsHtml+
    (hasHidden?'<button class="cc-vermais-btn" onclick="toggleShowAllGastosCard('+cartao.id+')">'+showAllLabel+'</button>':'');
}

/* Cache do contexto (allGastos/pessoaMap/allBudgetCats/lista de cartões) do último
   renderCards() — usado pelos patches cirúrgicos de toggleCardExpand/
   toggleShowAllGastosCard para reconstruir só o cartão afetado, sem re-render
   completo da lista (que reanimava todos os cartões a cada expandir/colapsar). */
var _cardsRenderCtx=null;

async function renderCards(){

  try{
    let cartoes=await cartoesAll();
    if(pessoaFilter)cartoes=cartoes.filter(c=>c.pessoaId===pessoaFilter);
    const pessoas=await pessoasAll();
    const pessoaMap=Object.fromEntries(pessoas.map(p=>[p.id,p]));
    const allGastos=await gastosAll();
    const el=document.getElementById('cards-list');
    if(!el)return;
    // Seção de categorias orçadas removida (Sprint 5) — ocultar o container
    const catsSection=document.getElementById('categorias-cartao-section');
    if(catsSection){catsSection.innerHTML='';catsSection.style.display='none';}
    // Carregar itens de budget com categoriaKey para a seção "Por Categoria"
    var allBudgetCats=[];
    try{
      var allBuds=await budgetAll();
      allBudgetCats=allBuds.filter(function(b){return b.categoriaKey;});
    }catch(e){}
    if(!cartoes.length){
      el.innerHTML=typeof emptyStateCartoesHtml==='function'
        ?emptyStateCartoesHtml()
        :'<div class="empty"><div class="empty-icon">💳</div>Nenhum cartão cadastrado.<br>Toque em <strong>+ Cartão</strong> para começar.</div>';
      _cardsRenderCtx=null;
      return;
    }
    // Regra "primeiro aberto": se nenhum estado de expansão foi definido ainda para
    // nenhum cartão desta lista, expande o primeiro cartão por padrão (UX: evita tela
    // vazia na primeira visita, sem hardcode de id como no protótipo).
    const nenhumEstadoDefinido=cartoes.every(c=>expandedCards[c.id]===undefined);
    if(nenhumEstadoDefinido&&cartoes.length)expandedCards[cartoes[0].id]=true;
    const ctx={pessoaMap,allGastos,allBudgetCats,cartoes,faturaTotalsPorCartao:{}};
    let html='';
    let _ccIdx=0;
    for(const cartao of cartoes){
      html+=await _cartaoCardHtml(cartao,_ccIdx,ctx);
      _ccIdx++;
    }
    _cardsRenderCtx=ctx;
    el.innerHTML=buildResumoTopoCartoesHtml(cartoes,ctx.faturaTotalsPorCartao)+html
      +'<button class="btn-novo-cartao" onclick="showAddCartaoModal()">+ Novo cartão</button>';

  }catch(e){
    console.error('[renderCards]',e);
    toast('Erro ao carregar cartões','var(--red)');
  }
}

/* Patch cirúrgico: reconstrói só o card do cartão afetado (usado por toggleCardExpand),
   sem tocar nos outros — evita reanimar toda a lista de cartões ao expandir/colapsar um. */
async function patchCartaoCard(cartaoId){
  if(!_cardsRenderCtx){renderCards();return;}
  const wrap=document.getElementById('cartao'+cartaoId+'-wrap');
  if(!wrap){renderCards();return;}
  const idx=_cardsRenderCtx.cartoes.findIndex(c=>c.id===cartaoId);
  const cartao=idx>=0?_cardsRenderCtx.cartoes[idx]:null;
  if(!cartao){renderCards();return;}
  const html=await _cartaoCardHtml(cartao,idx,_cardsRenderCtx);
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  const newWrap=tmp.firstElementChild;
  newWrap.style.animation='none';
  wrap.replaceWith(newWrap);
}

/* Patch cirúrgico: reconstrói só a timeline de gastos dentro do corpo expandido do
   cartão (usado por toggleShowAllGastosCard / "Ver mais gastos"), sem recriar o
   cartão inteiro (header, barra de limite, recorrências) nem os outros cartões. */
async function patchCartaoTimeline(cartaoId){
  if(!_cardsRenderCtx){renderCards();return;}
  const wrap=document.getElementById('cartao'+cartaoId+'-wrap');
  const bodyExpanded=wrap?wrap.querySelector('.cc-body-expanded'):null;
  if(!wrap||!bodyExpanded){renderCards();return;}
  const cartao=_cardsRenderCtx.cartoes.find(c=>c.id===cartaoId);
  if(!cartao){renderCards();return;}
  const allGastos=_cardsRenderCtx.allGastos;
  const fatura={month:curMonth,year:curYear};
  const gastosFaturaRaw=allGastos.filter(g=>{
    if(g.cartaoId!==cartao.id)return false;
    const fm=getFaturaMonth(g.date,cartao);
    if(!fm)return false;
    if(fm.month===fatura.month&&fm.year===fatura.year)return true;
    if(g.subRepeatStart&&g.subitems?.length){
      const activeSubs=getActiveSubitems(g.subitems,g.subRepeatStart.month,g.subRepeatStart.year,fatura.month,fatura.year);
      return activeSubs.length>0;
    }
    return false;
  });
  const gastosFatura=gastosFaturaRaw.map(g=>{
    const res=gastoValueForFatura(g,fatura.month,fatura.year);
    if(!res)return null;
    return{...g,value:res.value,_activeSubs:res.subitems};
  }).filter(Boolean);
  // Reconciliação: reaproveita os nós .cc-day-group já existentes no DOM (por
  // data-day-key) em vez de recriar a timeline inteira — só os grupos/dias que
  // acabaram de ficar visíveis ("ver mais") ganham animation:listItemIn; os que já
  // estavam na tela mantêm o nó original, sem replay de animação.
  const{groupsMap,groupsOrder,hiddenCount,showAll}=_cartaoTimelineGroups(cartao,gastosFatura);
  const footer=bodyExpanded.querySelector('.cc-footer-row');
  const existingGroups={};
  bodyExpanded.querySelectorAll('.cc-day-group').forEach(function(node){
    existingGroups[node.dataset.dayKey]=node;
  });
  let insertBefore=bodyExpanded.querySelector('.cc-day-group')||bodyExpanded.querySelector('.cc-vermais-btn')||footer;
  groupsOrder.forEach(function(k,gi2){
    const items=groupsMap[k];
    const existing=existingGroups[k];
    if(existing){
      // grupo já existia: substitui só o conteúdo interno (pode ter ganhado item
      // novo dentro do dia), sem tocar animation nem recriar o nó do grupo em si.
      const freshHtml=_cartaoDayGroupHtml(k,items,'0ms',cartao.id);
      const tmpG=document.createElement('div');
      tmpG.innerHTML=freshHtml;
      const freshNode=tmpG.firstElementChild;
      freshNode.style.animation='none';
      existing.replaceWith(freshNode);
      insertBefore=freshNode.nextSibling;
      delete existingGroups[k];
    }else{
      // grupo novo (revelado agora pelo "ver mais"): entra com a animação normal.
      const html=_cartaoDayGroupHtml(k,items,(gi2*40)+'ms',cartao.id);
      const tmpG=document.createElement('div');
      tmpG.innerHTML=html;
      const node=tmpG.firstElementChild;
      bodyExpanded.insertBefore(node,insertBefore);
      insertBefore=node.nextSibling;
    }
  });
  // Remove grupos que sumiram (ex: "mostrar menos" reduzindo a lista de volta).
  Object.keys(existingGroups).forEach(function(k){existingGroups[k].remove();});
  // Botão "Ver mais/Mostrar menos": atualiza label/presença sem reanimar o resto.
  let vermaisBtn=bodyExpanded.querySelector('.cc-vermais-btn');
  const hasHidden=hiddenCount>0;
  if(hasHidden){
    const label=showAll?'Mostrar menos':'Ver mais '+hiddenCount+' gasto'+(hiddenCount>1?'s':'');
    if(vermaisBtn){vermaisBtn.textContent=label;}
    else{
      const tmpB=document.createElement('div');
      tmpB.innerHTML='<button class="cc-vermais-btn" onclick="toggleShowAllGastosCard('+cartao.id+')">'+label+'</button>';
      bodyExpanded.insertBefore(tmpB.firstElementChild,footer);
    }
  }else if(vermaisBtn){
    vermaisBtn.remove();
  }
}

async function refreshBudgetCartoes(){
  // Called whenever gastos change - updates budget virtual items
  // Budget page re-renders if active
  const p=document.querySelector('.page.active');
  if(p&&p.id==='page-budget')renderBudget();
}

async function getCartaoBudgetItems(targetMonth, targetYear){
  const tm = (targetMonth !== undefined) ? targetMonth : curMonth;
  const ty = (targetYear !== undefined) ? targetYear : curYear;
  const cartoes = await cartoesAll();
  const allGastos = await gastosAll();
  const pessoas = await pessoasAll();
  const pessoaMap = Object.fromEntries(pessoas.map(p=>[p.id,p]));
  const result = [];
  for(const cartao of cartoes){
    // Get gastos whose fatura period is tm/ty (inclui subRepeatStart ativos)
    const gastosFatura = allGastos.filter(g=>{
      if(g.cartaoId !== cartao.id) return false;
      const fm = getFaturaMonth(g.date, cartao);
      if(!fm) return false;
      if(fm.month === tm && fm.year === ty) return true;
      // gasto com subRepeatStart: incluir se tem subitems ativos neste mes
      if(g.subRepeatStart && g.subitems?.length){
        const activeSubs=getActiveSubitems(g.subitems,g.subRepeatStart.month,g.subRepeatStart.year,tm,ty);
        return activeSubs.length>0;
      }
      return false;
    });
    // aplicar subRepeatStart nos gastos da fatura
    const gastosAtivos=gastosFatura.map(g=>{
      const res=gastoValueForFatura(g,tm,ty);
      if(!res)return null;
      return{...g,value:res.value};
    }).filter(Boolean);
    const allRecorrentes=await recorrentesAll();
    const recDoCartao=allRecorrentes.filter(r=>r.cartaoId===cartao.id);
    const totalGastos=gastosAtivos.reduce((s,g)=>s+g.value,0);
    const totalRec=recDoCartao.reduce((s,r)=>s+r.value,0);
    const total=totalGastos+totalRec;
    const vencDate = getFaturaVencimento(ty, tm, cartao);
    const obsLines = [...gastosAtivos,...recDoCartao].map(g=>g.name+(g.value?' ('+fmt(g.value)+')':'')).join(', ');
    const pessoa = cartao.pessoaId ? pessoaMap[cartao.pessoaId] : null;
    result.push({
      _isCartao: true,
      _cartaoId: cartao.id,
      _cartao: cartao,
      _gastos: [...gastosAtivos,...recDoCartao.map(r=>({...r,_isRecorrente:true}))],
      _pessoa: pessoa,
      id: 'cartao_'+cartao.id,
      name: cartao.name,
      value: total,
      type: 'credit',
      dueDay: cartao.vencimento,
      dueDate: vencDate,
      obs: obsLines,
      pessoaId: cartao.pessoaId,
      faturaMonth: tm,
      faturaYear: ty,
    });
  }

  return result.filter(r=>r.value>0);
}
