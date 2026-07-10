// theme.js — Fundação Visual (Fase 0) + Aparência Base (Sub-fase 1a)
// Composição e aplicação de tokens de aparência (tema/tom/superfície/accent/OLED/autoTheme).
// Ver .claude/specs/fase0-fundacao-visual.md (RN-01 a RN-14) e
// .claude/specs/fase1a-aparencia-base.md (RN-1a-01 a RN-1a-17).

var DARK_RAMPS = {
  Profundo: {
    '--bg':'#0d0f1a','--bg2':'#151829','--bg3':'#1c2038','--bg4':'#242848',
    '--border':'#323760','--border2':'#3e4470',
    '--text':'#eef0ff','--text2':'#9ba3d4','--text3':'#5a6294'
  },
  Neutro: {
    '--bg':'#101012','--bg2':'#18181b','--bg3':'#202023','--bg4':'#2a2a2e',
    '--border':'#34343a','--border2':'#45454d',
    '--text':'#f0f0f2','--text2':'#a8a8b0','--text3':'#66666e'
  },
  Quente: {
    '--bg':'#14100c','--bg2':'#1d1813','--bg3':'#251f18','--bg4':'#2f2820',
    '--border':'#3d3328','--border2':'#4c4030',
    '--text':'#f4efe8','--text2':'#b8a890','--text3':'#6e6354'
  }
};

var LIGHT_RAMPS = {
  Profundo: {
    '--bg':'#f5f6fa','--bg2':'#ffffff','--bg3':'#f0f1f8','--bg4':'#e8eaf5',
    '--border':'#d0d4ea','--border2':'#bcc0dc',
    '--text':'#1a1d36','--text2':'#5a6090','--text3':'#9499c0'
  },
  Neutro: {
    '--bg':'#f5f5f6','--bg2':'#ffffff','--bg3':'#f1f1f3','--bg4':'#e8e8ea',
    '--border':'#dcdce0','--border2':'#c6c6cc',
    '--text':'#1c1c1f','--text2':'#5e5e66','--text3':'#9a9aa2'
  },
  Quente: {
    '--bg':'#faf7f2','--bg2':'#ffffff','--bg3':'#f5f0e8','--bg4':'#ece4d8',
    '--border':'#e0d6c6','--border2':'#ccc0ac',
    '--text':'#241f18','--text2':'#6e6354','--text3':'#a89a86'
  }
};

var DARK_SEM = {
  '--green':'#3ddc84','--green-bg':'#0d2e1e','--green-border':'#1a4a2a',
  '--red':'#ff6b6b','--red-bg':'#2e0d0d','--red-border':'#4a1a1a',
  '--amber':'#ffb547','--amber-bg':'#2e1f0d','--amber-border':'#4a2a0d',
  '--purple':'#a78bfa','--purple-bg':'#1a0d3d','--purple-border':'#2a1a4a',
  '--teal':'#2dd4bf','--teal-bg':'#0d2e2a','--teal-border':'#1a4a44'
};

var LIGHT_SEM = {
  '--green':'#1a8a4a','--green-bg':'#e8f8ee','--green-border':'#b0dfc0',
  '--red':'#d63c3c','--red-bg':'#fdeaea','--red-border':'#f0b0b0',
  '--amber':'#c47800','--amber-bg':'#fff8e8','--amber-border':'#f0d080',
  '--purple':'#6d3fdc','--purple-bg':'#f0ebff','--purple-border':'#c8b0f8',
  '--teal':'#0e9e8c','--teal-bg':'#e8faf8','--teal-border':'#b0e0da'
};

var MOODS = ['Profundo','Neutro','Quente'];
var SURFACES = ['Cartões','Minimal','Contraste'];
var HERO_STYLES = ['Gradiente','Sólido','Mesh','Aurora'];

