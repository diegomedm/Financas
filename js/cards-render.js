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
async function renderCards(){

  try{
    const cartoes=await cartoesAll();
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
      el.innerHTML='<div class="empty"><div class="empty-icon">💳</div>Nenhum cartão cadastrado.<br>Toque em <strong>+ Cartão</strong> para começar.</div>';
      return;
    }
    let html='';
    for(const cartao of cartoes){
      // Show fatura for the selected period
      const fatura={month:curMonth,year:curYear};
      const gastosFaturaRaw=allGastos.filter(g=>{
        if(g.cartaoId!==cartao.id)return false;
        const fm=getFaturaMonth(g.date,cartao);
        if(!fm)return false;
        // gasto da fatura exata
        if(fm.month===fatura.month&&fm.year===fatura.year)return true;
        // gasto com subRepeatStart: aparece em faturas futuras se ainda tem subitems ativos
        if(g.subRepeatStart&&g.subitems?.length){
          const activeSubs=getActiveSubitems(g.subitems,g.subRepeatStart.month,g.subRepeatStart.year,fatura.month,fatura.year);
          return activeSubs.length>0;
        }
        return false;
      });
      // aplicar subRepeatStart: calcular valor/subitems ativos para esta fatura
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
      html+=`<div class="card-item">
        <div class="card-header">
          <div class="card-logo" style="background:${cartao.color}">${cartao.name.substring(0,3).toUpperCase()}</div>
          <div style="flex:1">
            <div class="card-name">${cartao.name}</div>
            <div class="card-dates">Fecha dia ${cartao.fechamento} · Vence dia ${cartao.vencimento} · Fatura ${MONTHS[fatura.month].substring(0,3)}/${fatura.year}</div>
            ${pessoa?'<div style="margin-top:3px">'+personAvatarHtml(pessoa,14)+' <span style="font-size:11px;color:var(--text3)">'+pessoa.nome+'</span></div>':''}
          </div>
          <div style="display:flex;gap:6px">
            <button class="tx-btn edit" onclick="editCartao(${cartao.id})">✏️</button>
            <button class="tx-btn del" onclick="deleteCartao(${cartao.id})">✕</button>
          </div>
        </div>
        <div class="card-total${totalComRec===0?' zero':''}">${totalComRec===0?'R$ 0,00':'-'+fmt(totalComRec)}</div>
        ${cartao.limite?'<div style="margin-top:6px">'+
          '<div class="row-between-sm">'+
          '<span>Usado: '+fmt(limiteUsado)+' / '+fmt(cartao.limite)+'</span>'+
          '<span style="color:'+limiteColor+';font-weight:600">Disponível: '+(cartao.limite-limiteUsado<0?'-':'')+fmt(Math.abs(cartao.limite-limiteUsado))+'</span>'+
          '</div>'+
          '<div class="limite-bar-track">'+
          '<div style="height:100%;border-radius:3px;background:'+limiteColor+';transition:width .4s;width:'+limitePct+'%"></div>'+
          '</div>'+
          (limitePct>=90?'<div style="font-size:11px;color:var(--red);margin-top:3px">⚠️ Próximo do limite</div>':'')+
          '</div>':''}
        <div class="row-between-mt">
          <div class="row-flex">
            <span style="font-size:12px;color:var(--text3)">${gastosFatura.length} gasto(s)</span>
            ${recDoCartao2.length===0?'<button class="btn btn-ghost btn-sm" onclick="showAddRecorrenteModal('+cartao.id+')">+ Recorrência</button>':''}
          </div>
          <button class="btn btn-primary btn-sm" onclick="showAddGastoModal(${cartao.id},${JSON.stringify(cartao).replace(/"/g,'&quot;')})">+ Gasto</button>
        </div>
        ${recDoCartao2.length?'<div style="margin-top:12px;margin-bottom:6px">'+
          '<div class="row-between-mb">'+
          '<span style="font-size:12px;font-weight:600;color:var(--text2)">🔄 Recorrências</span>'+
          '<button class="btn btn-ghost btn-sm" onclick="showAddRecorrenteModal('+cartao.id+')">+ Nova</button>'+
          '</div>'+
          recDoCartao2.map(r=>{
            const subHtmlR=r.subitems&&r.subitems.length?renderSubitemsHtml(r.subitems):'';
            return '<div class="card-gasto-item card-gasto-col" style="border-left:3px solid var(--teal)">'+
              '<div class="row-flex">'+
              '<div class="card-gasto-info">'+
              '<div class="card-gasto-name">'+r.name+'</div>'+
              (r.obs?'<div class="card-gasto-meta"><span>💬 '+r.obs+'</span></div>':'')+
              '</div>'+
              '<div class="row-gasto-actions">'+
              '<div class="card-gasto-val">-'+fmt(r.value)+'</div>'+
              '<button class="tx-btn edit" onclick="editRecorrente('+r.id+')">✏️</button>'+
              '<button class="tx-btn del" onclick="deleteRecorrente('+r.id+')">✕</button>'+
              '</div></div>'+
              (subHtmlR?'<div class="subitem-sep">'+subHtmlR+'</div>':'')+
              '</div>';
          }).join('')+
          '</div>':''}
        <div class="row-between-mt4">
          <span style="font-size:12px;color:var(--text3)">🛒 Gastos da fatura (${gastosFatura.length})</span>
        </div>
        ${gastosFatura.length?gastosFatura.sort((a,b)=>(b.date||'')>(a.date||'')?-1:1).map(g=>{
          const subHtml=g._activeSubs&&g._activeSubs.length?renderSubitemsHtml(g._activeSubs):'';
          return '<div class="card-gasto-item card-gasto-col">'+
            '<div class="row-flex">'+
            '<div class="card-gasto-info">'+
            '<div class="card-gasto-name">'+g.name+'</div>'+
            '<div class="card-gasto-meta">'+
            (g.date?'<span>📅 '+fmtDate(g.date)+'</span>':'')+
            (g.obs?'<span>💬 '+g.obs+'</span>':'')+
            '</div></div>'+
            '<div class="row-gasto-actions">'+
            '<div class="card-gasto-val">-'+fmt(g.value)+'</div>'+
            '<button class="tx-btn edit" onclick="editGasto('+cartao.id+','+g.id+')">✏️</button>'+
            '<button class="tx-btn del" onclick="deleteGasto('+g.id+')">✕</button>'+
            '</div></div>'+
            (subHtml?'<div class="subitem-sep">'+subHtml+'</div>':'')+
            '</div>';
        }).join(''):''}
        ${(()=>{
          // Seção "Por Categoria" — lê de budgetAll() filtrado por categoriaKey (Sprint 5)
          if(!allBudgetCats.length)return'';
          // Mapear categoriaId -> totalRealizado para gastos deste cartão/mês
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
      </div>`;
    }
    el.innerHTML=html;

  }catch(e){
    console.error('[renderCards]',e);
    toast('Erro ao carregar cartões','var(--red)');
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
