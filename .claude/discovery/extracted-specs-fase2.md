# Especificação Extraída — FASE 2: Navegação e Ações Rápidas

> Fonte: protótipo de referência visual/comportamental (não é código de produção)
> - `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\Financas App.dc.html`
> - `C:\Users\SESI\Documents\GitHub\CLAUDE DESIGN - App Finanças\design_handoff_financas_visual\support.js` (apenas infraestrutura do framework fake `sc-if`/`sc-for`/`setState` — nenhuma lógica de produto relevante encontrada lá; toda a lógica das seções abaixo está no `.dc.html`)
>
> Este documento é literal: os trechos de código são cópia do protótipo, não paráfrase. Onde algo pedido não existe no protótipo, isso está declarado explicitamente como "não encontrado".

---

## 1. FAB speed dial

### 1.1 Estrutura HTML/CSS

**Backdrop (abre junto com o menu), z-index 39:**
```html
<div onClick="{{ closeFab }}" style="position:absolute;inset:0;z-index:39;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);animation:fadeBg .18s ease"></div>
```

**Menu (lista de opções), z-index 41, ancorado no canto inferior direito:**
```html
<div style="position:absolute;right:16px;bottom:140px;z-index:41;display:flex;flex-direction:column;align-items:flex-end;gap:8px">
  <sc-for list="{{ fabOptions }}" as="fo" hint-placeholder-count="4">
    <button onClick="{{ fo.onClick }}" style-active="transform:scale(.95)"
      style="display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);animation:listItemIn .26s cubic-bezier(.16,1,.3,1) both;animation-delay:{{ fo.delay }};transition:transform .12s;{{ fo.rowStyle }}">
      <!-- ícone SVG conforme fo.isTx / fo.isBudget / fo.isCard / fo.isRepeat -->
      {{ fo.label }}
    </button>
  </sc-for>
</div>
```

Ícones SVG por tipo (viewBox 24x24, 15x15px, `stroke:currentColor`, `stroke-width:2`):
- `tx` (Novo lançamento): `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>` (símbolo de cifrão)
- `budget` (Item de orçamento): `<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>` (checklist)
- `card` (Gasto de cartão): `<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>` (cartão)
- `repeat` (Repetir último): `<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>` (setas circulares)

**Botão FAB principal**, z-index 40, `right:16px; bottom:78px` (acima da bottom nav), 52x52px, `border-radius:17px`, fundo `var(--blue)`:
```html
<button onClick="{{ openAdd }}" style-active="transform:scale(.88)"
  style="position:absolute;right:16px;bottom:78px;z-index:40;width:52px;height:52px;border-radius:17px;background:var(--blue);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 24px -4px var(--blue-border),0 4px 12px rgba(0,0,0,.3);transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .2s">
  <svg viewBox="0 0 24 24" style="width:26px;height:26px;stroke:#fff;fill:none;stroke-width:2.2;stroke-linecap:round;transition:transform .3s cubic-bezier(.34,1.56,.64,1);transform:{{ fabIconRotate }}">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
</button>
```

### 1.2 Lógica de abertura/fechamento

```js
openAdd(){this.setState(s=>({fabOpen:!s.fabOpen}));}
closeFab(){this.setState({fabOpen:false});}
fabAction(fn){this.setState({fabOpen:false});setTimeout(()=>fn(),60);}
```

- `openAdd` é um **toggle** simples de `fabOpen` (booleano no state).
- Fechar acontece: clicando no backdrop (`closeFab`), ou automaticamente ao escolher qualquer opção (`fabAction` fecha o menu e só então, 60ms depois, executa a ação — o delay é para deixar a animação de fechamento começar antes de abrir o modal seguinte).
- **Rotação do ícone em 45°:** controlada por `fabIconRotate`, calculada assim:
  ```js
  fabIconRotate:(s.modal||s.fabOpen)?'rotate(45deg)':'rotate(0deg)'
  ```
  Ou seja, gira 45° tanto quando o FAB está aberto quanto quando **qualquer modal está aberto** (o "+" vira "×" visualmente nos dois casos). Transição: `transform .3s cubic-bezier(.34,1.56,.64,1)`.
- **Backdrop com blur:** `background:rgba(0,0,0,.45)` + `backdrop-filter:blur(2px)`, com animação de entrada `fadeBg .18s ease`. Não há animação de saída explícita (o backdrop simplesmente desmonta via `sc-if`).
- Cada item do menu anima entrada com `listItemIn .26s cubic-bezier(.16,1,.3,1) both`, com `animation-delay` escalonado por item (ver 1.3).

### 1.3 Opção contextual da tela atual — lógica exata