function buildTokens(theme, mood, surface, accent, oled, heroStyle){
  theme = theme || 'dark';
  mood = mood || 'Profundo';
  surface = surface || 'Cartões';
  accent = accent || (theme === 'dark' ? '#5b8eff' : '#2962e8');
  var isDark = theme === 'dark';

  // Passo 1: R0 = ramp do mood ativo (fallback Profundo se mood inválido) — RN-1a-01
  var ramps = isDark ? DARK_RAMPS : LIGHT_RAMPS;
  var R0 = ramps[mood] || ramps.Profundo;

  // Passo 2: R = cópia de R0
  var R = {};
  for(var k in R0){ if(R0.hasOwnProperty(k)) R[k] = R0[k]; }

  // Passo 3: OLED sobrescreve --bg ANTES de bg2/bg3/bg4 serem lidos — RN-1a-03/04
  if(isDark && oled === true){
    R['--bg'] = '#000000';
  }

  // Passo 4: defaults = surface 'Cartões' (sem transformação) — RN-1a-08
  var bg2 = R['--bg2'], bg3 = R['--bg3'], bg4 = R['--bg4'];
  var border = R['--border'], border2 = R['--border2'];

  // Passo 5: transformação de surface pós-ramp
  if(surface === 'Minimal'){
    // RN-1a-06 — CORRIGIDO: R0 é o ramp do mood ativo SEM OLED, nunca o ramp Profundo
    bg2 = R['--bg'];       // usa R, já com OLED se aplicável
    bg3 = R0['--bg2'];     // usa R0 (mood ativo, sem OLED)
    bg4 = R0['--bg3'];     // idem
    border = 'transparent';
    border2 = R0['--border']; // idem
  } else if(surface === 'Contraste'){
    // RN-1a-07
    border = R['--border2'];
    border2 = R['--border2'];
  }

  // Passo 6: cores semânticas fixas por tema, independem de mood — RN-1a-02
  var sem = isDark ? DARK_SEM : LIGHT_SEM;

  // Passo 7: fórmula real de accent — RN-1a-09
  var blueBg = accent + '22';
  var blueBorder = accent + '55';

  // Passo 7b: capa do saldo (heroStyle) — Sub-fase 1d
  // Fórmulas extraídas literalmente do protótipo (Financas App.dc.html).
  // No tema claro, bg2 (destino do gradiente) fica muito próximo do fundo
  // geral da página — reforça opacidade/borda para manter contraste visível
  // (o protótipo original nunca foi validado fora do tema escuro).
  var hs = heroStyle || 'Gradiente';
  var heroAlphaBg = isDark ? '22' : '33';
  var heroAlphaBorder = isDark ? '55' : '88';
  var heroAlphaSoft = isDark ? '44' : '77';
  var heroDest = isDark ? bg2 : bg3;
  var heroBg, heroBorder;
  if(hs === 'Sólido'){
    heroBg = bg2; heroBorder = border2;
  } else if(hs === 'Mesh'){
    heroBg = 'radial-gradient(120% 90% at 15% 0%,'+accent+'40 0%,transparent 55%),radial-gradient(110% 90% at 95% 15%,#a855f733 0%,transparent 55%),linear-gradient('+heroDest+','+heroDest+')';
    heroBorder = accent + heroAlphaSoft;
  } else if(hs === 'Aurora'){
    heroBg = 'radial-gradient(100% 80% at 0% 100%,#14b8a62e 0%,transparent 60%),radial-gradient(120% 90% at 100% 0%,'+accent+'3d 0%,transparent 55%),radial-gradient(90% 70% at 60% 100%,#a855f72a 0%,transparent 60%),linear-gradient('+heroDest+','+heroDest+')';
    heroBorder = accent + heroAlphaSoft;
  } else { // 'Gradiente' (default)
    heroBg = 'linear-gradient(160deg,'+accent+heroAlphaBg+' 0%,'+heroDest+' 70%)';
    heroBorder = accent + heroAlphaBorder;
  }

  // Passo 8: composição final
  var tokens = {};
  for(var rk in R){ if(R.hasOwnProperty(rk)) tokens[rk] = R[rk]; }
  tokens['--bg2'] = bg2;
  tokens['--bg3'] = bg3;
  tokens['--bg4'] = bg4;
  tokens['--border'] = border;
  tokens['--border2'] = border2;
  for(var sk in sem){ if(sem.hasOwnProperty(sk)) tokens[sk] = sem[sk]; }
  tokens['--blue'] = accent;
  tokens['--blue-bg'] = blueBg;
  tokens['--blue-border'] = blueBorder;
  tokens['--nav-bg'] = R['--bg']; // herda OLED — RN-1a-05
  tokens['--hero-bg'] = heroBg;
  tokens['--hero-border'] = heroBorder;

  return tokens;
}

