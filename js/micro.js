/* ══════════════════════════════════════════════════════════════════════
   FASE 6 — Microinterações e onboarding
   Fonte: .claude/discovery/extracted-specs-fase56.md (seções "FASE 6")
   Este módulo adiciona funcionalidades novas sem alterar o corpo de funções
   já existentes em outros arquivos, exceto:
   - toast() em js/utils.js: recebeu 2 linhas extras (flash sincronizado),
     chamadas existentes continuam funcionando sem mudança de assinatura.
   - js/app.js: recebeu 1-2 linhas para disparar o splash na inicialização.
   ══════════════════════════════════════════════════════════════════════ */

/* ── 2) Flash de cor sincronizado com o toast (E16) ──
   fireFlash(color) é chamado a partir de toast() (utils.js). Duração 520ms,
   com contador de geração para não deixar um flash antigo cancelar um novo. */
var _flashGen=_flashGen||0;
function fireFlash(color){
  const el=document.getElementById('flash-overlay');
  if(!el)return;
  _flashGen=(_flashGen||0)+1;
  const gen=_flashGen;
  el.style.boxShadow='inset 0 0 0 3px '+color+',inset 0 0 44px 2px '+color;
  el.classList.remove('on');
  // força reflow para reiniciar a animação CSS mesmo com a mesma cor
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(window._flashTimer);
  window._flashTimer=setTimeout(()=>{
    if(_flashGen===gen)el.classList.remove('on');
  },520);
}

/* ── 6) Ripple de tema (G4) ──
   fireThemeRipple() chamável de qualquer lugar. Integração no botão de toggle
   de tema NÃO foi feita aqui (js/theme.js e js/appearance-ui.js são de outro
   escopo desta sessão — ver TODO ao final deste arquivo). */
var _revealGen=_revealGen||0;
function fireThemeRipple(){
  const el=document.getElementById('theme-ripple-overlay');
  if(!el)return;
  _revealGen=(_revealGen||0)+1;
  const gen=_revealGen;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(window._revealTimer);
  window._revealTimer=setTimeout(()=>{
    if(_revealGen===gen)el.classList.remove('on');
  },680);
}

/* ── 1) Pull-to-refresh customizado ──
   Fórmulas exatas da spec: threshold 48px, resistência dy*0.5 capada em 84px.
   Adaptação de arquitetura: o protótipo usa um container `.ph-scroll` próprio;
   este app usa o body como scroller principal (sem container de scroll dedicado
   dentro de cada .page). Os handlers abaixo usam window.scrollY no lugar de
   scrollTop e são registrados no document — mesmas fórmulas/timings, mesmo
   comportamento (tracking só ativa no topo da página, cancela se o gesto for
   mais horizontal que vertical, etc). */
var _pullStartY=null,_pullStartX=null,_pullTracking=false,_pullY=0,_refreshing=false;

function _ptrIndicatorUpdate(){
  const wrap=document.getElementById('ptr-indicator');
  const icon=document.getElementById('ptr-icon');
  if(!wrap||!icon)return;
  const pullPct=Math.min(1,_pullY/48);
  const pullOpacity=_refreshing?1:pullPct;
  const pullRotate=_refreshing?0:Math.round(pullPct*220);
  const pullIconColor=(pullPct>=1||_refreshing)?'var(--blue)':'var(--text3)';
  wrap.style.top=_pullY+'px';
  const inner=wrap.firstElementChild;
  if(inner)inner.style.opacity=String(pullOpacity);
  icon.style.stroke=pullIconColor;
  icon.style.transform='rotate('+pullRotate+'deg)';
  icon.style.animation=_refreshing?'spinCW .7s linear infinite':'none';
}

