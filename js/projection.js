function setProjPeriods(n,btn){
  projPeriods=n;
  localStorage.setItem('projPeriods',String(n));
  document.querySelectorAll('#proj-tab-3,#proj-tab-6,#proj-tab-12').forEach(function(b){b.classList.remove('active');});
  if(btn)btn.classList.add('active');
  var ci=document.getElementById('proj-custom-input');
  if(ci)ci.value='';
  renderProj();
}

function setProjPeriodsCustom(val){
  var n=parseInt(val);
  if(isNaN(n)||n<1)return;
  if(n>60)n=60;
  projPeriods=n;
  localStorage.setItem('projPeriods',String(n));
  document.querySelectorAll('#proj-tab-3,#proj-tab-6,#proj-tab-12').forEach(function(b){b.classList.remove('active');});
  renderProj();
}

function _syncProjTabActive(){
  var presets=[3,6,12];
  var isPreset=presets.indexOf(projPeriods)!==-1;
  presets.forEach(function(v){
    var el=document.getElementById('proj-tab-'+v);
    if(el)el.classList.toggle('active',v===projPeriods);
  });
  var ci=document.getElementById('proj-custom-input');
  if(ci&&!isPreset)ci.value=projPeriods;
}

/* Determina se um item de budget se aplica ao mes (y, m).
   Replicando a logica de renderBudget() para consistencia. */
function _budgetItemAppliesTo(item,y,m){
  var rec=item.recurrence||'always';
  if(rec==='always'){
    if(item.delayedSkipMonths&&item.delayedSkipMonths.some(function(s){return s.month===m&&s.year===y;}))return false;
    return true;
  }
  if(rec==='once'||rec==='installments'){
    if(item.budgetMonth!=null&&item.budgetYear!=null){
      return(item.budgetYear*12+item.budgetMonth)===(y*12+m);
    }
    return true; // compatibilidade retroativa
  }
  return true;
}