// RN-1a-13: hora >= 6 e < 18 -> 'light'; caso contrário -> 'dark'
function getEffectiveTheme(look){
  look = look || {};
  if(!look.autoTheme) return look.theme || 'dark';
  var hour = new Date().getHours();
  return (hour >= 6 && hour < 18) ? 'light' : 'dark';
}

function applyLook(look){
  look = look || {};
  var theme = look.theme || 'dark';
  var mood = look.mood || 'Profundo';
  var surface = look.surface || 'Cartões';
  var accent = look.accent || (theme === 'dark' ? '#5b8eff' : '#2962e8');
  var oled = look.oled === true;
  var autoTheme = look.autoTheme === true;
  var heroStyle = look.heroStyle || 'Gradiente';

  // RN-1a-17: o tema efetivo (autoTheme) é usado só para aplicar os tokens visuais;
  // o campo 'theme' persistido continua sendo a última escolha manual.
  var effectiveTheme = getEffectiveTheme({theme: theme, autoTheme: autoTheme});

  var tokens = buildTokens(effectiveTheme, mood, surface, accent, oled, heroStyle);
  // Aplicado no <body> (não <html>): body.light{...} no CSS estático tem a mesma
  // especificidade e ordem de origem posterior a :root — setar em documentElement
  // fazia o :root/body.light hardcoded vencer os tokens dinâmicos no tema claro.
  var root = document.body;
  for(var key in tokens){
    if(tokens.hasOwnProperty(key)) root.style.setProperty(key, tokens[key]);
  }

  document.body.classList.toggle('light', effectiveTheme !== 'dark');
  var metaTheme = document.getElementById('meta-theme');
  if(metaTheme) metaTheme.content = tokens['--bg'];
  var tog = document.getElementById('toggle-dark');
  if(tog) tog.checked = effectiveTheme === 'dark';

  localStorage.setItem('theme', theme);
  localStorage.setItem('financas-look', JSON.stringify({
    theme: theme, mood: mood, surface: surface, accent: accent,
    oled: oled, autoTheme: autoTheme, heroStyle: heroStyle
  }));
}

function getSavedLook(){
  var raw = localStorage.getItem('financas-look');
  if(raw){
    try{
      var parsed = JSON.parse(raw);
      if(parsed && typeof parsed === 'object' && parsed.theme){
        return {
          theme: parsed.theme,
          mood: parsed.mood || 'Profundo',
          surface: parsed.surface || 'Cartões',
          accent: parsed.accent || (parsed.theme === 'dark' ? '#5b8eff' : '#2962e8'),
          oled: parsed.oled === true,
          autoTheme: parsed.autoTheme === true,
          heroStyle: parsed.heroStyle || 'Gradiente'
        };
      }
    }catch(e){
      console.warn('[getSavedLook] financas-look inválido, usando fallback', e);
    }
  }
  // Fallback: usuário existente sem financas-look (RN-10 / RN-1a-16)
  var legacyTheme = localStorage.getItem('theme') || 'dark';
  return {
    theme: legacyTheme,
    mood: 'Profundo',
    surface: 'Cartões',
    accent: legacyTheme === 'dark' ? '#5b8eff' : '#2962e8',
    oled: false,
    autoTheme: false,
    heroStyle: 'Gradiente'
  };
}