```js
fabOptions:(()=>{
  const opts=[
    {key:'tx',label:'Novo lançamento',icon:'tx',onClick:()=>this.fabAction(()=>this.openTx(null))},
    {key:'budget',label:'Item de orçamento',icon:'budget',onClick:()=>this.fabAction(()=>this.openBudget(null))},
    {key:'gasto',label:'Gasto de cartão',icon:'card',onClick:()=>this.fabAction(()=>this.openGasto(this.state.cartoes[0]?this.state.cartoes[0].id:null,null,false))},
    {key:'repeat',label:'Repetir último',icon:'repeat',onClick:()=>this.fabAction(()=>this.repeatLast())},
  ];
  // opção contextual da tela atual vem primeiro/destacada
  const ctx=s.page==='budget'?'budget':s.page==='cards'?'gasto':'tx';
  opts.sort((a,b)=>(a.key===ctx?-1:0)-(b.key===ctx?-1:0));
  return opts.map((o,i)=>({...o,isPrimary:o.key===ctx,isTx:o.icon==='tx',isBudget:o.icon==='budget',isCard:o.icon==='card',isRepeat:o.icon==='repeat',
    delay:((opts.length-1-i)*40)+'ms',
    // ... (rowStyle não capturado no trecho seguinte — ver observação abaixo)
```

**Regra de contexto (mapeamento tela → opção priorizada):**
- `page === 'budget'` → chave `budget` ("Item de orçamento") é priorizada
- `page === 'cards'` → chave `gasto` ("Gasto de cartão") é priorizada
- qualquer outra tela (inclui `dash`, `tx`, `proj`, `cfg`, `report`) → chave `tx` ("Novo lançamento") é priorizada, por ser o valor default do ternário

**Mecanismo de priorização:** `Array.prototype.sort` estável colocando o item cuja `key === ctx` em primeiro lugar (`-1`), demais mantêm ordem relativa.

**Estilo do item contextual (`rowStyle`), linha completa do código-fonte:**
```js
return opts.map((o,i)=>({...o,isPrimary:o.key===ctx,isTx:o.icon==='tx',isBudget:o.icon==='budget',isCard:o.icon==='card',isRepeat:o.icon==='repeat',
  delay:((opts.length-1-i)*40)+'ms',
  rowStyle:o.key===ctx?'background:var(--blue);color:#fff;border:none':'background:var(--bg3);color:var(--text);border:1px solid var(--border2)'}));
```
- Item contextual (`isPrimary`): fundo azul sólido `var(--blue)`, texto branco `#fff`, sem borda.
- Demais itens: fundo `var(--bg3)` (cinza escuro padrão de card), texto `var(--text)` (cor padrão), borda `1px solid var(--border2)`.
- Ou seja, a única opção priorizada recebe destaque de **cor** (vira um botão azul "cheio", como um CTA primário), enquanto as outras três parecem botões secundários neutros — reforçando visualmente que é a ação mais provável para aquela tela, além de vir em primeiro na lista (posição) e ter o maior delay de entrada (linha 1.3).
- O delay de animação de entrada é escalonado do último para o primeiro: item mais no topo da lista (índice 0, que é o contextual) recebe o maior delay entre os 4 (`(opts.length-1-0)*40 = 120ms`), e o último item da lista some com `0ms`. Isso cria efeito de "leque" abrindo de baixo para cima.

### 1.4 Gasto de cartão — seletor de cartão no modal

O clique na opção "Gasto de cartão" chama:
```js
onClick:()=>this.fabAction(()=>this.openGasto(this.state.cartoes[0]?this.state.cartoes[0].id:null,null,false))
```
- Abre o modal de gasto já pré-selecionando o **primeiro cartão da lista** (`this.state.cartoes[0].id`), não um seletor vazio. Se não houver cartões cadastrados, passa `null`.
- O parâmetro de "forçar recorrente" (`forceRec`) é `false`.
- **Não encontrado**: nenhum seletor de cartão específico dentro do menu do FAB (dropdown inline antes de abrir o modal). A escolha do cartão acontece dentro do modal de gasto já aberto (campo próprio do formulário, fora do escopo do FAB em si).

### 1.5 Long-press (segurar o FAB) — "repetir último" / "top 3 gastos comuns"

**Não encontrado.** Buscas extensivas por `longPress`, `long-press`, `hold`, `Timeout` (associado a pressão), `contextmenu`, `onTouch*`, `pointerdown` + duração no botão FAB não retornaram nenhuma implementação de long-press no protótipo. O FAB só responde a `onClick` (toggle simples do menu).

