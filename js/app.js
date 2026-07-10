function setupManifest(){
  const m={name:'Finanças Pessoais',short_name:'Finanças',start_url:location.href,display:'standalone',background_color:'#0d0f1a',theme_color:'#0d0f1a',icons:[{src:'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%235b8eff%22/><text y=%22.9em%22 font-size=%2270%22 x=%2212%22>💰</text></svg>',sizes:'192x192',type:'image/svg+xml'}]};
  const blob=new Blob([JSON.stringify(m)],{type:'application/json'});
  document.getElementById('pwa-manifest').href=URL.createObjectURL(blob);
}
setupManifest();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;document.getElementById('install-banner').classList.add('show')});
window.addEventListener('appinstalled',()=>{document.getElementById('install-banner').classList.remove('show');toast('App instalado! 🎉','var(--green)');deferredInstall=null});
function installPWA(){if(deferredInstall){deferredInstall.prompt();deferredInstall.userChoice.then(()=>deferredInstall=null)}}

if('serviceWorker' in navigator){
  const base=location.pathname.replace(/\/[^/]*$/,'/');
  navigator.serviceWorker.register(base+'sw.js',{scope:base})
    .then(reg=>{
      reg.addEventListener('updatefound',()=>{
        const sw=reg.installing;
        sw.addEventListener('statechange',()=>{
          if(sw.state==='installed'&&navigator.serviceWorker.controller)
            toast('Nova versão disponível — recarregue','var(--amber)');
        });
      });
    }).catch(e=>console.warn('[SW]',e));
}

function toggleTheme(dark){
  var look=getSavedLook();
  look.theme=dark?'dark':'light';
  look.autoTheme=false; // RN-1a-11: toggle manual sempre desliga o tema automático
  applyLook(look);
  if(typeof fireThemeRipple==='function')fireThemeRipple();
}

function showPageCfg(){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  var pageEl=document.getElementById('page-cfg');
  pageEl.classList.add('active');
  pageEl.style.animation=_screenEnterAnim('cfg')+' .32s cubic-bezier(.16,1,.3,1) both';
  document.body.classList.add('cfg-open');
  applyLook(getSavedLook()); // RN-1a-14: recalcula tema efetivo (autoTheme) ao abrir Configurações
  renderCfg();
}
function closeCfg(){
  document.body.classList.remove('cfg-open');
  showPage('dash',document.querySelector('.nav-btn'));
}

// Fase 4 — tela de Relatório mensal, acessada só pelo link do Dashboard (fora da bottom nav,
// mesmo padrão de "página com botão Voltar" já usado em Configurações).
function goReport(){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  var pageEl=document.getElementById('page-report');
  pageEl.classList.add('active');
  pageEl.style.animation=_screenEnterAnim('report')+' .32s cubic-bezier(.16,1,.3,1) both';
  document.body.classList.add('cfg-open');
  if(typeof renderReport==='function')renderReport();
}
function goDashFromReport(){
  document.body.classList.remove('cfg-open');
  showPage('dash',document.querySelector('.nav-btn'));
}
var _PAGE_ORDER=['dash','tx','cards','proj','budget','cfg','report'];
var _lastPageId='dash';
function _screenEnterAnim(id){
  var oi=_PAGE_ORDER.indexOf(_lastPageId),ni=_PAGE_ORDER.indexOf(id);
  _lastPageId=id;
  return ni>=oi?'screenInR':'screenInL';
}
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  var pageEl=document.getElementById('page-'+id);
  pageEl.classList.add('active');
  pageEl.style.animation=_screenEnterAnim(id)+' .32s cubic-bezier(.16,1,.3,1) both';
  btn.classList.add('active');
  if(typeof navBounceIcon==='function')navBounceIcon(btn); // FASE 6 — micro-bounce no ícone do nav
  fabOpen=false;
  if(id==='dash')renderDash();
  else if(id==='tx')renderTx();
  else if(id==='cards')renderCards();
  else if(id==='proj')_renderProjCurrentView();
  else if(id==='budget')renderBudget();
  else if(id==='cfg')renderCfg();
  renderFab();
}

