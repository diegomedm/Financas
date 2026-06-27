# Spec Sprint 3 — Gráficos no Dashboard

**Versão:** 1.0  
**Data:** 2026-06-27  
**Agente:** Product Owner  
**Status:** Aguardando validação do Tech Lead antes de iniciar dev

---

## Contexto

O Sprint 2 removeu a seção "Últimos lançamentos" do dashboard. O espaço liberado, posicionado abaixo dos cards de resumo e da barra de comprometimento, está vazio. O objetivo do Sprint 3 é preencher esse espaço com visualizações que respondam às perguntas mais frequentes de um casal controlando finanças mensais:

- "Onde nosso dinheiro está indo este mês?"
- "Estamos gastando mais ou menos do que nos meses anteriores?"

O app tem dois usuários (Diego + Camila), dados locais via IndexedDB, e funciona offline. Qualquer solução deve respeitar a stack vanilla JS ES2020 sem nenhum sistema de build.

**Job-to-be-done:**
"Quando abro o app no início do mês, quero ver de forma visual como estão as finanças, para tomar decisões sem precisar somar os números na cabeça."

**Métrica de sucesso:** Diego e Camila abrem o dashboard e conseguem responder "onde foi o dinheiro este mês" e "como foi o mês comparado ao anterior" sem navegar para outra aba. Critério de avaliação informal: uso real por 30 dias sem que os gráficos sejam ignorados ou reclamados.

---

## Decisão 1 — Quais 2 gráficos

### Gráfico A: Barras horizontais — Composição das despesas do mês atual

**O que mostra:** quanto cada tipo de despesa representa no total de saídas do mês corrente, usando as categorias que o app já conhece: Fixas, Variáveis e Cartão de Crédito.

**Por que este e não pizza/donut:**
O app não tem "categorias de despesa" como conceito nomeado — o equivalente seriam subitems, que são texto livre sem taxonomia. Os tipos `fixed`, `variable` e `credit` são os únicos eixos de agrupamento confiáveis no modelo de dados. Uma pizza com três fatias é menos legível do que três barras horizontais com rótulos e valores absolutos. Barras horizontais funcionam melhor em tela estreita (mobile) e permitem comparar visualmente comprimentos com mais precisão do que ângulos.

A barra de comprometimento já existente mostra o percentual total — este gráfico complementa mostrando os valores absolutos por tipo, respondendo "quanto foi fixo vs variável vs cartão".

**Dados necessários:** `fixed`, `variable`, `credit` — já calculados em `renderDash()` nas variáveis locais. Zero chamada adicional ao IndexedDB.

---

### Gráfico B: Barras verticais agrupadas — Receita vs Despesa dos últimos 6 meses

**O que mostra:** evolução mês a mês nos últimos 6 meses (incluindo o mês atual), com duas barras por mês: receita (verde) e saída total (vermelho = expense + credit). Permite identificar tendências e meses atípicos.

**Por que 6 meses e não 3 ou 12:**
3 meses é pouco para identificar padrão. 12 meses gera barras pequenas demais em tela mobile de ~360px de largura. 6 meses é o ponto de equilíbrio: legível em mobile, com contexto suficiente para ver sazonalidade.

**Por que receita vs saída total e não incluir saldo:**
O saldo como terceira barra tornaria o gráfico visualmente denso em mobile. O saldo já aparece nos cards de resumo acima. O que falta é a visão de evolução, não o valor absoluto do mês.

**Por que não gráfico de linha:**
Linha implica continuidade — adequada para saldo acumulado. Para comparar receita vs despesa por período, barras comunicam melhor a comparação discreta entre dois valores independentes.

**Dados necessários:** `calcMonth(all, y, m)` chamado para os 6 meses anteriores ao mês exibido. `all` já está em memória quando `renderDash()` executa (resultado de `dbAll()`). Nenhuma consulta adicional ao banco.

---

### Gráficos descartados e por quê

| Gráfico | Motivo do descarte |
|---------|-------------------|
| Pizza de categorias por subitem | Subitems são texto livre — sem taxonomia controlada, o resultado seria fragmentado e pouco útil |
| Linha de evolução do saldo | Saldo já aparece nos cards; linha acumulada pode confundir com saldo bancário real vs projetado |
| Donut de tipos | Três fatias com ângulos é menos preciso visualmente do que barras para o mesmo dado |
| Gráfico de orçamento realizado vs planejado | Escopo do Sprint 3 é o dashboard de lançamentos, não a tela de orçamento |

