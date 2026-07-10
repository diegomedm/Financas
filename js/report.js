/* ══════════════════════════════════════════════════════════════════════
   FASE 4 — Relatório mensal (seções 2 e 3 da spec extraída)
   Nova tela, acessada só pelo link do Dashboard (js/app.js: goReport/goDashFromReport).
   Reutiliza o mês navegado (curMonth/curYear) e o filtro de pessoa (pessoaFilter) já
   globais. Todas as fórmulas abaixo foram copiadas literalmente da spec extraída.
   ══════════════════════════════════════════════════════════════════════ */

async function renderReport(){
  try{
    const titleEl=document.getElementById('report-title');
    if(titleEl)titleEl.textContent='Relatório · '+MONTHS[curMonth].slice(0,3);

    const all=await dbAll();
    const budgets=await budgetAll();
    const gastos=await gastosAll();

    let rows=all.filter(t=>t.year===curYear&&t.month===curMonth);
    if(pessoaFilter)rows=rows.filter(t=>t.pessoaId===pessoaFilter);
    const c=calcMonth(rows,curYear,curMonth); // já filtrado por pessoa, então basta recalcular sobre rows
    const cReal={income:c.income,fixed:0,variable:0,credit:c.credit,expense:c.expense,out:c.expense+c.credit,balance:c.balance};

    const compareHtml=_reportCompareHtml(rows, cReal, all);
    const topGastosHtml=_reportTopGastosHtml(rows);
    const categoriasHtml=await _reportCategoriasHtml(budgets, gastos, all);
    const recordsHtml=_reportRecordsHtml(all);
    const patrimonioHtml=_reportPatrimonioHtml(all);

    const el=document.getElementById('report-content');
    if(el)el.innerHTML=compareHtml+topGastosHtml+categoriasHtml+recordsHtml+patrimonioHtml;

  }catch(e){
    console.error('[renderReport]',e);
    toast('Erro ao carregar relatório','var(--red)');
  }
}

/* ── Comparado ao mês anterior — 3 cards (Receitas/Gastos/Saldo) ── */
function _reportCompareHtml(rows, c, all){
  const prevM=curMonth-1<0?11:curMonth-1, prevY=curMonth-1<0?curYear-1:curYear;
  const prevMonthName=MONTHS[prevM];
  let prevRowsR=all.filter(t=>t.year===prevY&&t.month===prevM);
  if(pessoaFilter)prevRowsR=prevRowsR.filter(t=>t.pessoaId===pessoaFilter);
  const prevCalc=calcMonth(prevRowsR,prevY,prevM);
  const prevCR={income:prevCalc.income,out:prevCalc.expense+prevCalc.credit,balance:prevCalc.balance};

  const pctDelta=function(cur,prev){if(prev===0)return cur===0?0:100;return Math.round((cur-prev)/Math.abs(prev)*100);};
  const prevHasData=prevRowsR.length>0;
  const incDelta=pctDelta(c.income,prevCR.income), outDelta=pctDelta(c.out,prevCR.out), balDelta=pctDelta(c.balance,prevCR.balance);

  const items=[
    {label:'Receitas',curStr:'R$ '+fmtCompact(c.income),d:incDelta,goodUp:true},
    {label:'Gastos',curStr:'R$ '+fmtCompact(c.out),d:outDelta,goodUp:false},
    {label:'Saldo',curStr:(c.balance<0?'−':'')+'R$ '+fmtCompact(Math.abs(c.balance)),d:balDelta,goodUp:true}
  ].map(function(x){
    return{
      label:x.label, curStr:x.curStr,
      deltaStr:prevHasData?((x.d>=0?'+':'')+x.d+'%'):'sem dados em '+prevMonthName.toLowerCase(),
      arrowColor:prevHasData?((x.d>=0)===x.goodUp?'var(--green)':'var(--red)'):'var(--text3)',
      arrowRotate:x.d>=0?'rotate(0deg)':'rotate(180deg)',
      hasArrow:prevHasData
    };
  });

  const cardsHtml=items.map(function(it){
    const arrowSvg=it.hasArrow
      ?'<svg viewBox="0 0 24 24" style="width:11px;height:11px;stroke:'+it.arrowColor+';fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;transform:'+it.arrowRotate+'"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>'
      :'';
    return'<div style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px;min-width:0">'
      +'<div style="font-size:11px;color:var(--text3);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+it.label+'</div>'
      +'<div style="font-size:14px;font-weight:600;font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+it.curStr+'</div>'
      +'<div style="display:flex;align-items:center;gap:3px;margin-top:4px;font-size:11px;color:'+it.arrowColor+'">'+arrowSvg+'<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+it.deltaStr+'</span></div>'
      +'</div>';
  }).join('');

  return'<div class="card">'
    +'<div class="card-title">Comparado a '+prevMonthName+'</div>'
    +'<div style="display:flex;gap:10px">'+cardsHtml+'</div>'
    +'</div>';
}