O que **existe** e pode ter sido confundido com essa ideia:
- A opção "Repetir último" já está disponível como **item normal do speed-dial** (clique único), não como gesto de segurar:
  ```js
  repeatLast(){
    const s=this.state;
    const last=[...s.txs].sort((a,b)=>b.id-a.id)[0];
    if(!last){this.toast('Nenhum lançamento ainda','var(--amber)');return;}
    this.setState({modal:'tx',draft:{id:null,name:last.name,value:String(last.value).replace('.',','),type:last.type,month:s.month,year:s.year,date:'',paidDate:'',obs:'',pessoaId:last.pessoaId||null,categoriaId:last.categoriaId?String(last.categoriaId):'',subitems:[]}});
  }
  ```
  Lógica: pega o lançamento (`txs`) de **maior `id`** (ordenação decrescente por id, item `[0]`) como "último". Se não houver nenhum lançamento, mostra toast de aviso (`'Nenhum lançamento ainda'`, cor âmbar) e não abre modal. Se houver, abre o modal de novo lançamento (`modal:'tx'`) pré-preenchido com nome, valor (convertido de ponto para vírgula), tipo, pessoa e categoria do último — mas com **id null** (novo registro), **data e data de pagamento vazias**, **observação vazia**, e **subitens vazios** (não copia subitens).
- **"Top 3 gastos comuns"**: não existe essa métrica no protótipo. O que existe é `topGastos` no relatório/dashboard, mas é **top 5 gastos do mês por valor**, não "gastos mais comuns" (frequência) nem limitado a 3:
  ```js
  const topGastos=[...rows].filter(t=>t.type!=='income').sort((a,b)=>b.value-a.value).slice(0,5).map((t,i)=>({rank:i+1,name:t.name,valStr:this.fmt(t.value)}));
  const hasTopGastos=topGastos.length>0,hasTopGastosEmpty=!hasTopGastos;
  ```
  Isso é renderizado em uma seção separada da tela (linhas ~895-906 do HTML), não vinculado ao FAB de forma alguma.

**Conclusão da seção 1.5:** o comportamento de long-press no FAB (segurar para atalhos de "repetir último"/"top 3 gastos comuns") **não existe no protótipo** e precisará ser especificado/desenhado do zero para o app real, já que não há referência de comportamento a copiar.

---

## 2. Busca em Lançamentos

### 2.1 Estrutura do campo de busca

Localizada na tela de Lançamentos (`isTx`/página `tx`), acima das tabs de filtro por tipo, abaixo do filtro de pessoa:
```html
<div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:9px 12px;margin-bottom:10px">
  <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:var(--text3);fill:none;stroke-width:2;stroke-linecap:round;flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  <input value="{{ txSearchValue }}" onInput="{{ setTxSearch }}" placeholder="Buscar por nome, valor ou observação..." style="flex:1;background:none;border:none;outline:none;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;min-width:0">
  <sc-if value="{{ txSearchActive }}" hint-placeholder-val="{{ false }}">
    <button onClick="{{ clearTxSearch }}" style-active="transform:scale(.85)" style="background:var(--bg4);border:none;color:var(--text2);width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;flex-shrink:0;transition:transform .1s">×</button>
  </sc-if>
</div>
```
- Ícone de lupa (SVG, círculo + linha), à esquerda, cor `var(--text3)`, sempre visível.
- Botão "×" para limpar (`clearTxSearch`) aparece condicionalmente apenas quando `txSearchActive` é verdadeiro (ver 2.2), à direita, círculo 20x20px `var(--bg4)`.
- Placeholder literal: `"Buscar por nome, valor ou observação..."`.

### 2.2 State e handlers

```js
setTxSearch(e){this.setState({txSearch:e.target.value});}
clearTxSearch(){this.setState({txSearch:''});}
```
```js
txSearchValue:s.txSearch,setTxSearch:e=>this.setTxSearch(e),clearTxSearch:()=>this.clearTxSearch(),txSearchActive:!!s.txSearch.trim(),
```
- `txSearch` é string simples no state raiz, inicial `''` (linha 1460: `pessoaFilter:null, txFilter:'all', txSearch:'', hideValues:false, ...`).
- `txSearchActive` = `true` quando o valor **trimado** não é vazio (controla exibição do botão limpar).

### 2.3 Lógica de filtro exata

```js
let filtered=s.txFilter==='all'?rows:rows.filter(t=>t.type===s.txFilter);
if(s.txSearch.trim()){
  const q=s.txSearch.trim().toLowerCase();
  const qNum=parseFloat(q.replace(',','.'));
  filtered=filtered.filter(t=>t.name.toLowerCase().includes(q)||(t.obs||'').toLowerCase().includes(q)||(!isNaN(qNum)&&Math.abs(t.value-qNum)<0.005));
}
```

