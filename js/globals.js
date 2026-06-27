const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ICONS={income:'💵',fixed:'🏠',variable:'🛒',credit:'💳'};
const CAT_LABELS={income:'Receita',fixed:'Despesa Fixa',variable:'Despesa Variável',credit:'Cartão de Crédito'};
let db, curMonth=new Date().getMonth(), curYear=new Date().getFullYear(), txFilter='all';
let budgetMonth=new Date().getMonth(), budgetYear=new Date().getFullYear();
let deferredInstall=null;
let pessoaFilter=null;
let projPeriods=(function(){var v=parseInt(localStorage.getItem('projPeriods'));return(v===3||v===6||v===12)?v:3;}());
let _numpadExpr='', _numpadTarget=null, _numpadResolve=null;
let _dbCache={};
function invalidateCache(store){delete _dbCache[store];}
function invalidateAllCache(){_dbCache={};}
let _chartComposition=null;
let _chartHistory=null;
