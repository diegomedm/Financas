// theme.js — Fundação Visual (Fase 0)
// Composição e aplicação de tokens de aparência (tema/tom/superfície/accent).
// Ver .claude/specs/fase0-fundacao-visual.md — RN-01 a RN-14.

function buildTokens(theme, mood, surface, accent){
  theme = theme || 'dark';
  accent = accent || (theme === 'dark' ? '#5b8eff' : '#2962e8');
  // mood e surface são aceitos mas não têm efeito nesta fase (RN-03) —
  // só existe um mood (Profundo) e uma surface (Cartões) implementados.

  var tokens;
  if(theme === 'light'){
    tokens = {
      '--bg':'#f5f6fa','--bg2':'#ffffff','--bg3':'#f0f1f8','--bg4':'#e8eaf5',
      '--border':'#d0d4ea','--border2':'#bcc0dc',
      '--text':'#1a1d36','--text2':'#5a6090','--text3':'#9499c0',
      '--green':'#1a8a4a','--green-bg':'#e8f8ee','--green-border':'#b0dfc0',
      '--red':'#d63c3c','--red-bg':'#fdeaea','--red-border':'#f0b0b0',
      '--blue':'#2962e8','--blue-bg':'#eaf0ff','--blue-border':'#b0c4f8',
      '--amber':'#c47800','--amber-bg':'#fff8e8','--amber-border':'#f0d080',
      '--purple':'#6d3fdc','--purple-bg':'#f0ebff','--purple-border':'#c8b0f8',
      '--teal':'#0e9e8c','--teal-bg':'#e8faf8','--teal-border':'#b0e0da',
      '--nav-bg':'rgba(245,246,250,.96)'
    };
  } else {
    tokens = {
      '--bg':'#0d0f1a','--bg2':'#151829','--bg3':'#1c2038','--bg4':'#242848','--bg5':'#282e4a',
      '--border':'#323760','--border2':'#3e4470',
      '--text':'#eef0ff','--text2':'#9ba3d4','--text3':'#5a6294',
      '--green':'#3ddc84','--green-bg':'#0d2e1e','--green-border':'#1a4a2a',
      '--red':'#ff6b6b','--red-bg':'#2e0d0d','--red-border':'#4a1a1a',
      '--blue':'#5b8eff','--blue-bg':'#0d1a3d','--blue-border':'#1a2a4a',
      '--amber':'#ffb547','--amber-bg':'#2e1f0d','--amber-border':'#4a2a0d',
      '--purple':'#a78bfa','--purple-bg':'#1a0d3d','--purple-border':'#2a1a4a',
      '--teal':'#2dd4bf','--teal-bg':'#0d2e2a','--teal-border':'#1a4a44',
      '--nav-bg':'rgba(13,15,26,.96)'
    };
  }

  // RN-04: accent sobrescreve --blue. Fórmula de derivação de --blue-bg/--blue-border
  // para accent customizado não está definida nesta fase (decisão do Tech Lead) —
  // só o valor default (idêntico ao já hardcoded) é usado; accent diferente do
  // default troca --blue mas mantém --blue-bg/--blue-border atuais como fallback.
  tokens['--blue'] = accent;

  return tokens;
}

function applyLook(look){
  look = look || {};
  var theme = look.theme || 'dark';
  var mood = look.mood || 'Profundo';
  var surface = look.surface || 'Cartões';
  var accent = look.accent || (theme === 'dark' ? '#5b8eff' : '#2962e8');

  var tokens = buildTokens(theme, mood, surface, accent);
  var root = document.documentElement;
  for(var key in tokens){
    if(tokens.hasOwnProperty(key)) root.style.setProperty(key, tokens[key]);
  }

  document.body.classList.toggle('light', theme !== 'dark');
  var metaTheme = document.getElementById('meta-theme');
  if(metaTheme) metaTheme.content = theme === 'dark' ? '#0d0f1a' : '#f5f6fa';
  var tog = document.getElementById('toggle-dark');
  if(tog) tog.checked = theme === 'dark';

  localStorage.setItem('theme', theme);
  localStorage.setItem('financas-look', JSON.stringify({theme:theme, mood:mood, surface:surface, accent:accent}));
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
          accent: parsed.accent || (parsed.theme === 'dark' ? '#5b8eff' : '#2962e8')
        };
      }
    }catch(e){
      console.warn('[getSavedLook] financas-look inválido, usando fallback', e);
    }
  }
  // Fallback: usuário existente sem financas-look (RN-10)
  var legacyTheme = localStorage.getItem('theme') || 'dark';
  return {
    theme: legacyTheme,
    mood: 'Profundo',
    surface: 'Cartões',
    accent: legacyTheme === 'dark' ? '#5b8eff' : '#2962e8'
  };
}