Detalhamento:
1. A busca por texto (`name`, `obs`) é aplicada **depois** do filtro de tipo (tabs Todos/Receitas/Fixas/Variáveis/Cartão) — os dois filtros são cumulativos (AND).
2. `q` = valor digitado, trimado e em **lowercase**.
3. Campos de texto buscados: `t.name` (nome do lançamento) e `t.obs` (observação, com fallback para string vazia se `undefined`).
4. Comparação de texto: `String.includes(q)` — **busca parcial** (substring), **case-insensitive** (ambos os lados convertidos para lowercase).
5. Busca por valor: tenta converter `q` para número (`parseFloat`, trocando vírgula por ponto — aceita formato brasileiro "12,50" e também "12.50"/"12"). Se a conversão for válida (`!isNaN(qNum)`), compara com `t.value` usando **tolerância de ponto flutuante**: `Math.abs(t.value - qNum) < 0.005` — ou seja, é praticamente uma igualdade exata (não é "contém", é "é aproximadamente igual", com margem de meio centavo para evitar erros de arredondamento).
6. A combinação é um **OR** entre os três critérios: nome contém OU observação contém OU valor é (aproximadamente) igual.
7. Não há debounce explícito — o filtro roda a cada `onInput` (recomputa toda vez que o state muda, dentro do render).

---

## 3. Duplicar lançamento

### 3.1 Onde fica o botão

**Apenas dentro do modal de edição de lançamento** — não há duplicar via swipe. O botão só aparece quando o modal está no modo edição de um lançamento existente (`modal==='tx'` e `draft.id` truthy):

```html
<sc-if value="{{ canDuplicate }}" hint-placeholder-val="{{ false }}">
  <button onClick="{{ duplicateDraft }}" style-active="transform:scale(.96)" style="background:transparent;color:var(--blue);border:1px solid var(--blue-border);border-radius:9px;padding:11px 14px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:transform .12s" title="Cria uma cópia deste lançamento">⧉</button>
</sc-if>
```
- **Ícone/símbolo:** caractere unicode `⧉` (SQUARE TIMES SQUARE — visualmente parece "duas telas sobrepostas"), não é SVG.
- **Posição:** dentro da linha de botões do rodapé do modal, entre "Excluir" e "Cancelar":
  ```html
  <div style="display:flex;gap:8px">
    <button onClick="{{ saveDraft }}">{{ saveLabel }}</button>
    <sc-if value="{{ isEditing }}">...Excluir...</sc-if>
    <sc-if value="{{ canDuplicate }}">...⧉ (Duplicar)...</sc-if>
    <button onClick="{{ closeModal }}">Cancelar</button>
  </div>
  ```
- **Condição de visibilidade:**
  ```js
  canDuplicate:!!(d&&d.id&&s.modal==='tx')
  ```
  Só aparece para lançamentos existentes (tem `id`) dentro do modal de tipo `'tx'` — **não existe** para modal de orçamento (`'budget'`), cartão (`'cartao'`), gasto de cartão (`'gasto'`), meta (`'goal'`) ou categoria. É exclusivo de Lançamentos.
- Estilo: outline azul transparente (`border:1px solid var(--blue-border)`, `background:transparent`, `color:var(--blue)`), mesmo padding dos outros botões secundários (`11px 14px`).
- Tooltip nativo: `title="Cria uma cópia deste lançamento"`.

### 3.2 Lógica exata de duplicação

```js
duplicateDraft(){
  const d=this.state.draft;if(!d)return;
  this.setState({draft:{...d,id:null,paidDate:'',subitems:(d.subitems||[]).map(x=>({...x,}))}});
  this.toast('Duplicado — ajuste e salve','var(--blue)');
}
```

- Parte do `draft` atual (o formulário já aberto, não busca de novo no array `txs`).
- Campos **resetados**:
  - `id: null` → vira um lançamento novo ao salvar (não sobrescreve o original).
  - `paidDate: ''` → data de pagamento é limpa (a cópia nasce "não paga").
- Campos **copiados** (todos os demais via spread `...d`): `name`, `value`, `type`, `month`, `year`, `date`, `obs`, `pessoaId`, `categoriaId` — inclusive a **data (`date`) do lançamento original é mantida**, apenas `paidDate` é limpa.
- `subitems` são copiados como **novos objetos** (`.map(x=>({...x}))`, shallow clone de cada subitem) — preserva conteúdo mas evita referência compartilhada com o array original.
- O modal **permanece aberto** após duplicar (não fecha, não salva automaticamente) — usuário precisa clicar em "Salvar" para persistir a cópia. Um toast informa isso: `'Duplicado — ajuste e salve'` (cor azul).
- Não reresete `month`/`year` — a cópia nasce no mesmo mês/ano do original (não no mês atualmente navegado), diferente de `repeatLast()` que usa `s.month`/`s.year` atuais.