---

## Decisão 2 — Biblioteca de gráficos

**Escolha: Chart.js 4.x — arquivo local em `js/chart.min.js`**

### Por que Chart.js

| Critério | Chart.js | uPlot | Canvas 2D puro |
|----------|----------|-------|----------------|
| API para barras horizontais + verticais | Nativa, simples | Apenas linha/área | Manual — muito código |
| Peso (minificado + gzip) | ~60 KB | ~15 KB | 0 KB |
| Responsivo (resize automático) | Sim | Parcial | Manual |
| Temas claro/escuro via variáveis CSS | Configurável via options | Não | Manual |
| Curva de aprendizado | Baixa | Média | Alta |
| Dependências externas | Zero | Zero | Zero |
| Licença | MIT | MIT | — |

uPlot é mais leve mas foi projetado para séries temporais de linha/área. Implementar barras horizontais nele exigiria workarounds. Canvas 2D puro seria viável mas adicionaria ~150-200 linhas de código de baixo nível para algo que Chart.js resolve em 20 linhas — violando a regra de não introduzir complexidade desnecessária.

### Por que arquivo local, não CDN

O `sw.js` usa estratégia **network-first com cache fallback**. Os arquivos no array `urlsToCache` são pré-cacheados no `install` — garantia offline desde a primeira instalação. Arquivos de CDN só ficam no cache se o usuário os acessou com rede disponível anteriormente. Uma CDN nunca está no pré-cache.

Conclusão: a lib deve ficar em `js/chart.min.js` e ser adicionada a `urlsToCache` no `sw.js` e ao `<script src>` em `index.html` (antes de `transactions.js`).

**Versão recomendada:** Chart.js 4.4.x — baixar o bundle UMD (`chart.umd.min.js`) que expõe `Chart` como global, compatível com `<script src>` sem módulos.

---

## Escopo

### Dentro do escopo

- Gráfico A: barras horizontais de composição de despesas do mês atual (Fixed / Variable / Credit)
- Gráfico B: barras verticais de receita vs saída total, últimos 6 meses incluindo o mês atual
- Os gráficos reagirão à navegação de mês (`changeMonth`) — ao trocar o mês, ambos redesenham
- Os gráficos reagirão ao filtro de pessoa (`pessoaFilter`) — se ativo, os dados refletem apenas a pessoa filtrada (mesmo comportamento dos cards de resumo)
- Temas claro e escuro: cores dos gráficos usam as variáveis CSS já definidas em `:root` e `body.light`
- Responsividade: Chart.js gerencia resize automático; container usa `width: 100%`
- Offline: lib em `js/chart.min.js` + entrada em `urlsToCache`
- O gráfico A não é renderizado quando todas as despesas são zero (mês sem lançamentos) — exibe mensagem "Sem despesas neste mês"
- O gráfico B sempre renderiza os 6 meses, mesmo que alguns tenham valores zero

### Fora do escopo (próxima iteração)

- Categorias customizadas por subitem (requer taxonomy nova no modelo de dados)
- Gráfico de saldo acumulado
- Gráfico de orçamento planejado vs realizado
- Interatividade além do tooltip padrão do Chart.js (drill-down, filtros inline no gráfico)
- Animações personalizadas além do padrão do Chart.js
- Exportar gráfico como imagem

---

## User Stories

### US-01 — Composição das despesas do mês

Como Diego ou Camila,  
quero ver quanto foi gasto em despesas fixas, variáveis e cartão de crédito no mês atual,  
para entender rapidamente onde o dinheiro foi e se a distribuição está como esperado.

### US-02 — Evolução receita vs despesa

Como Diego ou Camila,  
quero ver a comparação entre receitas e saídas totais nos últimos 6 meses,  
para identificar tendências e meses em que gastamos mais do que o normal.

### US-03 — Gráficos acompanham a navegação de mês

Como Diego ou Camila,  
quero que os gráficos se atualizem quando navego entre meses (setas do dashboard),  
para que a visualização sempre corresponda ao período que estou analisando.

### US-04 — Gráficos acompanham o filtro de pessoa

Como Diego ou Camila,  
quero que os gráficos reflitam o filtro de responsável quando ele está ativo,  
para que eu consiga analisar separadamente minha contribuição financeira.

---

## Critérios de Aceite

### US-01 — Composição das despesas