async function renderProj(){
  var all=await dbAll();
  var budgets=await budgetAll();
  var allDone=await _budgetDoneAll();
  /* Carregar dados para calcCategoriaRealizado (uma vez só) */
  var _projGastos=[];var _projCartoes=[];
  try{_projGastos=await gastosAll();}catch(e){}
  try{_projCartoes=await cartoesAll();}catch(e){}
  /* Isolar categorias puras */
  var categoriaItems=budgets.filter(function(b){return b.isCategoriaOnly&&b.categoriaKey;});

  /* Filtrar TX por pessoa */
  var txFiltered=pessoaFilter
    ?all.filter(function(t){return t.pessoaId===pessoaFilter;})
    :all;

  /* Filtrar itens de budget por pessoa — exclui itens sem pessoaId quando filtro ativo */
  /* Excluir também categorias puras (entram separado via saldo restante) */
  var budgetsFiltered=pessoaFilter
    ?budgets.filter(function(item){return item.pessoaId===pessoaFilter&&!item.isCategoriaOnly;})
    :budgets.filter(function(item){return !item.isCategoriaOnly;});

  /* Construir Set de IDs realizados por mes: doneKey => budgetId_YYYYMM */
  var doneKeySet=new Set(allDone.map(function(d){return d.key;}));

  /* Pré-carregar itens de fatura de cartão para cada mês do horizonte */
  var cartaoByMonth=[];
  for(var pi=0;pi<projPeriods;pi++){
    var pm=(curMonth+pi)%12;
    var py=curYear+Math.floor((curMonth+pi)/12);
    try{
      var citens=await getCartaoBudgetItems(pm,py);
      if(pessoaFilter)citens=citens.filter(function(c){return c.pessoaId===pessoaFilter;});
      cartaoByMonth.push(citens);
    }catch(e){
      cartaoByMonth.push([]);
    }
  }

  var html='',totIncome=0,totExpense=0,totBalance=0;
  var accSeries=[],accRunning=0;

  for(var i=0;i<projPeriods;i++){
    var m=(curMonth+i)%12;
    var y=curYear+Math.floor((curMonth+i)/12);

    /* Calcular TX do mes (receitas e despesas ja lanćadas) */
    var monthResult=calcMonth(txFiltered,y,m);
    var income=monthResult.income;
    var expense=monthResult.expense+monthResult.credit;

    var mm=String(m+1).padStart(2,'0');

    /* Somar itens de budget pendentes (nao realizados) para este mes */
    for(var j=0;j<budgetsFiltered.length;j++){
      var item=budgetsFiltered[j];
      if(!_budgetItemAppliesTo(item,y,m))continue;
      var key=item.id+'_'+y+mm;
      if(doneKeySet.has(key))continue; /* ja gerou TX, nao duplicar */
      var val=item.value||0;
      if(item.type==='income'){income+=val;}else{expense+=val;}
    }

    /* Somar faturas de cartao pendentes (nao realizadas) para este mes */
    var citensDoMes=cartaoByMonth[i]||[];
    for(var k=0;k<citensDoMes.length;k++){
      var citem=citensDoMes[k];
      var ckey=citem.id+'_'+y+mm; /* ex: cartao_3_202607 */
      if(doneKeySet.has(ckey))continue; /* fatura ja foi marcada como realizada — TX credit ja contabilizada acima */
      expense+=citem.value||0;
    }

    /* Somar saldo restante das categorias orçadas (mês atual e futuros apenas) */
    var refM=parseInt(localStorage.getItem('refMonth'));var refY=parseInt(localStorage.getItem('refYear'));
    if(isNaN(refM)||isNaN(refY)){var _n=new Date();refM=_n.getMonth();refY=_n.getFullYear();}
    var absMes=y*12+m;var absRef=refY*12+refM;
    if(absMes>=absRef){
      for(var ci2=0;ci2<categoriaItems.length;ci2++){
        var cat=categoriaItems[ci2];
        var orcado=cat.value||0;
        var realizado=0;
        if(absMes===absRef){
          /* Mês atual: calcular realizado para obter saldo restante */
          realizado=calcCategoriaRealizado(cat.id,_projGastos,all,_projCartoes,m,y);
        }
        /* Meses futuros: realizado=0, usa orçado completo */
        var restante=Math.max(0,orcado-realizado);
        /* Se realizado > orçado no mês atual, o excesso já está nas faturas — não soma nada */
        expense+=restante;
      }
    }

    var balance=income-expense;
    totIncome+=income;
    totExpense+=expense;
    totBalance+=balance;
    accRunning+=balance;
    accSeries.push(accRunning);

    var bColor=balance>=0?'var(--green)':'var(--red)';
    var isNow=m===curMonth&&y===curYear;
    var rowBg=isNow?'var(--blue-bg)':'var(--bg3)';
    var rowBorder=isNow?'var(--blue-border)':'var(--border)';
    var rowWeight=isNow?'600':'500';
    var labelAtual=isNow?'<span style="font-size:9px;color:var(--blue);display:block">atual</span>':'';
    var sinalMes=balance>=0?'+':'-';
    html+='<div style="display:grid;grid-template-columns:64px 1fr 1fr 1fr;align-items:center;padding:11px 10px;background:'+rowBg+';border:1px solid '+rowBorder+';border-radius:10px;margin-bottom:6px">'
      +'<span style="font-size:12px;font-weight:'+rowWeight+'">'+MONTHS[m].substring(0,3)+labelAtual+'</span>'
      +'<span style="font-family:var(--mono);font-size:12px;text-align:right;color:var(--text2)">'+fmtN(income)+'</span>'
      +'<span style="font-family:var(--mono);font-size:12px;text-align:right;color:var(--text2)">'+fmtN(expense)+'</span>'
      +'<span style="font-family:var(--mono);font-size:13px;text-align:right;font-weight:600;color:'+bColor+'">'+sinalMes+fmtN(Math.abs(balance))+'</span>'
      +'</div>';
  }

  document.getElementById('proj-list').innerHTML=html||'<div class="empty">Sem dados cadastrados</div>';

  var totColor=totBalance>=0?'var(--green)':'var(--red)';
  var sinalTot=totBalance>=0?'+':'-';
  document.getElementById('proj-total').innerHTML=''
    +'<div style="display:grid;grid-template-columns:64px 1fr 1fr 1fr;align-items:center;padding:0 0">'
    +'<span style="font-size:10px;font-weight:600;color:var(--text2);text-transform:uppercase">Total</span>'
    +'<span style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--green);text-align:right">'+fmtN(totIncome)+'</span>'
    +'<span style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--red);text-align:right">'+fmtN(totExpense)+'</span>'
    +'<span style="font-family:var(--mono);font-size:13px;font-weight:600;color:'+totColor+';text-align:right">'+sinalTot+fmtN(Math.abs(totBalance))+'</span>'
    +'</div>'
    +'<div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:8px">'
    +'<span style="font-size:10px;color:var(--text3)">Inclui lançamentos já feitos e itens pendentes do orçamento</span>'
    +'<button onclick="showProjHelp()" style="width:14px;height:14px;border-radius:50%;border:1px solid var(--text3);color:var(--text3);background:none;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;cursor:pointer;line-height:1;flex-shrink:0;padding:0">ⓘ</button>'
    +'</div>';

  /* Gráfico de saldo acumulado */
  var maxBal=Math.max.apply(null,accSeries.map(function(v){return Math.abs(v);}).concat([1]));
  var step=300/Math.max(1,accSeries.length-1);
  var pts=accSeries.map(function(b,idx){return (idx*step).toFixed(0)+','+(54-b/maxBal*40).toFixed(0);});
  var projLinePts=pts.join(' ');
  var projAreaPts='0,84 '+projLinePts+' 300,84';
  var lastAcc=accSeries.length?accSeries[accSeries.length-1]:0;
  var projLineColor=lastAcc>=0?'var(--green)':'var(--red)';

  var areaEl=document.getElementById('proj-chart-area');
  var lineEl=document.getElementById('proj-chart-line');
  if(areaEl){areaEl.setAttribute('points',projAreaPts);areaEl.setAttribute('fill',projLineColor);}
  if(lineEl){lineEl.setAttribute('points',projLinePts);lineEl.setAttribute('stroke',projLineColor);}
  var chartTotEl=document.getElementById('proj-chart-tot');
  if(chartTotEl){chartTotEl.style.color=totColor;chartTotEl.textContent=sinalTot+fmtN(Math.abs(totBalance));}

  var firstNegativeIdx=accSeries.findIndex(function(v){return v<0;});
  var warnEl=document.getElementById('proj-negative-warning');
  if(warnEl){
    if(firstNegativeIdx>=0){
      var wm=(curMonth+firstNegativeIdx)%12;
      warnEl.style.display='';
      warnEl.textContent='⚠️ Saldo acumulado fica negativo em '+MONTHS[wm];
    }else{
      warnEl.style.display='none';
    }
  }

  _syncProjTabActive();
}