---

## 4. Modo privacidade (ocultar valores)

### 4.1 Onde fica o toggle

Ícone de olho no **header do card "Saldo de {mês}"** na tela Dashboard (dentro do hero de saldo, canto superior direito, ao lado do badge "▲ 12% vs mês ant."):

```html
<span onClick="{{ toggleHideValuesStop }}" role="button" title="Ocultar valores" style-active="transform:scale(.85)" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;cursor:pointer;transition:transform .1s">
  <sc-if value="{{ hideValues }}" hint-placeholder-val="{{ false }}">
    <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:var(--blue);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  </sc-if>
  <sc-if value="{{ hideValuesOff }}" hint-placeholder-val="{{ true }}">
    <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:var(--text2);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  </sc-if>
</span>
```
- Ícone é olho "riscado" (linha diagonal) quando `hideValues===true` (cor azul), olho normal quando `false` (cor `text2`).
- `toggleHideValuesStop` faz `e.stopPropagation()` antes de togglar — necessário porque o card inteiro (`<button onClick="{{ markUpdate }}">`) também é clicável (marca "atualizado"); sem o stopPropagation, tocar no olho também dispararia `markUpdate`.

### 4.2 Handlers e state

```js
toggleHideValues(){this.setState(s=>({hideValues:!s.hideValues}));}
```
```js
toggleHideValuesStop:e=>{if(e&&e.stopPropagation)e.stopPropagation();this.toggleHideValues();},
hideValues:s.hideValues,hideValuesOff:!s.hideValues,toggleHideValues:()=>this.toggleHideValues(),
```
- State inicial: `hideValues:false` (linha 1460).

### 4.3 Lógica de mascaramento — onde se aplica

Mascaramento acontece **nas funções centrais de formatação monetária**, usadas por toda a aplicação — ou seja, **não é limitado ao dashboard**, é global em qualquer lugar que use `this.fmt()`/`this.fmtN()`:

```js
fmt(v){if(this.state.hideValues)return 'R$ •••••';return 'R$ '+Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
fmtN(v){if(this.state.hideValues)return '•••';return Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});}
```
- `fmt(v)`: usado para valores monetários completos → retorna literalmente `'R$ •••••'` (5 bullets) quando oculto, ignorando o valor real e o sinal.
- `fmtN(v)`: usado para números sem prefixo de moeda → retorna `'•••'` (3 bullets) quando oculto.
- Como `fmt`/`fmtN` são chamados em praticamente todos os pontos de renderização de valores (lista de lançamentos, orçamento, cartões, projeção, relatório, metas, etc. — todos usam `this.fmt(...)`), a máscara é **transversal a todas as telas do app**, não apenas ao dashboard.
- Exceção notável: o **saldo hero em destaque** (`balSlot`) usa uma técnica separada de "dígitos rolantes" (animação de slot machine), mas a string de origem também passa por `this.fmt`:
  ```js
  balSlot:((c.balance>=0?'+':'−')+this.fmt(Math.abs(c.balance))).split('').map(...)
  ```
  então também respeita `hideValues`.

### 4.4 Persistência

**Não é persistido.** Buscando todas as referências a `localStorage`/`sessionStorage` no arquivo, encontra-se apenas:
```js
persistLook(){try{const s=this.state;localStorage.setItem('financas-app-look',JSON.stringify({theme:s.theme,accent:s.accent,mood:s.mood,surface:s.surface,oled:s.oled,autoTheme:s.autoTheme,heroStyle:s.heroStyle,pessoaColors:Object.fromEntries(s.pessoas.map(p=>[p.id,p.color]))}));}catch(e){}}
```
`hideValues` **não está** na lista de campos persistidos (`theme, accent, mood, surface, oled, autoTheme, heroStyle, pessoaColors`). Ou seja, no protótipo o modo privacidade é **apenas estado em memória da sessão**, resetando para `false` a cada reload/reabertura do app. Se o app real precisar persistir entre sessões, isso é uma decisão nova, não herdada do protótipo.

---

## 5. Swipe em lançamentos

### 5.1 Lógica exata de swipe (pointer events, threshold)