function mainPtrDown(e){
  _pullStartY=e.clientY;
  _pullStartX=e.clientX;
  _pullTracking=window.scrollY<=0&&!_refreshing;
}
function mainPtrMove(e){
  if(!_pullTracking)return;
  const dy=e.clientY-_pullStartY,dx=e.clientX-_pullStartX;
  if(dy<=4||Math.abs(dx)>Math.abs(dy)){
    if(_pullY!==0){_pullY=0;_ptrIndicatorUpdate();}
    return;
  }
  if(window.scrollY>0){_pullTracking=false;_pullY=0;_ptrIndicatorUpdate();return;}
  _pullY=Math.min(84,dy*0.5);
  _ptrIndicatorUpdate();
}
function mainPtrUp(){
  if(!_pullTracking)return;
  _pullTracking=false;
  if(_pullY>=48){
    _refreshing=true;_pullY=60;_ptrIndicatorUpdate();
    setTimeout(()=>{
      _refreshing=false;_pullY=0;_ptrIndicatorUpdate();
      toast('Atualizado!','var(--green)');
      if(typeof renderAll==='function')renderAll();
    },900);
  }else{
    _pullY=0;_ptrIndicatorUpdate();
  }
}

function _initPullToRefresh(){
  document.addEventListener('pointerdown',mainPtrDown,{passive:true});
  document.addEventListener('pointermove',mainPtrMove,{passive:true});
  document.addEventListener('pointerup',mainPtrUp,{passive:true});
  document.addEventListener('pointercancel',mainPtrUp,{passive:true});
}

/* ── 3) Estados vazios ilustrados com CTA ──
   Helper compartilhado — reaproveitado pelas 3 telas em escopo desta fase
   (Cartões, Categorias orçadas, Orçamento; Lançamentos e Calendário já têm
   seus próprios empty states implementados por Fases 2/4, fora deste escopo). */
function emptyCtaHtml(icon,title,sub,ctaLabel,onClick,compact){
  const iconSize=compact?'44px':'52px';
  const iconFont=compact?'20px':'24px';
  const titleFont=compact?'13px':'14px';
  const subFont=compact?'11px':'12px';
  const subMaxW=compact?'200px':'220px';
  const padding=compact?'20px 10px':'36px 20px';
  return '<div style="text-align:center;padding:'+padding+'">'+
    '<div class="empty-cta-icon" style="width:'+iconSize+';height:'+iconSize+';font-size:'+iconFont+'">'+icon+'</div>'+
    '<div class="empty-cta-title" style="font-size:'+titleFont+'">'+title+'</div>'+
    '<div class="empty-cta-sub" style="font-size:'+subFont+';max-width:'+subMaxW+'">'+sub+'</div>'+
    (ctaLabel?'<button class="empty-cta-btn" onclick="'+onClick+'">'+ctaLabel+'</button>':'')+
    '</div>';
}

/* Cartões — texto exato da spec. */
function emptyStateCartoesHtml(){
  return emptyCtaHtml('💳','Nenhum cartão neste filtro','Cadastre um cartão pra acompanhar a fatura por aqui','+ Novo cartão','showAddCartaoModal()');
}
/* Categorias orçadas — texto exato da spec (versão compacta/sub-seção). */
function emptyStateCategoriasHtml(){
  return emptyCtaHtml('🏷️','Nenhuma categoria orçada ainda','Crie categorias como "Mercado" pra acompanhar o quanto gasta em cada uma','+ Nova categoria','showAddCategoriaModal()',true);
}
/* Orçamento (itens) — texto exato da spec. */
function emptyStateBudgetHtml(){
  return emptyCtaHtml('🎯','Nenhum item de orçamento neste filtro','Adicione fixas, variáveis e receitas planejadas pro mês','+ Novo item','showBudgetAddModal()');
}
/* Lançamentos — texto exato da spec. */
function emptyStateTxHtml(){
  return emptyCtaHtml('🗂️','Nenhum lançamento neste filtro','Ajuste os filtros acima ou registre um novo lançamento','+ Novo lançamento','showAddModal()');
}
/* Calendário — texto exato da spec. */
function emptyStateCalendarioHtml(){
  return emptyCtaHtml('📅','Nenhum lançamento com data neste mês','Lançamentos com data aparecem marcados no calendário','+ Novo lançamento','showAddModal()');
}

