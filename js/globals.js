const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ICONS={income:'💵',fixed:'🏠',variable:'🛒',credit:'💳'};
const CAT_LABELS={income:'Receita',fixed:'Despesa Fixa',variable:'Despesa Variável',credit:'Cartão de Crédito'};
let _refM=parseInt(localStorage.getItem('refMonth')),_refY=parseInt(localStorage.getItem('refYear'));
const refMonth=isNaN(_refM)?new Date().getMonth():_refM;
const refYear=isNaN(_refY)?new Date().getFullYear():_refY;
let db, curMonth=refMonth, curYear=refYear, txFilter='all';
let budgetMonth=new Date().getMonth(), budgetYear=new Date().getFullYear();
let deferredInstall=null;
let pessoaFilter=null;
let projPeriods=(function(){var v=parseInt(localStorage.getItem('projPeriods'));return(v===3||v===6||v===12)?v:3;}());
let _numpadExpr='', _numpadTarget=null, _numpadResolve=null;
let _dbCache={};
function invalidateCache(store){delete _dbCache[store];}
function invalidateAllCache(){_dbCache={};}
let txSearch='';
let hideValues=localStorage.getItem('financas-hide-values')==='1';
let fabOpen=false;
// swipe state (Fase 2 — swipe em lançamentos)
let _swX=null,_swY=null,_swMoved=false,_swIgnore=false;
let swipeOpen={};
let swipeClosing={};
let _swCloseTimers={};