```js
swipeDown(e){
  // Se o toque começou num controle marcado como "sem swipe" (ex: check de realizado), ignora
  // o gesto inteiro — não só o down/up daquele nó — para não deixar _swX pendurado e vazar num
  // toque seguinte em outra linha (o "vazamento" reportado).
  if(e&&e.target&&e.target.closest&&e.target.closest('[data-no-swipe]')){this._swIgnore=true;this._swX=null;return;}
  this._swIgnore=false;this._swX=e.clientX;this._swY=e.clientY;this._swMoved=false;
}
swipeMove(e){if(this._swIgnore||this._swX==null)return;if(Math.abs(e.clientX-this._swX)>8)this._swMoved=true;}
swipeUp(key,e,tapFn){
  // checa o alvo também no momento do "up" (não só no "down") — cobre o caso em que o toque
  // começou fora do controle mas terminou em cima dele (ou vice-versa), evitando que o estado
  // de arraste fique "pendurado" e vaze para o próximo toque em outra linha.
  if(this._swIgnore||(e&&e.target&&e.target.closest&&e.target.closest('[data-no-swipe]'))){this._swIgnore=false;this._swX=null;return;}
  const dx=(this._swX!=null)?(e.clientX-this._swX):0;
  this._swX=null;
  if(dx<-42){this.setState(s=>({swipeOpen:{...s.swipeOpen,[key]:true}}));return;}
  if(dx>42){this.closeSwipeGraceful(key);return;}
  if(this.state.swipeOpen[key]){this.closeSwipeGraceful(key);return;}
  if(!this._swMoved&&tapFn)tapFn();
}
closeSwipe(key){this.setState(s=>({swipeOpen:{...s.swipeOpen,[key]:false}}));}
closeSwipeGraceful(key){
  this.setState(s=>({swipeOpen:{...s.swipeOpen,[key]:false},swipeClosing:{...s.swipeClosing,[key]:true}}));
  this._closeTimers=this._closeTimers||{};
  clearTimeout(this._closeTimers[key]);
  this._closeTimers[key]=setTimeout(()=>{
    this.setState(s=>({swipeClosing:{...s.swipeClosing,[key]:false}}));
  },300);
}
```

Uso no card de lançamento:
```html
<div onPointerDown="{{ t.onDown }}" onPointerMove="{{ t.onMove }}" onPointerUp="{{ t.onUp }}" ...
  style="...transform:translateX({{ t.swipeX }});transition:transform .28s cubic-bezier(.4,0,.2,1),opacity .15s;position:relative">
```
```js
isSwipeOpen:isOpen||!!s.swipeClosing[swKey],
swipeX:isOpen?'-128px':'0px',
onDown:e=>this.swipeDown(e),onMove:e=>this.swipeMove(e),onUp:e=>this.swipeUp(swKey,e,()=>this.openTx(t.id)),
onSwipeEdit:()=>{this.closeSwipe(swKey);this.openTx(t.id);},
onSwipeDelete:()=>this.quickDeleteTx(t.id)
```

**Resumo do algoritmo:**
1. **`pointerdown`**: guarda `_swX`/`_swY` = posição inicial do ponteiro; zera flag `_swMoved`. Se o alvo do toque estiver dentro de um elemento `[data-no-swipe]` (ex.: o círculo de check "realizado" no orçamento), marca `_swIgnore=true` e não guarda posição — o gesto inteiro é desativado até o próximo `pointerdown`.
2. **`pointermove`**: se o deslocamento horizontal absoluto (`Math.abs(e.clientX-_swX)`) ultrapassar **8px**, marca `_swMoved=true` (serve para diferenciar tap de drag — não há atualização visual em tempo real durante o move, o "arrasto" visual só acontece no salto de `pointerup`, já que o `transform` é resolvido só ao trocar o state em `swipeUp`).
3. **`pointerup`**: calcula `dx = clientX_final - clientX_inicial`.
   - `dx < -42` (arrastou para a **esquerda** mais de 42px) → abre o swipe (`swipeOpen[key]=true`), revelando os botões à direita.
   - `dx > 42` (arrastou para a **direita** mais de 42px) → fecha graciosamente (`closeSwipeGraceful`).
   - Se nenhum dos thresholds foi atingido mas o swipe já estava aberto → fecha graciosamente (qualquer toque fora do threshold quando já aberto fecha).
   - Se não houve movimento significativo (`!_swMoved`) e existe uma `tapFn` → executa o tap (abre o modal de edição do item, `openTx(t.id)`).