// Fase 4 — respeita o toggle Mensal/Dia a dia da Projeção ao (re)abrir a tela.
function _renderProjCurrentView(){
  if(typeof renderProjViewToggle==='function')renderProjViewToggle();
  if(typeof projView!=='undefined'&&projView==='daily'){renderProjDaily();}
  else{renderProj();}
}
function changeMonth(d){
  curMonth+=d;if(curMonth<0){curMonth=11;curYear--}if(curMonth>11){curMonth=0;curYear++}
  renderAll();
}
function setRefMonth(){
  localStorage.setItem('refMonth',curMonth);
  localStorage.setItem('refYear',curYear);
  updateMonthLabels();
  toast(MONTHS[curMonth]+' '+curYear+' definido como mês atual','var(--teal)');
}
function isCurrentRef(){
  var rm=parseInt(localStorage.getItem('refMonth')),ry=parseInt(localStorage.getItem('refYear'));
  if(isNaN(rm)||isNaN(ry)){var n=new Date();rm=n.getMonth();ry=n.getFullYear();}
  return curMonth===rm&&curYear===ry;
}
function _renderPinnableMonthLabel(id){
  const el=document.getElementById(id);
  if(!el)return;
  const showPin=!isCurrentRef();
  el.classList.toggle('pinnable',showPin);
  el.title=showPin?'Definir como mês atual':'';
  el.innerHTML=MONTHS[curMonth].substring(0,3)
    +(showPin?'<svg viewBox="0 0 24 24"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V16h14v-.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1z"/></svg>':'');
}
function updateMonthLabels(){
  const ml=document.getElementById('tx-month-label');
  if(ml)ml.textContent=MONTHS[curMonth]+' de '+curYear;
  // Botão de pin: visível apenas quando mês navegado != mês de referência
  document.querySelectorAll('.set-ref-btn').forEach(function(btn){
    btn.style.visibility=isCurrentRef()?'hidden':'visible';
  });
  // Dashboard, Lançamentos, Cartões, Orçamento e Projeção (mensal e dia a dia): pin embutido no próprio label do mês (fiel ao protótipo)
  _renderPinnableMonthLabel('month-label-dash');
  _renderPinnableMonthLabel('month-label-tx');
  _renderPinnableMonthLabel('month-label-cards');
  _renderPinnableMonthLabel('month-label-budget');
  _renderPinnableMonthLabel('month-label-proj');
  _renderPinnableMonthLabel('month-label-proj-daily');
}

async function renderAll(){

  try{
    updateMonthLabels();
    const p=document.querySelector('.page.active');
    if(!p)return;
    if(p.id==='page-dash')renderDash();
    else if(p.id==='page-tx')renderTx();
    else if(p.id==='page-cards')renderCards();
    else if(p.id==='page-proj')_renderProjCurrentView();
    else if(p.id==='page-budget')renderBudget();
    renderFab();

  }catch(e){
    console.error('[renderAll]',e);
    toast('Erro ao renderizar','var(--red)');
  }
}

// ── FAB speed dial (Fase 2, seção 1) ──
// fabOpen é toggle simples de estado (var global em globals.js). A opção contextual
// da tela atual vem primeiro na lista e recebe estilo azul sólido (rowStyle).
function _currentPageId(){
  const p=document.querySelector('.page.active');
  return p?p.id.replace('page-',''):'dash';
}
function _fabContextKey(){
  const page=_currentPageId();
  if(page==='budget')return'budget';
  if(page==='cards')return'gasto';
  return'tx';
}
function openAdd(){fabOpen=!fabOpen;renderFab();}
function closeFab(){fabOpen=false;renderFab();}
function fabAction(fn){fabOpen=false;renderFab();setTimeout(fn,60);}

function openTxFab(){showAddModal();}
function openBudgetFab(){if(typeof showBudgetAddModal==='function')showBudgetAddModal(null);}
async function openGastoFab(){
  try{
    const cartoes=await cartoesAll();
    const cartao=cartoes.length?cartoes[0]:null;
    if(!cartao){toast('Cadastre um cartão primeiro','var(--amber)');return;}
    showAddGastoModal(cartao.id,cartao,null);
  }catch(e){
    console.error('[openGastoFab]',e);
    toast('Erro ao abrir gasto de cartão','var(--red)');
  }
}
async function repeatLast(){
  try{
    const all=await dbAll();
    if(!all.length){toast('Nenhum lançamento ainda','var(--amber)');return;}
    const last=[...all].sort((a,b)=>b.id-a.id)[0];
    const draft={
      id:null,
      name:last.name,
      value:last.value,
      rawExpr:null,
      type:last.type,
      date:'',
      paidDate:'',
      month:curMonth,
      year:curYear,
      obs:'',
      subitems:[],
      pessoaId:last.pessoaId||null,
      categoriaId:last.categoriaId||null
    };
    _openTxModalWith(draft);
  }catch(e){
    console.error('[repeatLast]',e);
    toast('Erro ao repetir lançamento','var(--red)');
  }
}