/* ── Top 5 gastos do mês ── */
function _reportTopGastosHtml(rows){
  const topGastos=[...rows].filter(function(t){return t.type!=='income';})
    .sort(function(a,b){return b.value-a.value;})
    .slice(0,5)
    .map(function(t,i){return{rank:i+1,name:t.name,valStr:fmt(t.value)};});
  const hasTopGastos=topGastos.length>0;

  const rowsHtml=hasTopGastos?topGastos.map(function(g){
    return'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;'+(g.rank<5?'border-bottom:1px solid var(--border)':'')+'">'
      +'<div style="width:22px;height:22px;border-radius:50%;background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--text2);flex-shrink:0">'+g.rank+'</div>'
      +'<span style="flex:1;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+g.name+'</span>'
      +'<span style="font-size:13px;font-weight:600;font-family:var(--mono);color:var(--red);flex-shrink:0">−'+g.valStr+'</span>'
      +'</div>';
  }).join('')
    :'<div style="padding:16px 0;text-align:center;color:var(--text3);font-size:13px">Sem gastos neste mês</div>';

  return'<div class="card"><div class="card-title">Maiores gastos do mês</div>'+rowsHtml+'</div>';
}

/* ── % por categoria ── */
async function _reportCategoriasHtml(budgets, gastos, all){
  const cats=budgets.filter(function(b){return b.categoriaKey;});
  if(!cats.length)return'';

  const realOf=function(catId){
    const gTotal=gastos.filter(function(g){return g.categoriaId===catId;}).reduce(function(a,g){return a+g.value;},0);
    const tTotal=all.filter(function(t){return t.categoriaId===catId&&t.month===curMonth&&t.year===curYear;}).reduce(function(a,t){return a+t.value;},0);
    return gTotal+tTotal;
  };

  const catTotalR=cats.reduce(function(a,cat){return a+realOf(cat.id);},0);
  let reportCategorias=cats.map(function(cat){
    const real=realOf(cat.id);
    const pct=catTotalR>0?Math.round(real/catTotalR*100):0;
    return{name:cat.name,valStr:fmt(real),pct,pctW:pct+'%'};
  }).filter(function(x){return x.pct>0;})
    .sort(function(a,b){return b.pct-a.pct;})
    .slice(0,6);

  if(!reportCategorias.length)return'';

  const rowsHtml=reportCategorias.map(function(rc){
    return'<div>'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">'
      +'<span>'+rc.name+'</span>'
      +'<span style="color:var(--text3)">'+rc.valStr+' · '+rc.pct+'%</span>'
      +'</div>'
      +'<div style="height:5px;background:var(--bg4);border-radius:3px;overflow:hidden">'
      +'<div style="width:'+rc.pctW+';height:100%;background:var(--amber);border-radius:3px;transition:width .5s"></div>'
      +'</div>'
      +'</div>';
  }).join('');

  return'<div class="card"><div class="card-title">Por categoria</div>'
    +'<div style="display:flex;flex-direction:column;gap:11px">'+rowsHtml+'</div>'
    +'</div>';
}

/* ── Recordes (considera TODO o histórico, sem filtro de mês nem de pessoa) ── */
function _reportRecordsHtml(all){
  const allNonIncome=all.filter(function(t){return t.type!=='income';});
  const biggestTx=allNonIncome.length?allNonIncome.reduce(function(a,b){return b.value>a.value?b:a;}):null;

  const monthKeysR={};
  all.forEach(function(t){
    const k=t.year+'-'+t.month;
    if(!monthKeysR[k])monthKeysR[k]={income:0,out:0,year:t.year,month:t.month};
    if(t.type==='income')monthKeysR[k].income+=t.value; else monthKeysR[k].out+=t.value;
  });
  const monthArrR=Object.values(monthKeysR).map(function(m){return Object.assign({},m,{bal:m.income-m.out});});
  const bestIncomeMonth=monthArrR.length?monthArrR.reduce(function(a,b){return b.income>a.income?b:a;}):null;
  const bestSavingMonth=monthArrR.length?monthArrR.reduce(function(a,b){return b.bal>a.bal?b:a;}):null;

  const records=[];
  if(biggestTx)records.push({icon:'🏆',label:'Maior gasto individual',detail:biggestTx.name+' · '+MONTHS[biggestTx.month]+'/'+String(biggestTx.year).slice(2),valStr:fmt(biggestTx.value)});
  if(bestIncomeMonth)records.push({icon:'📈',label:'Melhor mês em receita',detail:MONTHS[bestIncomeMonth.month]+'/'+String(bestIncomeMonth.year).slice(2),valStr:fmt(bestIncomeMonth.income)});
  if(bestSavingMonth)records.push({icon:'💰',label:'Maior economia mensal',detail:MONTHS[bestSavingMonth.month]+'/'+String(bestSavingMonth.year).slice(2),valStr:fmt(bestSavingMonth.bal)});

  if(!records.length)return'';

  const rowsHtml=records.map(function(r,i){
    return'<div style="display:flex;align-items:center;gap:10px;padding:9px 0;'+(i<records.length-1?'border-bottom:1px solid var(--border)':'')+'">'
      +'<span style="font-size:18px;flex-shrink:0">'+r.icon+'</span>'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:13px;font-weight:500">'+r.label+'</div>'
      +'<div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.detail+'</div>'
      +'</div>'
      +'<span style="font-size:13px;font-weight:600;font-family:var(--mono);flex-shrink:0">'+r.valStr+'</span>'
      +'</div>';
  }).join('');

  return'<div class="card"><div class="card-title">Recordes</div>'+rowsHtml+'</div>';
}