/* Explica o cálculo do saldo projetado (rodapé da Projeção Mensal), acionado
   pelo botão ⓘ — reaproveita o sheet padrão de confirmação, só com botão único
   de fechar em vez de Confirmar/Cancelar. */
function showProjHelp(){
  showConfirm(
    'Como o saldo projetado é calculado',
    'Para cada mês, somamos:'
    +'<ul style="margin:8px 0 0 16px;padding:0">'
    +'<li style="margin-bottom:4px">Lançamentos já feitos no mês (avulsos ou vindos do Orçamento)</li>'
    +'<li style="margin-bottom:4px">Itens de orçamento ainda não marcados como realizados</li>'
    +'<li style="margin-bottom:4px">Faturas de cartão ainda não marcadas como realizadas</li>'
    +'<li>Saldo restante das categorias orçadas (orçado − já gasto)</li>'
    +'</ul>',
    [{label:'Entendi',cls:'btn-primary',action:function(){}}]
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FASE 4 — Projeção dia a dia + Horizonte de saldos (seção 5 da spec extraída)
   Toggle Mensal/Dia a dia. Preserva 100% a view mensal (renderProj acima,
   intocada) — apenas adiciona a view dia a dia e o sheet de Horizonte.
   ══════════════════════════════════════════════════════════════════════ */

let projView='monthly'; // 'monthly' | 'daily'
let expandedDay=null; // número do dia expandido na view diária, ou null

function setProjView(v){
  projView=v;
  expandedDay=null;
  renderProjViewToggle();
  const monthlyEl=document.getElementById('proj-monthly-view');
  const dailyEl=document.getElementById('proj-daily-view');
  const tabsEl=document.getElementById('proj-period-tabs');
  if(monthlyEl)monthlyEl.style.display=v==='monthly'?'':'none';
  if(dailyEl)dailyEl.style.display=v==='daily'?'':'none';
  if(tabsEl)tabsEl.style.display=v==='monthly'?'flex':'none';
  if(v==='monthly')renderProj();
  else renderProjDaily();
}

function renderProjViewToggle(){
  const mBtn=document.getElementById('proj-view-monthly-btn');
  const dBtn=document.getElementById('proj-view-daily-btn');
  if(!mBtn||!dBtn)return;
  const isMonthly=projView==='monthly';
  _setProjToggleBtnStyle(mBtn,isMonthly);
  _setProjToggleBtnStyle(dBtn,!isMonthly);
}
function _setProjToggleBtnStyle(btn,active){
  if(active){
    btn.style.background='var(--blue)';
    btn.style.color='#fff';
    btn.style.border='none';
    btn.style.fontWeight='600';
    btn.style.cursor='pointer';
  }else{
    btn.style.background='transparent';
    btn.style.border='1px solid var(--border)';
    btn.style.color='var(--text2)';
    btn.style.fontWeight='500';
    btn.style.cursor='pointer';
  }
}

function toggleExpandedDay(day){
  expandedDay=(expandedDay===day)?null:day;
  renderProjDaily();
}

/* Itens de orçamento pendentes que vencem em um dia específico do mês navegado (y,m).
   Réplica da regra usada na projeção mensal (_budgetItemAppliesTo) + verificação de dueDay,
   restrita a recorrência 'always' com offset 0 (mesma regra da spec extraída, seção 5). */
async function _projPendingBudgetItemsForDay(budgetsFiltered, doneKeySet, y, m, day){
  const mm=String(m+1).padStart(2,'0');
  const result=[];
  budgetsFiltered.forEach(function(b){
    /* dueMonthOffset é só informativo (badge "vence em outro mês" na lista do Orçamento) —
       o item continua pertencendo/sendo contado no mês em que está sendo orçado (y,m), como
       a Projeção Mensal já faz. Filtrar por offset!==0 aqui fazia o item nunca aparecer em
       NENHUM dia de nenhum mês na view diária. */
    if((b.dueDay||1)!==day)return;
    if(!_budgetItemAppliesTo(b,y,m))return;
    const dk=b.id+'_'+y+mm;
    if(doneKeySet.has(dk))return;
    result.push(b);
  });
  return result;
}

/* Faturas de cartão pendentes que vencem em um dia específico do mês navegado (y,m).
   Réplica da regra usada na projeção mensal (cartaoByMonth em renderProj), restrita ao
   dueDay (dia de vencimento do cartão) — mesma fonte de dados (getCartaoBudgetItems). */
async function _projPendingCartaoItemsForDay(citensDoMes, doneKeySet, y, m, day){
  const mm=String(m+1).padStart(2,'0');
  return citensDoMes.filter(function(c){
    if((c.dueDay||1)!==day)return false;
    const ckey=c.id+'_'+y+mm;
    if(doneKeySet.has(ckey))return false;
    return true;
  });
}

/* Saldo restante das categorias orçadas (Mercado, Lazer etc.) para o mês (y,m) — réplica
   exata da regra usada na projeção mensal (renderProj, seção "saldo restante das categorias").
   Sem dueDay próprio: soma-se inteiro no último dia do mês, mesmo critério de "o que falta
   gastar até o fim do mês" usado na view mensal. */
async function _projCategoriaRestante(y, m){
  var refM=parseInt(localStorage.getItem('refMonth'));var refY=parseInt(localStorage.getItem('refYear'));
  if(isNaN(refM)||isNaN(refY)){var _n=new Date();refM=_n.getMonth();refY=_n.getFullYear();}
  var absMes=y*12+m;var absRef=refY*12+refM;
  if(absMes<absRef)return 0;
  var budgets=await budgetAll();
  var categoriaItems=budgets.filter(function(b){return b.isCategoriaOnly&&b.categoriaKey;});
  if(!categoriaItems.length)return 0;
  var _projGastos=[],_projCartoes=[],_all=[];
  try{_projGastos=await gastosAll();}catch(e){}
  try{_projCartoes=await cartoesAll();}catch(e){}
  try{_all=await dbAll();}catch(e){}
  var total=0;
  categoriaItems.forEach(function(cat){
    var orcado=cat.value||0;
    var realizado=0;
    if(absMes===absRef){
      realizado=calcCategoriaRealizado(cat.id,_projGastos,_all,_projCartoes,m,y);
    }
    total+=Math.max(0,orcado-realizado);
  });
  return total;
}

/* Projeção dia a dia — sempre restrita ao mês navegado (curMonth/curYear). */
async function renderProjDaily(){
  try{
    renderProjViewToggle();
    const all=await dbAll();
    const budgets=await budgetAll();
    const allDone=await _budgetDoneAll();
    const doneKeySet=new Set(allDone.map(function(d){return d.key;}));
    const budgetsFiltered=(pessoaFilter
      ?budgets.filter(function(item){return item.pessoaId===pessoaFilter&&!item.isCategoriaOnly;})
      :budgets.filter(function(item){return !item.isCategoriaOnly;}));

    let citensDoMes=[];
    try{
      citensDoMes=await getCartaoBudgetItems(curMonth,curYear);
      if(pessoaFilter)citensDoMes=citensDoMes.filter(function(c){return c.pessoaId===pessoaFilter;});
    }catch(e){}
    let categoriaRestante=0;
    try{categoriaRestante=await _projCategoriaRestante(curYear,curMonth);}catch(e){}

    const txFiltered=pessoaFilter?all.filter(function(t){return t.pessoaId===pessoaFilter;}):all;

    /* Base de "hoje" para decidir o que é pendente: o mês de REFERÊNCIA configurado
       (refMonth/refYear, mesmo usado por renderProj/_projCategoriaRestante), não a data
       real do relógio do sistema — navegar para um mês diferente do mês real (ex: mês de
       referência definido no passado) não deve zerar os itens pendentes daquele mês.
       Só usa o corte "dia > hoje" quando o mês de referência É de fato o mês real
       corrente; caso contrário, o mês navegado (quando é o mês de referência) é tratado
       por inteiro como pendente, igual a um mês futuro. */
    const todayD=new Date();todayD.setHours(0,0,0,0);
    var refM=parseInt(localStorage.getItem('refMonth'));var refY=parseInt(localStorage.getItem('refYear'));
    if(isNaN(refM)||isNaN(refY)){refM=todayD.getMonth();refY=todayD.getFullYear();}
    const refIsRealToday=(refY===todayD.getFullYear()&&refM===todayD.getMonth());
    const viewingCurrentMonth=refIsRealToday&&(curYear===refY&&curMonth===refM);
    const todayNum=todayD.getDate();
    const dim=daysInMonth(curYear,curMonth);
    const isFutureMonth=(curYear*12+curMonth)>=(refY*12+refM)&&!viewingCurrentMonth;

    let runningDia=0;
    let html='';
    for(let day=1;day<=dim;day++){
      const dayTxs=txFiltered.filter(function(t){
        if(t.year!==curYear||t.month!==curMonth)return false;
        const raw=t.date||t.paidDate;
        const dnum=raw?parseInt(raw.split('-')[2]):1;
        return dnum===day;
      });
      let dIn=dayTxs.filter(function(t){return t.type==='income';}).reduce(function(a,t){return a+t.value;},0);
      let dOut=dayTxs.filter(function(t){return t.type!=='income';}).reduce(function(a,t){return a+t.value;},0);

      const isFutureDay=isFutureMonth||(viewingCurrentMonth&&day>todayNum);
      let pendingItems=[];
      let pendingCartaoItems=[];
      if(isFutureDay){
        pendingItems=await _projPendingBudgetItemsForDay(budgetsFiltered,doneKeySet,curYear,curMonth,day);
        pendingItems.forEach(function(b){
          if(b.type==='income')dIn+=b.value; else dOut+=b.value;
        });
        pendingCartaoItems=await _projPendingCartaoItemsForDay(citensDoMes,doneKeySet,curYear,curMonth,day);
        pendingCartaoItems.forEach(function(c){dOut+=c.value;});
      }
      /* Saldo restante das categorias orçadas — sem dueDay próprio, soma no último dia do mês */
      if(day===dim&&categoriaRestante>0)dOut+=categoriaRestante;

      const net=dIn-dOut;
      runningDia+=net;
      const isToday=viewingCurrentMonth&&day===todayNum;
      const saldoColor=runningDia>=0?'var(--green)':'var(--red)';
      const isExpanded=expandedDay===day;

      let rowBg='var(--bg3)',rowBorder='var(--border)';
      if(isToday){rowBg='var(--text)';rowBorder='var(--text)';}
      else if(net>0){rowBg='var(--green-bg)';rowBorder='var(--green-border)';}
      else if(net<0){rowBg='var(--amber-bg)';rowBorder='var(--amber-border)';}

      const textColor=isToday?'var(--bg)':'var(--text)';

      let movStr='—',movColor=isToday?'var(--bg)':'var(--text3)',movIcon='none';
      const isMixed=dIn>0&&dOut>0;
      if(isMixed){movStr=(net>=0?'+':'−')+fmtN(Math.abs(net));movColor=isToday?'var(--bg)':(net>=0?'var(--green)':'var(--red)');movIcon='mixed';}
      else if(dIn>0){movStr='+'+fmtN(dIn);movColor=isToday?'var(--bg)':'var(--green)';movIcon='in';}
      else if(dOut>0){movStr='−'+fmtN(dOut);movColor=isToday?'var(--bg)':'var(--red)';movIcon='out';}

      const iconIn='<svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:'+movColor+';fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
      const iconOut='<svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:'+movColor+';fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/></svg>';
      const iconMixed='<svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:'+movColor+';fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>';
      const movIconHtml=movIcon==='in'?iconIn:movIcon==='out'?iconOut:movIcon==='mixed'?iconMixed:'';

      let itemsHtml='';
      if(isExpanded){
        const allDayItems=dayTxs.map(function(t){return{name:t.name,value:t.value,income:t.type==='income'};})
          .concat(pendingItems.map(function(b){return{name:b.name+' (pendente)',value:b.value,income:b.type==='income'};}))
          .concat(pendingCartaoItems.map(function(c){return{name:c.name+' (pendente)',value:c.value,income:false};}))
          .concat((day===dim&&categoriaRestante>0)?[{name:'Saldo restante de categorias (pendente)',value:categoriaRestante,income:false}]:[]);
        itemsHtml='<div style="margin:-2px 0 8px;padding:8px 10px;background:var(--bg3);border:1px dashed var(--border);border-radius:8px;animation:popIn .2s ease">'
          +(allDayItems.length?allDayItems.map(function(it){
            return'<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0">'
              +'<span style="color:var(--text2)">'+it.name+'</span>'
              +'<span style="font-family:var(--mono);color:'+(it.income?'var(--green)':'var(--red)')+'">'+(it.income?'+':'−')+fmt(it.value)+'</span>'
              +'</div>';
          }).join(''):'<div style="font-size:11px;color:var(--text3);text-align:center">Sem movimentação neste dia</div>')
          +'</div>';
      }

      html+='<div onclick="toggleExpandedDay('+day+')" class="proj-daily-row" style="display:grid;grid-template-columns:44px 1fr 1fr;align-items:center;padding:9px 6px;background:'+rowBg+';border:1px solid '+rowBorder+';border-radius:8px;margin-bottom:4px;cursor:pointer;transition:background .2s,border-color .2s,transform .12s">'
        +'<span style="font-size:12px;font-weight:600;color:'+textColor+'">'+day+'</span>'
        +'<span style="display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:12px;color:'+movColor+'">'+movIconHtml+movStr+'</span>'
        +'<span style="font-family:var(--mono);font-size:13px;text-align:right;font-weight:600;color:'+saldoColor+'">'+(runningDia>=0?'+':'-')+fmtN(Math.abs(runningDia))+'</span>'
        +'</div>'
        +itemsHtml;
    }

    const listEl=document.getElementById('proj-daily-list');
    if(listEl)listEl.innerHTML=html||'<div class="empty">Sem dados neste mês</div>';

    const finalColor=runningDia>=0?'var(--green)':'var(--red)';
    const finalEl=document.getElementById('proj-daily-final');
    if(finalEl)finalEl.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:center">'
      +'<span style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase">Final</span>'
      +'<span style="font-family:var(--mono);font-size:14px;font-weight:600;color:'+finalColor+'">'+(runningDia>=0?'+':'-')+fmtN(Math.abs(runningDia))+'</span>'
      +'</div>';

  }catch(e){
    console.error('[renderProjDaily]',e);
    toast('Erro ao carregar projeção diária','var(--red)');
  }
}

/* ── Horizonte de saldos — grid 6 meses x 31 dias, cores por threshold (spec seção 5) ── */
function openHorizon(){
  const overlay=document.getElementById('horizon-overlay');
  if(overlay)overlay.style.display='block';
  renderHorizon();
}
function closeHorizon(){
  const overlay=document.getElementById('horizon-overlay');
  if(overlay)overlay.style.display='none';
}

async function renderHorizon(){
  try{
    const gridEl=document.getElementById('horizon-grid');
    if(!gridEl)return;
    const all=await dbAll();
    const budgets=await budgetAll();
    const allDone=await _budgetDoneAll();
    const doneKeySet=new Set(allDone.map(function(d){return d.key;}));

    /* Base de "hoje" para decidir o que é pendente: o mês de REFERÊNCIA configurado
       (mesmo critério de renderProjDaily) — ver comentário lá para o raciocínio completo. */
    const todayH=new Date();todayH.setHours(0,0,0,0);
    var refMH=parseInt(localStorage.getItem('refMonth'));var refYH=parseInt(localStorage.getItem('refYear'));
    if(isNaN(refMH)||isNaN(refYH)){refMH=todayH.getMonth();refYH=todayH.getFullYear();}
    const refIsRealTodayH=(refYH===todayH.getFullYear()&&refMH===todayH.getMonth());
    const horizonSpan=6;
    const horizonMonths=[];

    for(let mi=0;mi<horizonSpan;mi++){
      let hm=curMonth+mi,hy=curYear;while(hm>11){hm-=12;hy++;}
      const dimH=daysInMonth(hy,hm);
      const isCurrentMonthH=refIsRealTodayH&&(hy===refYH&&hm===refMH);
      const isFutureMonthH=(hy*12+hm)>=(refYH*12+refMH)&&!isCurrentMonthH;
      const todayNumH=todayH.getDate();

      const monthTxs=all.filter(function(t){return t.year===hy&&t.month===hm;});
      const monthIncomeH=calcMonth(monthTxs,hy,hm).income||1;
      const lowThreshold=Math.max(monthIncomeH*0.07,150);

      let citensDoMesH=[];
      try{
        citensDoMesH=await getCartaoBudgetItems(hm,hy);
        if(pessoaFilter)citensDoMesH=citensDoMesH.filter(function(c){return c.pessoaId===pessoaFilter;});
      }catch(e){}
      let categoriaRestanteH=0;
      try{categoriaRestanteH=await _projCategoriaRestante(hy,hm);}catch(e){}

      let runH=0;
      const cells=[];
      for(let day=1;day<=31;day++){
        if(day>dimH){cells.push({empty:true,bg:'transparent',fg:'transparent',valStr:''});continue;}
        const isFutureDayH=isFutureMonthH||(isCurrentMonthH&&day>todayNumH);
        const dayTxsH=all.filter(function(t){
          if(t.year!==hy||t.month!==hm)return false;
          if(pessoaFilter&&t.pessoaId!==pessoaFilter)return false;
          const raw=t.date||t.paidDate;
          const dnum=raw?parseInt(raw.split('-')[2]):1;
          return dnum===day;
        });
        let dInH=dayTxsH.filter(function(t){return t.type==='income';}).reduce(function(a,t){return a+t.value;},0);
        let dOutH=dayTxsH.filter(function(t){return t.type!=='income';}).reduce(function(a,t){return a+t.value;},0);
        if(isFutureDayH){
          /* Usa _budgetItemAppliesTo (mesma função da Mensal/Diária) em vez de checar
             budgetMonth/budgetYear diretamente — a checagem antiga não tinha o fallback de
             compatibilidade retroativa (item 'once'/'installments' sem budgetMonth/budgetYear
             preenchido), descartando itens que a Mensal e a Diária já contavam. */
          budgets.filter(function(b){return !b.isCategoriaOnly&&(!pessoaFilter||b.pessoaId===pessoaFilter);}).forEach(function(b){
            const dueDay=b.dueDay||1;
            if(dueDay!==day)return;
            if(!_budgetItemAppliesTo(b,hy,hm))return;
            const dk=b.id+'_'+hy+String(hm+1).padStart(2,'0');
            if(doneKeySet.has(dk))return;
            if(b.type==='income')dInH+=b.value; else dOutH+=b.value;
          });
          citensDoMesH.forEach(function(c){
            if((c.dueDay||1)!==day)return;
            const ckey=c.id+'_'+hy+String(hm+1).padStart(2,'0');
            if(doneKeySet.has(ckey))return;
            dOutH+=c.value||0;
          });
        }
        /* Saldo restante das categorias orçadas — sem dueDay próprio, soma no último dia do mês */
        if(day===dimH&&categoriaRestanteH>0)dOutH+=categoriaRestanteH;
        runH+=(dInH-dOutH);
        const isTodayH=isCurrentMonthH&&day===todayNumH;

        let cellFg='var(--green)', cellBg='var(--green-bg)';
        if(runH<0){cellFg='var(--red)';cellBg='var(--red-bg)';}
        else if(runH<lowThreshold){cellFg='var(--amber)';cellBg='var(--amber-bg)';}

        cells.push({empty:false, bg:isTodayH?'var(--text)':cellBg, fg:isTodayH?'var(--bg)':cellFg, valStr:fmtCompact(runH), day:day});
      }
      horizonMonths.push({label:MONTHS[hm].slice(0,3)+'/'+String(hy).slice(2), cells:cells});
    }

    // Transposição: linhas = dias (1-31), colunas = meses
    const colWidth=64;
    let headerHtml='<div style="display:grid;grid-template-columns:34px repeat('+horizonSpan+',minmax('+colWidth+'px,1fr));gap:3px;margin-bottom:4px">'
      +'<div></div>'
      +horizonMonths.map(function(hm){return'<div style="font-size:10px;color:var(--text3);text-align:center;font-weight:600">'+hm.label+'</div>';}).join('')
      +'</div>';

    let rowsHtml='';
    for(let d=0;d<31;d++){
      const dayNum=d+1;
      rowsHtml+='<div style="display:grid;grid-template-columns:34px repeat('+horizonSpan+',minmax('+colWidth+'px,1fr));gap:3px;margin-bottom:3px">'
        +'<div style="font-size:10px;color:var(--text3);display:flex;align-items:center;justify-content:center">'+dayNum+'</div>'
        +horizonMonths.map(function(hm){
          const cell=hm.cells[d];
          if(cell.empty)return'<div></div>';
          return'<div style="background:'+cell.bg+';color:'+cell.fg+';border-radius:6px;padding:4px 2px;text-align:center;font-size:10px;font-family:var(--mono);font-weight:600">'+cell.valStr+'</div>';
        }).join('')
        +'</div>';
    }

    gridEl.innerHTML=headerHtml+rowsHtml;

  }catch(e){
    console.error('[renderHorizon]',e);
    toast('Erro ao carregar horizonte de saldos','var(--red)');
  }
}