/* ── 4) Tour guiado (4 balões) — textos EXATOS da spec ── */
const TOUR_STEPS=[
  {icon:'👋',title:'Bem-vindo ao Finanças!',text:'Um tour rápido pelos recursos principais — leva 20 segundos.',page:'dash'},
  {icon:'➕',title:'Botão de ação rápida',text:'Toque no botão azul flutuante, no canto inferior direito, para criar um lançamento, orçamento ou gasto de cartão na hora.',page:'dash'},
  {icon:'🎚️',title:'Filtros de pessoa e período',text:'Use as pílulas coloridas para ver só os gastos de uma pessoa, e as setas ‹ › para trocar de mês.',page:'dash'},
  {icon:'👈',title:'Arraste para agir rápido',text:'Arraste qualquer lançamento para a esquerda para editar ou excluir sem abrir tela nenhuma.',page:'tx'},
];
var tourStep=null;

function _renderTourStep(){
  const overlay=document.getElementById('tour-overlay');
  if(!overlay)return;
  if(tourStep==null){overlay.classList.remove('open');return;}
  const step=TOUR_STEPS[tourStep];
  document.getElementById('tour-icon').textContent=step.icon;
  document.getElementById('tour-title').textContent=step.title;
  document.getElementById('tour-text').textContent=step.text;
  document.getElementById('tour-next-btn').textContent=(tourStep===TOUR_STEPS.length-1)?'Concluir':'Próximo';
  document.getElementById('tour-dots').innerHTML=TOUR_STEPS.map((_,i)=>{
    const active=i===tourStep;
    return '<div style="width:'+(active?'20px':'6px')+';height:6px;border-radius:3px;background:'+(active?'var(--blue)':'var(--bg4)')+';transition:all .25s"></div>';
  }).join('');
  overlay.classList.add('open');
}
function startTour(){
  tourStep=0;
  const step=TOUR_STEPS[0];
  const btn=document.querySelector('.nav-btn:nth-child(1)');
  if(document.body.classList.contains('cfg-open'))closeCfg();
  if(typeof showPage==='function'&&btn)showPage(step.page,btn);
  _renderTourStep();
}
function nextTourStep(){
  const n=tourStep+1;
  if(n>=TOUR_STEPS.length){tourStep=null;_renderTourStep();return;}
  const step=TOUR_STEPS[n];
  tourStep=n;
  if(step.page&&typeof showPage==='function'){
    const idx=step.page==='dash'?1:step.page==='tx'?2:step.page==='cards'?3:step.page==='proj'?4:5;
    const btn=document.querySelector('.nav-btn:nth-child('+idx+')');
    if(btn)showPage(step.page,btn);
  }
  _renderTourStep();
}
function skipTour(){
  tourStep=null;
  _renderTourStep();
}

/* ── 5) Splash screen (~1650ms) ──
   Integração mínima em js/app.js: apenas a chamada hideSplashScreen() no init(). */
function hideSplashScreen(){
  setTimeout(()=>{
    const el=document.getElementById('splash-screen');
    if(el)el.classList.add('hide');
    setTimeout(()=>{if(el)el.style.display='none';},450);
  },1650);
}

/* ── 7) Micro-bounce no ícone do nav ao trocar de aba ──
   navBounceIcon(navBtn) aplica a animação no <svg> do botão de navegação
   informado. Chamado a partir de showPage() (app.js) — ver integração abaixo,
   feita via wrapper para não reescrever a função inteira. */
function navBounceIcon(btn){
  if(!btn)return;
  const svg=btn.querySelector('svg');
  if(!svg)return;
  svg.style.animation='none';
  void svg.offsetWidth;
  svg.style.animation='navBounce .42s cubic-bezier(.34,1.56,.64,1)';
}