/* ── Evolução patrimonial — 12 meses, SVG puro (seção 3 da spec) ──
   Fórmulas de saldo acumulado e coordenadas copiadas EXATAMENTE da spec extraída. */
function _reportPatrimonioHtml(all){
  const patMonths=[];
  for(let i=11;i>=0;i--){let pm=curMonth-i,py=curYear;while(pm<0){pm+=12;py--;}patMonths.push({m:pm,y:py});}
  let _pacc=0;
  const patPoints=patMonths.map(function(my){
    const mr=all.filter(function(t){return t.year===my.y&&t.month===my.m;}); // NÃO filtra por pessoa
    const mc=calcMonth(mr,my.y,my.m);
    _pacc+=mc.balance;
    return{label:MONTHS[my.m].slice(0,3),val:_pacc};
  });
  const patMax=Math.max.apply(null,patPoints.map(function(p){return p.val;}).concat([0]));
  const patMin=Math.min.apply(null,patPoints.map(function(p){return p.val;}).concat([0]));
  const patRange=(patMax-patMin)||1;
  const patW=300,patH=100,patPad=8;
  const patStepX=patPoints.length>1?(patW-patPad*2)/(patPoints.length-1):0;
  const patXY=patPoints.map(function(p,i){
    return{
      x:patPad+i*patStepX,
      y:patPad+(1-(p.val-patMin)/patRange)*(patH-patPad*2)
    };
  });
  const patLinePoints=patXY.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');
  const patAreaPath='M'+patXY[0].x.toFixed(1)+','+(patH-patPad)
    +' L'+patXY.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' L')
    +' L'+patXY[patXY.length-1].x.toFixed(1)+','+(patH-patPad)+' Z';
  const patZeroY=(patPad+(1-(0-patMin)/patRange)*(patH-patPad*2)).toFixed(1);
  const patCrossesZero=patMin<0&&patMax>0;
  const patLineColor=patPoints[patPoints.length-1].val>=0?'var(--green)':'var(--red)';
  const patLastLabel=patPoints[patPoints.length-1].label;
  const patLastValStr=fmt(patPoints[patPoints.length-1].val);
  const patFirstLabel=patPoints[0].label;
  const patLastX=patXY[patXY.length-1].x.toFixed(1);
  const patLastY=patXY[patXY.length-1].y.toFixed(1);

  const gradId='patGrad'+Date.now();
  const zeroLineHtml=patCrossesZero
    ?'<line x1="8" y1="'+patZeroY+'" x2="292" y2="'+patZeroY+'" stroke="var(--border2)" stroke-width="1" stroke-dasharray="3,3"/>'
    :'';

  return'<div class="card">'
    +'<div class="card-title">Evolução patrimonial — 12 meses</div>'
    +'<div style="font-size:20px;font-weight:600;font-family:var(--mono);color:'+patLineColor+';margin-bottom:6px">'+patLastValStr+'</div>'
    +'<svg viewBox="0 0 300 100" style="width:100%;height:100px;display:block;overflow:visible">'
    +'<defs><linearGradient id="'+gradId+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0%" stop-color="'+patLineColor+'" stop-opacity="0.35"/>'
    +'<stop offset="100%" stop-color="'+patLineColor+'" stop-opacity="0"/>'
    +'</linearGradient></defs>'
    +zeroLineHtml
    +'<path d="'+patAreaPath+'" fill="url(#'+gradId+')" stroke="none"></path>'
    +'<polyline points="'+patLinePoints+'" fill="none" stroke="'+patLineColor+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>'
    +'<circle cx="'+patLastX+'" cy="'+patLastY+'" r="4" fill="'+patLineColor+'" stroke="var(--bg2)" stroke-width="2"></circle>'
    +'</svg>'
    +'<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:var(--text3)">'
    +'<span>'+patFirstLabel+'</span><span>'+patLastLabel+'</span>'
    +'</div>'
    +'</div>';
}
