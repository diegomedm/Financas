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

  /* Filtrar TX por pessoa */
  var txFiltered=pessoaFilter
    ?all.filter(function(t){return t.pessoaId===pessoaFilter;})
    :all;

  /* Filtrar itens de budget por pessoa — exclui itens sem pessoaId quando filtro ativo */
  var budgetsFiltered=pessoaFilter
    ?budgets.filter(function(item){return item.pessoaId===pessoaFilter;})
    :budgets;

  /* Construir Set de IDs realizados por mes: doneKey => budgetId_YYYYMM */
  /* Indexar por chave completa para lookup O(1) dentro do loop */
  var doneKeySet=new Set(allDone.map(function(d){return d.key;}));

  var html='',totIncome=0,totExpense=0,totBalance=0;

  for(var i=0;i<projPeriods;i++){
    var m=(curMonth+i)%12;
    var y=curYear+Math.floor((curMonth+i)/12);

    /* Calcular TX do mes (receitas e despesas ja lanćadas) */
    var monthResult=calcMonth(txFiltered,y,m);
    var income=monthResult.income;
    var expense=monthResult.expense+monthResult.credit;

    /* Somar itens de budget pendentes (nao realizados) para este mes */
    for(var j=0;j<budgetsFiltered.length;j++){
      var item=budgetsFiltered[j];
      if(!_budgetItemAppliesTo(item,y,m))continue;

      /* Verificar se foi marcado como realizado neste mes */
      /* doneKey = budgetId_YYYYMM  ex: 5_202607 */
      var mm=String(m+1).padStart(2,'0');
      var key=item.id+'_'+y+mm;
      if(doneKeySet.has(key))continue; /* ja gerou TX, nao duplicar */

      var val=item.value||0;
      if(item.type==='income'){
        income+=val;
      }else{
        expense+=val;
      }
    }

    var balance=income-expense;
    totIncome+=income;
    totExpense+=expense;
    totBalance+=balance;

    var bColor=balance>=0?'var(--green)':'var(--red)';
    var isNow=m===curMonth&&y===curYear;
    var rowStyle=isNow?'border-color:var(--blue);background:var(--blue-bg)':'';
    var labelAtual=isNow?' <span style="font-size:10px;color:var(--blue)"> atual</span>':'';
    var sinalMes=balance>=0?'+':'-';
    html+='<div class="proj-row" style="'+rowStyle+'">'
      +'<span class="proj-month-name">'+MONTHS[m].substring(0,3)+' '+y+labelAtual+'</span>'
      +'<span class="proj-val" style="color:var(--green)">'+fmtN(income)+'</span>'
      +'<span class="proj-val" style="color:var(--red)">'+fmtN(expense)+'</span>'
      +'<span class="proj-val proj-balance" style="color:'+bColor+'">'+sinalMes+fmtN(Math.abs(balance))+'</span>'
      +'</div>';
  }

  document.getElementById('proj-list').innerHTML=html||'<div class="empty">Sem dados cadastrados</div>';

  var totColor=totBalance>=0?'var(--green)':'var(--red)';
  var sinalTot=totBalance>=0?'+':'-';
  document.getElementById('proj-total').innerHTML=''
    +'<div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr;align-items:center;padding:0 0">'
    +'<span style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase">Total</span>'
    +'<span style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--green);text-align:right">'+fmtN(totIncome)+'</span>'
    +'<span style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--red);text-align:right">'+fmtN(totExpense)+'</span>'
    +'<span style="font-family:var(--mono);font-size:12px;font-weight:600;color:'+totColor+';text-align:right">'+sinalTot+fmtN(Math.abs(totBalance))+'</span>'
    +'</div>'
    +'<div style="margin-top:8px;font-size:11px;color:var(--text3);text-align:right">Inclui itens de orçamento pendentes</div>';

  _syncProjTabActive();
}
