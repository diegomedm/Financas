# QA — Sprint 4: Melhorias na Aba de Projeção

**Versão:** 1.0
**Data:** 2026-06-27
**Agente:** QA Engineer
**Status:** Liberado para testes manuais

---

## Resultado da Verificação Estática

### node --check

| Arquivo | Resultado |
|---------|-----------|
| `js/globals.js` | OK — sem erros de sintaxe |
| `js/projection.js` | OK — sem erros de sintaxe |
| `js/pessoas.js` | OK — sem erros de sintaxe |

`index.html` não é verificado via node --check — inspecionado manualmente.

### Restrições técnicas obrigatórias

| Restrição | `globals.js` | `projection.js` | `pessoas.js` | `index.html` |
|-----------|-------------|----------------|-------------|-------------|
| Sem `export` / `import` JS | OK | OK | OK | OK (o `@import` na linha 14 é CSS de fonte — nao e violacao) |
| Sem `<script type="module">` | — | — | — | OK |
| Sem nested template literals | OK | OK | PRE-EXISTENTE (linhas 55 e 60 sao anteriores a Sprint 4 — fora do escopo desta revisao) |
| Sem `JSON.stringify` em `onclick` | OK | OK | OK | OK |

**Observacao sobre `pessoas.js`:** as linhas 55 e 60 contêm nested template literals pré-existentes (confirmado via `git diff`). A unica mudança desta sprint em `pessoas.js` foi a linha 173 — adicionar `'proj'` ao array. Nao ha violacao introduzida pelo Sprint 4.

### Verificações adicionais

- `_budgetDoneAll()` existe em `db.js` como função global (sem `export`), acessível de `projection.js` — confirmado.
- Formato da chave de done em `projection.js`: `item.id+'_'+y+mm` onde `mm=String(m+1).padStart(2,'0')` — identico ao formato de `doneKey()` em `db.js`. Sem risco de mismatch.
- `#person-filter-bar-proj` presente no HTML na posicao correta (linha 420, antes do `.card` de projecao).
- CSS do seletor na linha 58 do `index.html` inclui `#person-filter-bar-proj` — correcao do Code Review aplicada.
- `'proj'` incluído no array de `renderPersonFilterBars()` em `pessoas.js` linha 173.
- `projPeriods` inicializado via IIFE em `globals.js` linha 8 com validacao e fallback para 3.
- `_syncProjTabActive()` chamada ao final de `renderProj()` para sincronizar o botao ativo apos restauracao do localStorage.
- `budgetAll()` e `_budgetDoneAll()` chamadas uma unica vez antes do loop de meses — RN-01 atendido.

**Veredicto estatico: LIBERADO para testes manuais.**

---

## Requisitos do Harness

### Dados necessários para os testes manuais

- Pelo menos duas pessoas cadastradas (ex: Diego e Camila)
- Itens de orçamento:
  - Um item `recurrence: 'always'`, `type: 'fixed'`, valor conhecido (ex: R$ 1.500)
  - Um item `recurrence: 'always'`, `type: 'income'`, valor conhecido (ex: R$ 5.000)
  - Um item `recurrence: 'once'`, `budgetMonth` e `budgetYear` dentro do horizonte de 6 meses, `type: 'fixed'`, valor conhecido (ex: R$ 800)
  - Um item `recurrence: 'always'` com `delayedSkipMonths` incluindo o mês atual
  - Um item de orçamento marcado como realizado (toggleBudgetDone ativado) no mês corrente
- Lançamentos (store tx) de ambas as pessoas para o mês corrente

### Isolamento necessário

- localStorage pode ser manipulado diretamente pelo console do browser para os testes de CA-01
- Nenhum dado externo — aplicação usa IndexedDB local

### Pré-condições gerais

- App rodando localmente (arquivo `index.html` aberto no browser ou via servidor local)
- Browser com DevTools disponível (console, Application > LocalStorage, Application > IndexedDB)
- Nenhum erro preexistente no console antes de iniciar os testes

---

## Plano de Testes — Casos de Teste

### CA-01 — Persistência do horizonte

---

