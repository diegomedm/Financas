// appearance-ui.js — UI de Aparência em Configurações (Sub-fase 1a)
// Toggles de tema automático/OLED + seletores de tom (mood) e superfície (surface).
// Ver .claude/specs/fase1a-aparencia-base.md — RN-1a-01 a RN-1a-17.
// Depende de buildTokens/applyLook/getSavedLook/getEffectiveTheme (js/theme.js).

var MOOD_LABELS = {Profundo:'Profundo', Neutro:'Neutro', Quente:'Quente'};
var SURFACE_LABELS = {'Cartões':'Cartões', Minimal:'Minimal', Contraste:'Contraste'};
var ACCENTS = ['#5b8eff','#22c55e','#f97316','#ec4899','#a855f7','#14b8a6'];

// 10 temas prontos — extraídos literalmente do protótipo (Financas App.dc.html)
var THEME_PRESETS = [
  {name:'Meia-noite',theme:'dark',  mood:'Profundo',accent:'#5b8eff',surface:'Cartões',  oled:false},
  {name:'Papel',     theme:'light', mood:'Neutro',  accent:'#5b8eff',surface:'Minimal',  oled:false},
  {name:'Café',      theme:'dark',  mood:'Quente',  accent:'#f97316',surface:'Cartões',  oled:false},
  {name:'Neon',      theme:'dark',  mood:'Neutro',  accent:'#ec4899',surface:'Contraste',oled:false},
  {name:'Breu',      theme:'dark',  mood:'Neutro',  accent:'#14b8a6',surface:'Minimal',  oled:true },
  {name:'Oceano',    theme:'dark',  mood:'Profundo',accent:'#14b8a6',surface:'Cartões',  oled:false},
  {name:'Floresta',  theme:'dark',  mood:'Neutro',  accent:'#22c55e',surface:'Cartões',  oled:false},
  {name:'Rosé',      theme:'light', mood:'Quente',  accent:'#ec4899',surface:'Cartões',  oled:false},
  {name:'Lavanda',   theme:'light', mood:'Profundo',accent:'#a855f7',surface:'Minimal',  oled:false},
  {name:'Âmbar',     theme:'light', mood:'Quente',  accent:'#f97316',surface:'Contraste',oled:false}
];

function onAutoThemeToggle(checked){
  var look = getSavedLook();
  look.autoTheme = checked === true;
  applyLook(look);
  renderAppearanceCfg();
  if(typeof fireThemeRipple==='function')fireThemeRipple();
}

function onOledToggle(checked){
  var look = getSavedLook();
  look.oled = checked === true;
  applyLook(look);
}

function onMoodSelect(mood){
  if(MOODS.indexOf(mood) === -1) return;
  var look = getSavedLook();
  look.mood = mood;
  applyLook(look);
  renderAppearanceCfg();
}

function onSurfaceSelect(surface){
  if(SURFACES.indexOf(surface) === -1) return;
  var look = getSavedLook();
  look.surface = surface;
  applyLook(look);
  renderAppearanceCfg();
}

function onAccentSelect(hex){
  var look = getSavedLook();
  look.accent = hex;
  applyLook(look);
  renderAppearanceCfg();
}

function onHeroStyleSelect(heroStyle){
  if(HERO_STYLES.indexOf(heroStyle) === -1) return;
  var look = getSavedLook();
  look.heroStyle = heroStyle;
  applyLook(look);
  renderAppearanceCfg();
  renderDash();
}

function applyThemePreset(preset){
  if(_presetRowMoved) return;
  var look = getSavedLook();
  look.theme = preset.theme;
  look.mood = preset.mood;
  look.accent = preset.accent;
  look.surface = preset.surface;
  look.oled = !!preset.oled;
  look.autoTheme = false;
  applyLook(look);
  renderAppearanceCfg();
  renderDash();
  if(typeof fireThemeRipple==='function')fireThemeRipple();
  toast('Tema "' + preset.name + '" aplicado', 'var(--blue)');
}

// Drag-sem-capturar-clique na fileira de temas prontos — lógica extraída
// literalmente do protótipo (presetRowDown/Move/Up), threshold de 6px.
var _presetDrag = null;
var _presetRowMoved = false;
var _presetMovedTimer = null;

function presetRowDown(e){
  if(e.pointerType !== 'mouse') return;
  _presetDrag = {x: e.clientX, sl: e.currentTarget.scrollLeft};
}
function presetRowMove(e){
  if(!_presetDrag || e.buttons !== 1) return;
  var dx = e.clientX - _presetDrag.x;
  if(Math.abs(dx) > 6) _presetRowMoved = true;
  e.currentTarget.scrollLeft = _presetDrag.sl - dx;
}
function presetRowUp(){
  _presetDrag = null;
  if(_presetRowMoved){
    clearTimeout(_presetMovedTimer);
    _presetMovedTimer = setTimeout(function(){ _presetRowMoved = false; }, 120);
  }
}