4. **Threshold de distância: 42px** (tanto para abrir quanto para fechar). O threshold de "considerar que houve movimento" (diferenciando tap de swipe) é **8px**.
5. Eixo: comparação é feita **apenas em `clientX`** (horizontal); `_swY` é capturado mas não utilizado em nenhuma lógica encontrada (não há cancelamento por swipe vertical/scroll).
6. **`closeSwipeGraceful`**: fecha a posição visual imediatamente (`swipeOpen=false`), mas mantém uma flag paralela `swipeClosing[key]=true` por **300ms** (mesma duração da transição CSS `transform .28s`) antes de desmontar de fato os botões de ação do DOM. Isso evita que o card "descubra" o vazio atrás dos botões enquanto ainda está deslizando de volta.

### 5.2 Estrutura visual dos botões de ação

```html
<sc-if value="{{ t.isSwipeOpen }}" hint-placeholder-val="{{ false }}">
<div style="position:absolute;inset:0;display:flex;justify-content:flex-end">
  <div style="width:20px;background:var(--blue);flex-shrink:0"></div>
  <button onClick="{{ t.onSwipeEdit }}" style-active="filter:brightness(.82)" style="width:64px;background:var(--blue);border:none;color:#fff;font-size:11px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:filter .1s">
    <svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    Editar
  </button>
  <button onClick="{{ t.onSwipeDelete }}" style-active="filter:brightness(.82)" style="width:64px;background:var(--red);border:none;color:#fff;font-size:11px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:filter .1s">
    <svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
    Excluir
  </button>
</div>
</sc-if>
```

- **Ordem visual da esquerda para direita (dentro da área revelada):** faixa azul de 20px de "sangria" (`width:20px; background:var(--blue)`) → botão "Editar" (64px, azul) → botão "Excluir" (64px, vermelho). A faixa de 20px existe para que o **canto arredondado azul "sangre"** visualmente por baixo do card quando ele desliza, evitando um corte quadrado feio no início da faixa colorida.
- **Cores exatas:** Editar = `var(--blue)` (fundo) + `#fff` (texto/ícone). Excluir = `var(--red)` (fundo) + `#fff` (texto/ícone).
- **Largura total revelada:** faixa (20px) + Editar (64px) + Excluir (64px) = **148px de estrutura**, mas o `swipeX` de translação é **-128px** (`swipeX:isOpen?'-128px':'0px'`) — ou seja, o card desliza exatamente 128px para a esquerda (64+64, ignorando a faixa de sangria que fica "atrás"/coberta).
- **Ícones:** Editar usa ícone de lápis (`<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>`), Excluir usa ícone de lixeira (`<polyline points="3 6 5 6 21 6"/>` + corpo + duas linhas verticais internas), ambos 17x17px, `stroke:#fff`, `stroke-width:2`.
- **Feedback de toque:** `style-active="filter:brightness(.82)"` (escurece ao pressionar), transição `filter .1s`.
- **Animação de deslizamento do card:** `transition:transform .28s cubic-bezier(.4,0,.2,1),opacity .15s` no elemento do card (não nos botões).
- Os botões de ação **só existem no DOM quando `t.isSwipeOpen` é verdadeiro** — montagem/desmontagem via `sc-if`, não troca de `display`/`visibility`. Isso é proposital (ver comentário na seção do orçamento, linhas 2143-2146, que se aplica ao mesmo padrão usado em lançamentos): evita que estilos computados "vazem" entre um estado montado e outro ao alternar rapidamente.

### 5.3 Técnica CSS para "realizado" esmaecido sem vazamento visual

**Nota importante:** a lógica de "esmaecido quando realizado" (`isDimmed`/`dimmed`) foi encontrada explicitamente **apenas nos itens de Orçamento** (`budgetList`), não nos itens de Lançamentos (`txList`). Não há campo equivalente a `done`/`dimmed` no mapeamento de `txList` (linha 1973) — lançamentos não têm conceito de "realizado" (isso existe no fluxo de checkbox do orçamento, `toggleBudgetDone`). Documentando a técnica tal como existe (no orçamento), pois a pergunta do handoff presume que ela deva ser reaproveitada para lançamentos.