**CT-001 [CA-01]: Horizonte de 6 meses persiste após recarregar**
```
Tipo: manual — integração com localStorage
Prioridade: crítico
Pré-condição: App aberto na aba Projeção; localStorage pode estar zerado
Passos:
  1. Navegar para aba Projeção
  2. Clicar no botão "6"
  3. Verificar que a tabela exibe 6 linhas de meses
  4. Recarregar a página (F5 ou Ctrl+R)
  5. Navegar para aba Projeção (se necessário)
Resultado esperado:
  - Tabela exibe 6 linhas de meses
  - Botão "6" tem classe active (destaque visual)
  - Botões "3" e "12" não têm classe active
  - localStorage.getItem('projPeriods') === '6' (verificar no DevTools)
Resultado em falha: projeção exibe 3 meses (fallback incorreto) ou botão errado ativo
```

---

**CT-002 [CA-01]: Horizonte de 12 meses persiste após recarregar**
```
Tipo: manual — integração com localStorage
Prioridade: alto
Pré-condição: App aberto na aba Projeção
Passos:
  1. Clicar no botão "12"
  2. Recarregar a página
  3. Navegar para aba Projeção
Resultado esperado:
  - Tabela exibe 12 linhas de meses
  - Botão "12" com classe active
  - localStorage.getItem('projPeriods') === '12'
Resultado em falha: número de linhas diferente de 12 ou botão errado ativo
```

---

**CT-003 [CA-01]: Primeiro uso — sem valor salvo no localStorage**
```
Tipo: manual — edge case
Prioridade: alto
Pré-condição:
  - Abrir DevTools > Application > Local Storage
  - Remover a chave 'projPeriods' se existir (ou usar janela anônima)
Passos:
  1. Recarregar o app com localStorage sem a chave 'projPeriods'
  2. Navegar para aba Projeção
Resultado esperado:
  - Tabela exibe 3 linhas de meses (padrão)
  - Botão "3" tem classe active
Resultado em falha: tabela com número diferente de 3 ou botão errado ativo
```

---

**CT-004 [CA-01]: Fallback para 3 quando localStorage contém valor inválido**
```
Tipo: manual — edge case / robustez
Prioridade: alto
Pré-condição: App carregado
Passos:
  1. Abrir DevTools > Application > Local Storage
  2. Definir manualmente: localStorage.setItem('projPeriods', '7')
  3. Recarregar a página
  4. Navegar para aba Projeção
Resultado esperado:
  - Tabela exibe 3 linhas de meses (fallback seguro)
  - Botão "3" tem classe active
  - Nenhum erro no console
Resultado em falha: tabela com 7 linhas ou erro no console
```

---

**CT-005 [CA-01]: Fallback para 3 quando localStorage contém string não numérica**
```
Tipo: manual — edge case / robustez
Prioridade: médio
Pré-condição: App carregado
Passos:
  1. No console: localStorage.setItem('projPeriods', 'abc')
  2. Recarregar a página
  3. Navegar para aba Projeção
Resultado esperado:
  - projPeriods assume 3 (parseInt('abc') === NaN, nao é 3/6/12)
  - Botão "3" ativo
Resultado em falha: erro no console ou comportamento inesperado
```

---

### CA-02 — Orçamento incluído nos meses futuros

---

**CT-006 [CA-02]: Item fixo 'always' aparece em todos os meses projetados**
```
Tipo: manual — integração com IndexedDB
Prioridade: crítico
Pré-condição:
  - Existe item de orçamento: recurrence='always', type='fixed', value=1500
  - Item não marcado como realizado em nenhum dos próximos meses
  - Nenhum outro item de orçamento do mesmo tipo e valor cadastrado (para isolar)
Passos:
  1. Anotar o valor de "Saída" de cada linha na aba Projeção (horizonte 3 meses)
  2. Criar o item de orçamento descrito acima (se não existir)
  3. Recarregar / rerenderizar a projeção
  4. Comparar valor de "Saída" de cada linha com o valor anotado
Resultado esperado:
  - Cada linha de mês tem R$ 1.500,00 a mais na coluna Saída em relação ao estado anterior
  - Diferença é consistente nos 3 meses
Resultado em falha: valor diferente de 1500 de diferença, ou diferença inconsistente entre meses
```

---

**CT-007 [CA-02]: Item de receita 'always' aparece em todos os meses**
```
Tipo: manual — integração
Prioridade: crítico
Pré-condição:
  - Existe item: recurrence='always', type='income', value=5000
  - Item não realizado em nenhum mês futuro
Passos:
  1. Anotar valor de "Entrada" antes de criar o item
  2. Criar o item e renderizar projeção
  3. Comparar "Entrada" de cada linha
Resultado esperado:
  - Cada linha tem R$ 5.000,00 a mais na coluna Entrada
Resultado em falha: valor diferente ou ausente em algum mês
```

---