```gherkin
Cenário: Mês com despesas nos três tipos
  Dado que o mês atual tem lançamentos do tipo fixed, variable e credit
  Quando o dashboard é carregado
  Então o gráfico A exibe três barras horizontais
  E cada barra exibe o rótulo do tipo (ex: "Fixas", "Variáveis", "Cartão")
  E o valor absoluto formatado em R$ aparece ao lado ou dentro da barra
  E o comprimento de cada barra é proporcional ao seu valor em relação ao total de saídas

Cenário: Mês sem nenhuma despesa
  Dado que o mês atual não tem lançamentos de despesa (fixed, variable ou credit)
  Quando o dashboard é carregado
  Então o gráfico A não é renderizado
  E no lugar é exibida a mensagem "Sem despesas neste mês"

Cenário: Mês com apenas um tipo de despesa
  Dado que o mês atual só tem lançamentos do tipo variable (sem fixed e sem credit)
  Quando o dashboard é carregado
  Então o gráfico A exibe apenas uma barra horizontal (Variáveis)
  E os tipos com valor zero não aparecem como barras

Cenário: Filtro de pessoa ativo
  Dado que o filtro de responsável está ativo para "Diego"
  Quando o dashboard é carregado
  Então o gráfico A exibe apenas despesas atribuídas a Diego
  E lançamentos sem responsável ou de Camila não são incluídos
```

### US-02 — Evolução receita vs despesa

```gherkin
Cenário: Visualização padrão de 6 meses
  Dado que o mês atual é junho/2026
  Quando o dashboard é carregado
  Então o gráfico B exibe 6 grupos de barras no eixo X: jan/26, fev/26, mar/26, abr/26, mai/26, jun/26
  E cada grupo tem duas barras: receita (verde) e saída total (vermelho)
  E o eixo Y começa em zero
  E os rótulos do eixo X usam o formato abreviado do mês (ex: "jan", "fev")

Cenário: Mês sem lançamentos na série histórica
  Dado que fevereiro/2026 não tem nenhum lançamento
  Quando o dashboard é carregado
  Então fevereiro/2026 aparece no gráfico B com ambas as barras em zero
  E os outros meses são exibidos normalmente

Cenário: Navegação de mês altera o histórico
  Dado que o dashboard está exibindo junho/2026
  Quando o usuário clica na seta para o mês anterior (maio/2026)
  Então o gráfico B redesenha exibindo: dez/25, jan/26, fev/26, mar/26, abr/26, mai/26
  E o último mês do gráfico corresponde ao mês selecionado no dashboard
```

### US-03 — Atualização ao trocar mês

```gherkin
Cenário: Troca de mês redesenha ambos os gráficos
  Dado que os gráficos A e B estão renderizados para o mês atual
  Quando o usuário clica na seta de navegação de mês (anterior ou próximo)
  Então ambos os gráficos são destruídos e recriados com os dados do novo mês selecionado
  E os valores nos gráficos correspondem ao mês exibido no cabeçalho do dashboard
```

### US-04 — Filtro de pessoa

```gherkin
Cenário: Ativar filtro de pessoa recalcula gráficos
  Dado que os gráficos estão renderizados sem filtro de pessoa
  Quando o usuário seleciona o filtro "Diego" na barra de pessoas do dashboard
  Então ambos os gráficos são redesenhados com dados filtrados por Diego
  E o gráfico B exibe o histórico de receitas e saídas apenas de Diego nos últimos 6 meses

Cenário: Remover filtro de pessoa restaura visão geral
  Dado que o filtro de pessoa "Diego" está ativo
  Quando o usuário remove o filtro (clica em "Todos")
  Então ambos os gráficos são redesenhados com os dados de todos os responsáveis
```

### Cenários técnicos e de borda

```gherkin
Cenário: Renderização offline
  Dado que o app foi aberto anteriormente com rede disponível
  E o Service Worker cacheou js/chart.min.js
  Quando o usuário abre o app sem conexão
  Então os gráficos são renderizados normalmente a partir do cache

Cenário: Sem dados no banco (primeiro uso)
  Dado que o IndexedDB está vazio (nenhum lançamento cadastrado)
  Quando o dashboard é carregado
  Então o gráfico A exibe mensagem "Sem despesas neste mês"
  E o gráfico B exibe 6 meses com todas as barras em zero sem erro no console

Cenário: Troca de tema claro/escuro
  Dado que os gráficos estão renderizados no tema escuro
  Quando o usuário alterna para o tema claro em Configurações
  E retorna ao dashboard
  Então os gráficos são renderizados com as cores do tema claro (backgrounds, bordas, textos)
  E não há elementos com cores de tema incorreto

Cenário: Resize da tela (rotação de dispositivo)
  Dado que os gráficos estão renderizados em orientação retrato
  Quando o dispositivo é girado para paisagem
  Então os gráficos se redimensionam automaticamente para ocupar a nova largura disponível
  Sem recarregar a página
```