/* ── 8) Dígitos "slot machine" no saldo do Dashboard ──
   renderSlotDigits(valorFormatado) recebe a string já formatada (ex: "+R$ 1.234,56")
   e retorna o HTML com a técnica de rolo (column-roll) por dígito. Não é chamado
   automaticamente sobre o card de saldo existente (renderDash() já usa fmt()
   diretamente em innerHTML de #summary-cards, ver transactions.js) — função fica
   pronta/exportada para uso futuro sem duplicar a lógica de cálculo do saldo.
   CUIDADO (conforme instrução): o card de saldo já foi tocado nas Fases 2/3
   (classe .stat-value, gradiente --hero-bg) — não sobrescrevemos aqui. */
function renderSlotDigits(valorFormatado){
  const chars=String(valorFormatado).split('');
  return chars.map(ch=>{
    const di='0123456789'.indexOf(ch);
    if(di>=0){
      let strip='';
      for(let n=0;n<=9;n++)strip+='<span>'+n+'</span>';
      return '<span class="slot-digit-window"><span class="slot-digit-strip" style="transform:translateY(-'+di+'em)">'+strip+'</span></span>';
    }
    return '<span style="display:inline-block;height:1em">'+ch+'</span>';
  }).join('');
}

/* ── 9) Ícones por categoria orçada ──
   Lista exata de emojis da spec (20 itens, ordem exata). Grid picker é montado
   por buildCatIconPickerHtml() e chamado a partir do modal de categoria em
   js/budget.js (showAddCategoriaModal/showEditCategoriaModal) — ver integração
   cirúrgica feita diretamente em budget.js (campo icon opcional). */
const CAT_ICONS=['🛒','⛽','🍽️','🏠','💊','🎓','🎮','👕','🚗','🐶','✈️','🎁','📱','💡','🏋️','☕','🎬','🧾','💳','🎵'];

function _catIconGridInnerHtml(selectedIcon){
  return CAT_ICONS.map(ic=>{
    const isSel=selectedIcon===ic;
    const style=isSel
      ?'aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--blue-bg);border:1.5px solid var(--blue);border-radius:8px;cursor:pointer;padding:0;transition:transform .1s'
      :'aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--bg4);border:1px solid var(--border2);border-radius:8px;cursor:pointer;padding:0;transition:transform .1s';
    return '<button type="button" class="cat-icon-btn" onclick="toggleCatIcon(\''+ic+'\')" style="'+style+'">'+ic+'</button>';
  }).join('');
}
function buildCatIconPickerHtml(selectedIcon){
  _catIconSelected=selectedIcon||null;
  return '<div class="form-group">'+
    '<label style="display:block;font-size:12px;color:var(--text2);margin-bottom:5px;font-weight:500">Ícone</label>'+
    '<div style="display:grid;grid-template-columns:repeat(10,1fr);gap:5px" id="cat-icon-grid">'+_catIconGridInnerHtml(selectedIcon)+'</div>'+
    '</div>';
}
/* Estado do ícone selecionado no modal de categoria (memória de sessão, lido por
   js/budget.js ao salvar). Alterna: clique no já selecionado desmarca. */
var _catIconSelected=null;
function toggleCatIcon(ic){
  _catIconSelected=(_catIconSelected===ic)?null:ic;
  const grid=document.getElementById('cat-icon-grid');
  if(grid)grid.innerHTML=_catIconGridInnerHtml(_catIconSelected);
}

function _initMicro(){
  _initPullToRefresh();
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',_initMicro);
}else{
  _initMicro();
}

/* ══════════════════════════════════════════════════════════════════════
   TODO (fora de escopo desta sessão — documentado conforme instrução):
   - Integrar fireThemeRipple() diretamente no botão de toggle de tema.
     js/theme.js e js/appearance-ui.js pertencem a outra fase em paralelo
     (Fase 1/Aparência) nesta mesma sessão; a função está pronta e pode ser
     chamada de dentro de toggleTheme()/toggleAutoTheme()/applyPreset() com
     uma única linha (fireThemeRipple();) assim que esses arquivos estiverem
     livres para edição.
   ══════════════════════════════════════════════════════════════════════ */