**CT-008 [CA-02]: Item pontual 'once' aparece somente no mês correto**
```
Tipo: manual — integração
Prioridade: crítico
Pré-condição:
  - Horizonte configurado para 6 meses
  - Existe item: recurrence='once', budgetMonth=M+2 (dois meses à frente), budgetYear=corrente, type='fixed', value=800
  - Item não realizado
Passos:
  1. Visualizar aba Projeção com horizonte 6
  2. Identificar a linha do mês M+2
  3. Verificar os outros meses
Resultado esperado:
  - Apenas a linha do mês M+2 inclui R$ 800 a mais na Saída
  - Outros 5 meses não são afetados por este item
Resultado em falha: valor aparecendo em mais de um mês ou no mês errado
```

---

**CT-009 [CA-02]: Item já realizado não duplica na projeção**
```
Tipo: manual — edge case crítico (risco de dupla contagem)
Prioridade: crítico
Pré-condição:
  - Existe item de orçamento 'always', type='fixed', value=500
  - Marcar esse item como realizado no mês corrente (botão de check no orçamento)
  - Isso gera um TX na store tx
Passos:
  1. Marcar o item como realizado via interface de Orçamento
  2. Navegar para aba Projeção
  3. Verificar a linha do mês corrente
  4. Verificar se o valor R$ 500 aparece via TX (calcMonth) e NÃO via budget
Resultado esperado:
  - O valor aparece uma única vez na linha do mês corrente
  - A linha de outros meses (onde item não está realizado) inclui os R$ 500 normalmente via budget
Resultado em falha: valor duplicado no mês corrente (R$ 1.000 quando deveria ser R$ 500)
```

---

**CT-010 [CA-02]: Item com delayedSkipMonths não aparece no mês skipado**
```
Tipo: manual — edge case
Prioridade: alto
Pré-condição:
  - Existe item fixo 'always' com delayedSkipMonths incluindo o mês atual (mês corrente)
  - Item com value=300
Passos:
  1. Visualizar aba Projeção
  2. Localizar a linha do mês corrente
  3. Verificar a Saída na linha do mês corrente vs. outros meses
Resultado esperado:
  - Mês corrente: item não contribui para Saída (excluído pelo skip)
  - Próximo mês (sem skip): item contribui normalmente com R$ 300 na Saída
Resultado em falha: item aparecendo no mês skipado
```

---

**CT-011 [CA-02]: Nota "Inclui itens de orçamento pendentes" exibida**
```
Tipo: manual — UI / RN-05
Prioridade: médio
Pré-condição: Qualquer estado de dados
Passos:
  1. Navegar para aba Projeção
  2. Visualizar a área abaixo da linha de TOTAL
Resultado esperado:
  - Texto "Inclui itens de orçamento pendentes" visível abaixo do total
Resultado em falha: texto ausente ou em posição incorreta
```

---

**CT-012 [CA-02]: Mês atual com budget parcialmente realizado**
```
Tipo: manual — integração / edge case
Prioridade: alto
Pré-condição:
  - 3 itens de orçamento 'always' para o mês corrente (valores distintos: 100, 200, 300)
  - 2 deles marcados como realizados (geram TX)
  - 1 ainda pendente (value=300)
Passos:
  1. Visualizar linha do mês corrente na aba Projeção
  2. Calcular manualmente: Saída esperada = TX dos 2 realizados via calcMonth + 300 do pendente
Resultado esperado:
  - Saída na linha do mês corrente = soma dos 2 TX (via calcMonth) + 300 (via budget pendente)
  - Nenhuma duplicação dos 2 itens já realizados
Resultado em falha: valor diferente do esperado (dupla contagem ou item pendente ausente)
```

---

### CA-03 — Projeção filtrada por pessoa

---

**CT-013 [CA-03]: Barra de filtro de pessoa presente na aba Projeção**
```
Tipo: manual — UI
Prioridade: crítico
Pré-condição: Pelo menos uma pessoa cadastrada no app
Passos:
  1. Navegar para aba Projeção
Resultado esperado:
  - Barra de filtro com chip "Todos" e chips das pessoas cadastradas exibida acima do card de projeção
  - Visual idêntico às barras do Dashboard e Lançamentos
Resultado em falha: barra ausente ou posicionada dentro do card
```

---