// Modo privacidade (Fase 2, seção 4) — ícone de olho no card "Saldo" do dashboard.
// toggleHideValues() está em utils.js (transversal); aqui só sincronizamos o ícone visual.
function updateHideValuesIcon(){
  const el=document.getElementById('hide-values-icon');
  if(!el)return;
  el.innerHTML=hideValues
    ?'<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:var(--blue);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    :'<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:var(--text2);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

function updateFabIconRotation(){
  const icon=document.getElementById('fab-icon');
  if(!icon)return;
  const modalOpen=document.getElementById('modal-overlay')?.classList.contains('open');
  icon.style.transform=(modalOpen||fabOpen)?'rotate(45deg)':'rotate(0deg)';
}

function renderFab(){
  const root=document.getElementById('fab-root');
  if(!root)return;
  const ctx=_fabContextKey();
  const opts=[
    {key:'tx',label:'Novo lançamento',icon:'tx',onClick:'fabAction(openTxFab)'},
    {key:'budget',label:'Item de orçamento',icon:'budget',onClick:'fabAction(openBudgetFab)'},
    {key:'gasto',label:'Gasto de cartão',icon:'card',onClick:'fabAction(openGastoFab)'},
    {key:'repeat',label:'Repetir último',icon:'repeat',onClick:'fabAction(repeatLast)'}
  ];
  opts.sort((a,b)=>(a.key===ctx?-1:0)-(b.key===ctx?-1:0));
  const ICONS_SVG={
    tx:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
    budget:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
    card:'<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    repeat:'<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>'
  };
  const menuHtml=fabOpen?(
    '<div onclick="closeFab()" style="position:absolute;inset:0;z-index:39;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);animation:fadeBg .18s ease"></div>'
    +'<div style="position:absolute;right:16px;bottom:140px;z-index:41;display:flex;flex-direction:column;align-items:flex-end;gap:8px">'
    +opts.map(function(o,i){
      const isPrimary=o.key===ctx;
      const delay=((opts.length-1-i)*40)+'ms';
      const rowStyle=isPrimary?'background:var(--blue);color:#fff;border:none':'background:var(--bg3);color:var(--text);border:1px solid var(--border2)';
      return '<button onclick="'+o.onClick+'" class="fab-menu-btn" style="display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:\'DM Sans\',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);animation:listItemIn .26s cubic-bezier(.16,1,.3,1) both;animation-delay:'+delay+';transition:transform .12s;'+rowStyle+'">'
        +'<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round">'+ICONS_SVG[o.icon]+'</svg>'
        +o.label
        +'</button>';
    }).join('')
    +'</div>'
  ):'';
  // O botão principal (FAB) é mantido fixo no DOM entre renders — recriar o <svg id="fab-icon">
  // a cada toggle do menu impede a transition de rotate() rodar (o elemento nasce já na posição
  // final). Só o menu (que realmente entra/sai) é recriado via innerHTML.
  let menuRoot=document.getElementById('fab-menu-root');
  let mainBtn=document.getElementById('fab-main-btn-el');
  if(!mainBtn){
    root.innerHTML=
      '<div id="fab-menu-root"></div>'
      +'<button id="fab-main-btn-el" onclick="openAdd()" class="fab-main-btn" style="position:absolute;right:16px;bottom:78px;z-index:40;width:52px;height:52px;border-radius:17px;background:var(--blue);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 24px -4px var(--blue-border),0 4px 12px rgba(0,0,0,.3);transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .2s">'
      +'<svg id="fab-icon" viewBox="0 0 24 24" style="width:26px;height:26px;stroke:#fff;fill:none;stroke-width:2.2;stroke-linecap:round;transition:transform .3s cubic-bezier(.34,1.56,.64,1)">'
      +'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
      +'</svg></button>';
    menuRoot=document.getElementById('fab-menu-root');
  }
  menuRoot.innerHTML=menuHtml;
  updateFabIconRotation();
}

async function init(){
  try{
    applyLook(getSavedLook());
    db=await openDB();
    updateMonthLabels();
    await renderPersonFilterBars();
    renderDash();
    renderFab();
    updateHideValuesIcon();
    if(typeof hideSplashScreen==='function')hideSplashScreen(); // FASE 6 — splash screen (~1650ms)
  }catch(err){
    document.body.innerHTML='<div style="padding:40px;text-align:center;color:#f87171"><h2>Erro ao abrir banco</h2><p style="margin-top:10px;font-size:14px">'+err.message+'</p></div>';
  }
}
init();