---

## Regras de Negócio

| ID | Regra | Detalhe | Origem |
|----|-------|---------|--------|
| RN-01 | Saída total = expense + credit | O gráfico B usa `expense + credit` como saída, idêntico ao cálculo da barra de comprometimento existente | Consistência com `renderDash()` atual |
| RN-02 | Gráfico A omite tipos com valor zero | Tipos sem despesa no mês não aparecem como barras vazias | Legibilidade |
| RN-03 | Gráfico A não renderiza quando total de saídas é zero | Exibe mensagem no lugar | Evitar gráfico vazio sem sentido |
| RN-04 | Gráfico B sempre exibe 6 meses | Mesmo que algum mês tenha valores zero | Consistência visual |
| RN-05 | Gráfico B: o último mês da série é sempre o mês selecionado no dashboard | Ao navegar para março, a série vai de out/ano anterior até mar | Consistência com navegação existente |
| RN-06 | Filtro de pessoa afeta ambos os gráficos | Mesma lógica de filtro aplicada em `renderDash()` — `pessoaFilter` global | Consistência com cards de resumo |
| RN-07 | Instâncias de Chart devem ser destruídas antes de recriar | Chamar `chart.destroy()` antes de `new Chart()` no mesmo canvas | Evitar vazamento de memória e sobreposição de gráficos |
| RN-08 | Chart.js carregado antes de transactions.js | `<script src="js/chart.min.js">` deve preceder `<script src="js/transactions.js">` no `index.html` | Dependência de variável global `Chart` |
| RN-09 | chart.min.js adicionado ao urlsToCache do sw.js | Entry: `self.registration.scope + 'js/chart.min.js'` | Garantia offline |
| RN-10 | Labels de tipo em português | `fixed` → "Fixas", `variable` → "Variáveis", `credit` → "Cartão" | Consistência com o resto do app |
| RN-11 | Cores do gráfico A: fixed=azul, variable=âmbar, credit=roxo | Mesmas cores dos ícones de TX já no CSS: `--blue`, `--amber`, `--purple` | Consistência visual |
| RN-12 | Cores do gráfico B: receita=verde, saída=vermelho | `--green` e `--red` | Consistência com stat cards |

---

## Posicionamento no DOM

Os gráficos são inseridos no `#page-dash` após o `#pessoa-summary-card`, como dois novos cards com estrutura `.card`:

```
#page-dash
  ├── .page-header
  ├── .month-nav
  ├── #install-banner
  ├── #person-filter-bar-dash
  ├── #last-update-bar
  ├── .summary-grid (#summary-cards)          ← cards de resumo
  ├── .card > #prog-area                      ← barra de comprometimento
  ├── .card #pessoa-summary-card              ← por responsável (condicional)
  ├── .card #chart-composition-card           ← NOVO: Gráfico A
  └── .card #chart-history-card               ← NOVO: Gráfico B
```

Os dois `<div id="chart-*-card">` devem estar no HTML estático de `#page-dash`. O conteúdo interno (canvas + título) é gerado por `renderDash()`.

IDs de canvas: `canvas id="chart-composition"` e `canvas id="chart-history"`. As instâncias Chart são armazenadas em variáveis globais (`let _chartComposition`, `let _chartHistory`) declaradas em `globals.js` para permitir `destroy()` antes de recriar.

---

## Dependências

| Tipo | Nome | Natureza | Responsável | Status |
|------|------|---------|-------------|--------|
| Lib JS | Chart.js 4.4.x (UMD bundle) | Bloqueante — sem ela os gráficos não existem | Senior Dev (download e inclusão) | A fazer |
| Função existente | `calcMonth(all, y, m)` em `globals.js` | Não-bloqueante — já existe e funciona | — | Disponível |
| Variável global | `dbAll()`, `curYear`, `curMonth`, `pessoaFilter` | Não-bloqueante — já existem | — | Disponível |
| CSS | Variáveis CSS `--green`, `--red`, `--blue`, `--amber`, `--purple`, `--bg2`, `--bg3`, `--text2`, `--text3` | Não-bloqueante — já definidas em `:root` e `body.light` | — | Disponível |
| SW | Entrada `js/chart.min.js` em `urlsToCache` | Bloqueante para offline | Senior Dev | A fazer |