**CT-014 [CA-03]: Filtro ativo filtra TX da projeção**
```
Tipo: manual — integração
Prioridade: crítico
Pré-condição:
  - Diego e Camila cadastrados
  - Diego tem lançamentos (store tx) no mês corrente — valor conhecido (ex: R$ 2.000 receita)
  - Camila tem lançamentos — valor diferente e conhecido (ex: R$ 1.500 receita)
  - Filtro "Todos" ativo
Passos:
  1. Anotar valor de Entrada na linha do mês corrente (todos: R$ 3.500)
  2. Clicar no chip "Diego" na barra de filtro
  3. Observar a linha do mês corrente
Resultado esperado:
  - Entrada passa a exibir apenas os TX de Diego (R$ 2.000)
  - Valor de Camila não aparece
Resultado em falha: valor não muda ou inclui valores de Camila
```

---

**CT-015 [CA-03]: Filtro ativo filtra itens de orçamento da projeção**
```
Tipo: manual — integração
Prioridade: crítico
Pré-condição:
  - Diego tem item de orçamento 'always', type='fixed', value=1000, pessoaId=Diego
  - Camila tem item de orçamento 'always', type='fixed', value=800, pessoaId=Camila
  - Ambos não realizados
Passos:
  1. Com filtro "Todos": verificar Saída futura inclui 1000 + 800 = 1800 por mês de budget
  2. Selecionar filtro "Diego"
  3. Verificar Saída futura
Resultado esperado:
  - Com filtro Diego: apenas R$ 1.000 de budget na Saída (item de Camila excluído)
Resultado em falha: R$ 1.800 continua aparecendo (filtro nao aplicado ao budget) ou R$ 0 (bug)
```

---

**CT-016 [CA-03]: Item de orçamento sem pessoaId excluído quando filtro ativo**
```
Tipo: manual — edge case / RN-02
Prioridade: alto
Pré-condição:
  - Existe item de orçamento 'always', type='fixed', value=400, pessoaId=null (sem responsável)
  - Filtro de Diego ativo
Passos:
  1. Verificar linha de mês futuro na projeção com filtro Diego
Resultado esperado:
  - Item de R$ 400 (sem pessoaId) NÃO aparece na projeção filtrada (consistente com renderBudget)
Resultado em falha: item sem responsável aparece mesmo com filtro ativo
```

---

**CT-017 [CA-03]: Filtro "Todos" exibe dados de todas as pessoas**
```
Tipo: manual — happy path
Prioridade: crítico
Pré-condição: Dois filtros de pessoa disponíveis; filtro "Todos" ativo
Passos:
  1. Com filtro "Todos", verificar que TX e budget de ambas as pessoas são incluídos
Resultado esperado:
  - Valores da projeção incluem dados de todas as pessoas
Resultado em falha: dados de alguma pessoa faltando com filtro "Todos"
```

---

**CT-018 [CA-03]: Trocar filtro de pessoa re-renderiza imediatamente**
```
Tipo: manual — comportamento reativo
Prioridade: alto
Pré-condição: Aba Projeção visível; dois chips de pessoa disponíveis
Passos:
  1. Com aba Projeção visível, clicar em chip "Diego"
  2. Observar a tabela sem navegar para outra aba
Resultado esperado:
  - Tabela redesenha imediatamente com dados filtrados
  - Nenhuma necessidade de navegar para outra aba e voltar
Resultado em falha: tabela não atualiza até trocar de aba
```

---

**CT-019 [CA-03]: Chip ativo fica com destaque visual correto**
```
Tipo: manual — UI
Prioridade: baixo
Pré-condição: Barra de filtro visível na aba Projeção
Passos:
  1. Clicar no chip de Diego
  2. Verificar estado visual de todos os chips
  3. Clicar em "Todos"
  4. Verificar novamente
Resultado esperado:
  - Chip selecionado tem borda colorida (classe active) e destaque
  - Demais chips sem destaque
  - Ao clicar "Todos", chip "Todos" fica ativo
Resultado em falha: dois chips ativos simultaneamente ou nenhum ativo
```

---

### CA-04 — Total acumulado

---

**CT-020 [CA-04]: Linha de total reflete TX + budget**
```
Tipo: manual — integração
Prioridade: alto
Pré-condição:
  - Horizonte de 3 meses
  - Dados conhecidos: calcular manualmente soma esperada de 3 meses (TX + budget pendente)
Passos:
  1. Anotar os valores de Entrada e Saída de cada linha individual
  2. Somar manualmente
  3. Comparar com a linha "TOTAL 3 MESES"
Resultado esperado:
  - Total Entrada = soma das 3 Entradas individuais
  - Total Saída = soma das 3 Saídas individuais
  - Saldo acumulado = Total Entrada - Total Saída
Resultado em falha: total diverge da soma manual das linhas
```