```js
const swKeyB='bud'+b.id;const isOpenB=!!s.swipeOpen[swKeyB];
// os botões de ação só existem no DOM quando o swipe está de fato aberto (montagem/desmontagem
// via <sc-if>, não uma troca de estilo no mesmo nó) — assim a linha pode continuar esmaecendo
// inteira (opacity) quando "realizado" sem nunca vazar os botões por trás, e evita o bug de
// estilo computado ficando preso ao alternar um único nó.
// esmaece o card em repouso (visual que você curtiu), mas volta 100% opaco assim que o swipe abre —
// evita o card translúcido encostando em botões de ação totalmente sólidos/vívidos, e mantém a
// emenda arredondada (o "sangramento" azul por baixo do canto) sempre nítida, igual nos não-realizados.
const closingB=!!s.swipeClosing[swKeyB];
const dimmed=done&&!isOpenB&&!closingB;
```
```html
<div style="position:relative;overflow:hidden;border-radius:12px;animation:listItemIn .32s cubic-bezier(.16,1,.3,1) both;animation-delay:{{ b.entryDelay }}">
  <sc-if value="{{ b.isSwipeOpenB }}">...botões de ação (Editar/Excluir)...</sc-if>
  <div onPointerDown="{{ b.onDown }}" ... style="...transform:translateX({{ b.swipeX }});transition:transform .28s cubic-bezier(.4,0,.2,1);...position:relative">
    <sc-if value="{{ b.isDimmed }}">
      <div style="display:flex;align-items:flex-start;gap:12px;opacity:.55">...conteúdo do card...</div>
    </sc-if>
    <sc-if value="{{ b.isNotDimmed }}">
      <div style="display:flex;align-items:flex-start;gap:12px">...conteúdo do card (idêntico, sem opacity)...</div>
    </sc-if>
  </div>
</div>
```

**Técnica exata:**
1. O **wrapper externo** (o `<div>` mais externo do item da lista) tem `position:relative; overflow:hidden; border-radius:12px`. É o `overflow:hidden` neste wrapper que corta qualquer conteúdo do card que deslize para fora dos limites arredondados — essa é a resposta à pergunta "que técnica CSS resolve isso": **`overflow: hidden` no contêiner pai**, não `clip-path`.
2. Dentro dele, os botões de ação (Editar/Excluir) ficam em uma camada `position:absolute;inset:0` **atrás** do card (aparecem primeiro no HTML, mas o card por cima tem `background` sólido cobrindo-os até deslizar).
3. O **card em si** (`position:relative`, mesmo fundo `var(--bg3)`) desliza por cima via `transform:translateX(...)`.
4. A opacidade "esmaecida" (`opacity:.55`) é aplicada **apenas ao conteúdo interno do card** (a `<div>` com `display:flex` dentro do card), nunca ao card-wrapper inteiro nem aos botões de ação — por isso existe a duplicação `isDimmed`/`isNotDimmed` como dois blocos HTML quase idênticos (um com `opacity:.55`, outro sem), ao invés de aplicar opacity condicionalmente via style binding no mesmo nó.
5. Regra de quando esmaecer: `dimmed = done && !isOpenB && !closingB` — ou seely, só fica esmaecido quando (a) o item está marcado como concluído/realizado **E** (b) o swipe não está aberto **E** (c) o swipe não está no meio da animação de fechamento. Isso garante que, assim que o usuário arrasta um item "realizado" para revelar os botões, ele **volta a 100% de opacidade** imediatamente — evitando que um card translúcido fique encostando em botões de ação sólidos/vívidos (o que pareceria um bug visual de camadas).
6. O nome (`b.nameStyle`) recebe `text-decoration:line-through` quando `done`, independente do dimming — esse é outro sinal visual de "realizado" que se mantém mesmo durante o swipe.

---

## Observações finais / gaps para a Fase 2

1. **Long-press no FAB não existe no protótipo** (seção 1.5) — precisa ser projetado do zero.
2. **"Top 3 gastos comuns" não existe** — o protótipo só tem "top 5 gastos por valor no mês" (`topGastos`), sem noção de frequência/recorrência de nome. Se o app real precisar de "gastos mais comuns" de fato, será uma métrica nova (provavelmente `groupBy(name)` + contagem de ocorrências).
3. **Duplicar lançamento não existe via swipe**, apenas dentro do modal de edição — se o app real quiser oferecer duplicar via swipe, também é uma extensão nova.
4. **"Realizado esmaecido" com técnica anti-vazamento só foi implementado para Orçamento**, não para Lançamentos — lançamentos não têm conceito de "realizado" no protótipo atual. Se o app real precisar disso em lançamentos, a técnica (overflow:hidden no wrapper + dois blocos dimmed/not-dimmed + swipe reseta opacidade) pode ser replicada 1:1.
5. **Modo privacidade não é persistido** entre sessões no protótipo — decisão de persistir (ex.: em IndexedDB/localStorage) precisa ser tomada para o app real, já que a store de settings do app real não foi inspecionada aqui (fora do escopo desta extração).
6. O `rowStyle` exato do item priorizado (`isPrimary`) no FAB speed dial não foi totalmente capturado na leitura (linha de definição ficou cortada no meio do grep) — recomenda-se reabrir `Financas App.dc.html` nas linhas 2334-2345 antes de implementar, para confirmar se há destaque visual (cor, borda, escala) diferenciando a opção contextual das demais.