function _appearanceOptionButton(value, label, isActive, onclickFn){
  var activeStyle = isActive
    ? 'background:var(--blue);color:#fff;border-color:var(--blue)'
    : 'background:var(--bg3);color:var(--text2);border-color:var(--border)';
  return '<button type="button" class="btn btn-sm appearance-opt-btn" style="flex:1;border:1px solid;' + activeStyle + '" onclick="' + onclickFn + '(\'' + value + '\')">' + label + '</button>';
}

function _accentSwatch(hex, isActive){
  var check = isActive
    ? '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:#fff;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '';
  return '<button type="button" class="accent-swatch-btn" style="width:30px;height:30px;border-radius:50%;background:' + hex + ';border:2px solid var(--bg2);box-shadow:0 0 0 2px ' + hex + ';cursor:pointer;transition:transform .12s;flex-shrink:0;display:flex;align-items:center;justify-content:center" onclick="onAccentSelect(\'' + hex + '\')">' + check + '</button>';
}

function _heroStyleChip(value, isActive){
  var style = isActive
    ? 'padding:7px 13px;border-radius:20px;background:var(--blue);color:#fff;font-size:12px;font-weight:600;border:none;cursor:pointer;white-space:nowrap;transition:all .15s'
    : 'padding:7px 13px;border-radius:20px;background:transparent;border:1px solid var(--border);color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s';
  return '<button type="button" class="appearance-opt-btn" style="' + style + '" onclick="onHeroStyleSelect(\'' + value + '\')">' + value + '</button>';
}

function _presetCard(preset, isActive){
  var ramps = preset.theme === 'dark' ? DARK_RAMPS : LIGHT_RAMPS;
  var R = ramps[preset.mood] || ramps.Profundo;
  var bg = preset.oled ? '#000000' : R['--bg2'];
  var fg = R['--text'];
  var ring = isActive ? preset.accent : R['--border2'];
  return '<button type="button" style="flex-shrink:0;width:74px;height:68px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:' + bg + ';border:1.5px solid ' + ring + ';border-radius:12px;padding:6px 4px;cursor:pointer;transition:transform .12s,border-color .2s" onclick="applyThemePreset(THEME_PRESETS[' + THEME_PRESETS.indexOf(preset) + '])">'
    + '<span style="width:15px;height:15px;border-radius:50%;background:' + preset.accent + ';flex-shrink:0"></span>'
    + '<span style="font-size:10px;font-weight:600;color:' + fg + ';text-align:center;line-height:1.15;white-space:normal;word-break:break-word;max-width:100%">' + preset.name + '</span>'
    + '</button>';
}

function renderAppearanceCfg(){
  var moodRow = document.getElementById('appearance-mood-row');
  var surfaceRow = document.getElementById('appearance-surface-row');
  var heroRow = document.getElementById('appearance-hero-row');
  var presetsRow = document.getElementById('appearance-presets-row');
  var accentRow = document.getElementById('appearance-accent-row');
  var autoToggle = document.getElementById('toggle-auto-theme');
  var oledToggle = document.getElementById('toggle-oled');
  if(!moodRow && !surfaceRow && !heroRow && !presetsRow && !accentRow && !autoToggle && !oledToggle) return;

  var look = getSavedLook();

  if(autoToggle) autoToggle.checked = look.autoTheme === true;
  if(oledToggle) oledToggle.checked = look.oled === true;

  if(accentRow){
    accentRow.innerHTML = ACCENTS.map(function(hex){
      return _accentSwatch(hex, look.accent === hex);
    }).join('');
  }

  if(moodRow){
    moodRow.innerHTML = MOODS.map(function(m){
      return _appearanceOptionButton(m, MOOD_LABELS[m], look.mood === m, 'onMoodSelect');
    }).join('');
  }

  if(surfaceRow){
    surfaceRow.innerHTML = SURFACES.map(function(s){
      return _appearanceOptionButton(s, SURFACE_LABELS[s], look.surface === s, 'onSurfaceSelect');
    }).join('');
  }

  if(heroRow){
    heroRow.innerHTML = HERO_STYLES.map(function(hs){
      return _heroStyleChip(hs, (look.heroStyle || 'Gradiente') === hs);
    }).join('');
  }

  if(presetsRow){
    presetsRow.setAttribute('onpointerdown', 'presetRowDown(event)');
    presetsRow.setAttribute('onpointermove', 'presetRowMove(event)');
    presetsRow.setAttribute('onpointerup', 'presetRowUp(event)');
    presetsRow.setAttribute('onpointerleave', 'presetRowUp(event)');
    presetsRow.innerHTML = THEME_PRESETS.map(function(p){
      var active = !look.autoTheme && look.theme === p.theme && look.mood === p.mood &&
        look.accent === p.accent && look.surface === p.surface && !!look.oled === !!p.oled;
      return _presetCard(p, active);
    }).join('');
  }
}