---

**CT-021 [CA-04]: Texto do total atualiza ao mudar horizonte**
```
Tipo: manual — UI
Prioridade: médio
Pré-condição: Aba Projeção visível
Passos:
  1. Com horizonte 3: verificar texto "TOTAL 3 MESES"
  2. Clicar no botão "6"
  3. Verificar texto do total
Resultado esperado:
  - Texto muda para "TOTAL 6 MESES"
  - Valores do total somam os 6 meses
Resultado em falha: texto não atualiza ou total não bate com 6 meses
```

---

### CA-05 — Edge cases

---

**CT-022 [CA-05]: App sem lançamentos e sem orçamento — sem erro**
```
Tipo: manual — edge case
Prioridade: crítico
Pré-condição:
  - IndexedDB limpo (sem TX e sem budget)
  - Ou usar janela anônima em um perfil sem dados
Passos:
  1. Navegar para aba Projeção
  2. Verificar console do DevTools
Resultado esperado:
  - Linhas de meses exibidas com valores R$ 0,00
  - Nenhum erro no console
  - App não trava nem fica em loading infinito
Resultado em falha: erro no console (TypeError, ReferenceError etc.) ou tela em branco
```

---

**CT-023 [CA-05]: Mudança de horizonte não gera erro com budget presente**
```
Tipo: manual — integração
Prioridade: alto
Pré-condição: Itens de orçamento cadastrados; app na aba Projeção
Passos:
  1. Clicar em "3", depois "6", depois "12"
  2. Monitorar console a cada clique
Resultado esperado:
  - Tabela redesenha sem erros no console em todos os horizontes
  - Número de linhas bate com o botão selecionado (3, 6 ou 12)
Resultado em falha: erro no console em algum horizonte ou número errado de linhas
```

---

**CT-024 [CA-05]: Navegação entre abas preserva estado do filtro e horizonte**
```
Tipo: manual — navegação
Prioridade: médio
Pré-condição: Filtro "Diego" ativo, horizonte "6" selecionado na aba Projeção
Passos:
  1. Navegar para aba Dashboard
  2. Navegar de volta para aba Projeção
Resultado esperado:
  - Horizonte ainda é 6 meses
  - Filtro "Diego" ainda ativo
  - Tabela exibida com os mesmos dados filtrados
Resultado em falha: filtro ou horizonte resetados ao voltar para a aba
```

---

## Requisitos não-funcionais — Verificações complementares

**RN-01 — Uma única chamada ao banco:**
Verificar no código (estático — já confirmado na revisão): `budgetAll()` e `_budgetDoneAll()` chamados uma vez antes do `for`. Nenhum CT manual necessário além da revisão estática.

**RN-05 — Nota textual:** coberto pelo CT-011.

**RN-06 — Items realizados não duplicam:** coberto pelo CT-009 e CT-012.

---

## Matriz de Cobertura

| Critério de Aceite | Casos de Teste | Prioridade máxima |
|--------------------|---------------|-------------------|
| CA-01 — Persistência horizonte | CT-001, CT-002, CT-003, CT-004, CT-005 | Crítico |
| CA-02 — Budget na projeção | CT-006, CT-007, CT-008, CT-009, CT-010, CT-011, CT-012 | Crítico |
| CA-03 — Filtro por pessoa | CT-013, CT-014, CT-015, CT-016, CT-017, CT-018, CT-019 | Crítico |
| CA-04 — Total acumulado | CT-020, CT-021 | Alto |
| CA-05 — Edge cases | CT-022, CT-023, CT-024 | Crítico |

**Total: 24 casos de teste**

---

## Veredicto Final — Verificação Estática

**LIBERADO para testes manuais.**

Todos os critérios estáticos foram atendidos:
- `node --check` aprovado nos 3 arquivos JS modificados
- Nenhuma restrição técnica violada pelo Sprint 4
- Nested template literals em `pessoas.js` são pré-existentes, fora do escopo desta sprint
- Formato de chave de `budgetDone` em `projection.js` consistente com `db.js`
- `_budgetDoneAll()` acessível globalmente — confirmado em `db.js`
- `#person-filter-bar-proj` presente no HTML na posição correta
- CSS do seletor inclui `#person-filter-bar-proj` (correcao do Code Review aplicada)
- `_syncProjTabActive()` chamada ao final de `renderProj()` — botão ativo sincronizado após restauração do localStorage