---

## MVP vs Escopo Futuro

| Funcionalidade | Sprint 3 (MVP) | Futuro |
|----------------|---------------|--------|
| Gráfico A: barras horizontais de composição (3 tipos) | Sim | — |
| Gráfico B: barras verticais receita vs saída 6 meses | Sim | — |
| Reage à navegação de mês | Sim | — |
| Reage ao filtro de pessoa | Sim | — |
| Temas claro/escuro | Sim | — |
| Offline via cache local | Sim | — |
| Categorias customizadas por subitem (pizza detalhada) | — | Requer taxonomy nova |
| Gráfico de saldo acumulado (linha) | — | Avaliar no Sprint 4 junto com melhoria de projeção |
| Drill-down ao clicar na barra | — | Avaliar impacto vs complexidade |
| Exportar gráfico como imagem | — | Baixa prioridade |

---

## Definition of Ready (DoR)

Esta spec está pronta para entrar em desenvolvimento quando:

- [x] Contexto claro: problema e justificativa documentados
- [x] User stories no formato correto
- [x] Critérios de aceite em BDD sem ambiguidade
- [x] Regras de negócio explícitas e verificáveis
- [x] Escopo MVP separado do escopo futuro
- [x] Dependências identificadas (Chart.js, urlsToCache, globals)
- [ ] Tech Lead confirmou viabilidade da integração Chart.js no contexto vanilla sem build
- [ ] Senior Dev confirmou que `calcMonth` aceita ser chamada com `all` já em memória (verificar assinatura exata)

---

## Definition of Done (DoD)

Uma história só está pronta quando todos os itens abaixo forem verdadeiros:

- [ ] Gráfico A renderiza corretamente para meses com dados, com zero dados, e com dados parciais (1 ou 2 tipos)
- [ ] Gráfico B renderiza os 6 meses corretos ao navegar entre meses
- [ ] Ambos os gráficos reagem ao filtro de pessoa sem recarregar a página
- [ ] `chart.destroy()` é chamado antes de recriar cada gráfico (verificado no DevTools: sem canvas fantasma)
- [ ] `js/chart.min.js` presente no repositório e listado em `urlsToCache` do `sw.js`
- [ ] `<script src="js/chart.min.js">` carregado antes de `transactions.js` no `index.html`
- [ ] Sem erros no console em nenhum cenário testado
- [ ] Testado no tema escuro e no tema claro
- [ ] Testado offline (DevTools > Network > Offline após primeira carga)
- [ ] Testado em viewport mobile (~375px largura)
- [ ] `node --check js/transactions.js` sem erros de sintaxe após alterações
- [ ] Code Reviewer aprovou sem bloqueantes
- [ ] QA validou todos os cenários BDD acima e aprovou explicitamente
- [ ] PO aprovou o resultado visual

---

## Restrições Técnicas Obrigatórias

Estas restrições têm precedência sobre qualquer preferência de implementação:

1. **Sem `<script type="module">`** — Chart.js deve ser o bundle UMD (`chart.umd.min.js`) que expõe `Chart` como variável global no `window`
2. **Sem `export`/`import`** — todo o código de gráficos fica em funções declaradas normalmente em `transactions.js` (onde vive `renderDash`)
3. **Sem template literals aninhados** — ao montar HTML dos cards de gráfico, usar concatenação de strings quando houver map/join interno
4. **Sem `JSON.stringify` em atributos `onclick`** — não aplicável aqui (gráficos não têm botões de edição), mas manter a regra em mente se houver tooltips customizados
5. **Instâncias Chart em variáveis globais** — declarar `let _chartComposition = null` e `let _chartHistory = null` em `globals.js`; chamar `.destroy()` antes de recriar
6. **`chart.min.js` local e no urlsToCache** — CDN não garante offline; versão local é obrigatória
7. **Verificação de sintaxe obrigatória após qualquer edição** — `node --check js/transactions.js` e `node --check js/globals.js`
8. **CACHE do SW deve ser incrementado** — ao adicionar `chart.min.js` ao `urlsToCache`, verificar se o nome do cache (`financas-v4`) precisa ser incrementado para `financas-v5` para forçar re-instalação do SW com o novo arquivo
