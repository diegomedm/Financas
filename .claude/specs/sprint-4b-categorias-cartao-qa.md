# QA — Sprint 4b: Categorias Orçadas de Cartão

**Versão:** 1.0
**Data:** 2026-06-27
**Agente:** QA Engineer
**Status:** Verificação estática CONCLUÍDA — pronto para testes manuais

---

## 1. Verificações Estáticas

### 1.1 Sintaxe — node --check

| Arquivo | Resultado |
|---------|-----------|
| `js/db.js` | PASSOU (exit 0) |
| `js/cards-modal.js` | PASSOU (exit 0) |
| `js/cards-render.js` | PASSOU (exit 0) |

### 1.2 Restrições técnicas obrigatórias

| Verificação | Resultado | Detalhe |
|-------------|-----------|---------|
| Sem `export`/`import` nos arquivos JS | PASSOU | Nenhuma ocorrência nos 3 arquivos |
| Sem `<script type="module">` no index.html | PASSOU | Nenhuma ocorrência |
| Sem nested template literals | PASSOU | Seção "Por Categoria" usa IIFE síncrona dentro de template; select de categoria populado via setTimeout; sem backtick dentro de backtick nos 3 arquivos |
| `JSON.stringify` em `onclick` | CONFORME | Única ocorrência é a pré-existente na linha 175 de `cards-render.js` (`showAddGastoModal`) — documentada e aceita; novas funções de categoria usam apenas ID numérico (`onclick="showEditCategoriaModal('+cat.id+')"`) |
| `JSON.stringify` em `onclick` (novos trechos) | PASSOU | Ausente nos novos trechos de modal de categoria e seção de gerenciamento |
| CRLF (`\r\n`) nos arquivos JS | PASSOU | 0 ocorrências nos 3 arquivos |
| Guard `!objectStoreNames.contains` no `onupgradeneeded` | PASSOU | Todas as 8 stores usam guard — inclusive `categoriasCartao` |
| Versão do IndexedDB bumpeada para 6 | PASSOU | `indexedDB.open('financas_pwa_v2', 6)` |
| onclick do modal de categoria atribuído via setTimeout | PASSOU | `saveBtn.onclick = saveCategoria` e `saveBtn.onclick = function(){ saveEditCategoria(id); }` — padrão idêntico ao `showAddRecorrenteModal` |
| `categoriaId` capturado antes do bloco `groupId` em `saveGastoEdit` | PASSOU | Linha 488: `const categoriaId = parseInt(document.getElementById('cg-categoria')?.value)\|\|null;` — antes do `if(existing.groupId)` na linha 495 |
| Ordem de scripts em `index.html` | PASSOU | `db.js` antes de `cards-modal.js` antes de `cards-render.js` |
| `#categorias-cartao-section` presente em `index.html` | PASSOU | Linha 535: `<div id="categorias-cartao-section" ...>` dentro de `#page-cards`, antes de `#cards-list` |

### 1.3 Análise de risco — item observado

**Ordenação de gastos na fatura (linha 202 de `cards-render.js`)**

```js
gastosFatura.sort((a,b) => (b.date||'') > (a.date||'') ? -1 : 1)
```

Análise matemática: quando `b.date > a.date` (b mais recente), retorna -1, o que em `Array.sort` coloca `a` antes de `b` — resultado: ordenação crescente (mais antigo no topo). O Code Reviewer declarou esta ordenação como "correta" e "pré-existente" no sprint 4b. A spec de sprint 4b não define ordenação de gastos. Não é bloqueante para este sprint — registrado como observação para o backlog.

**Registrar em débito técnico:** sort `(b > a) ? -1 : 1` produz ordenação crescente (mais antigo primeiro), não decrescente. Se o comportamento desejado for "mais recente no topo", a expressão correta seria `(a.date||'') > (b.date||'') ? -1 : 1` ou `(b.date||'').localeCompare(a.date||'')`. Confirmar com PO antes de corrigir.

---

## 2. Plano de Testes Manuais

### Estratégia

| Camada | Ferramenta | Quantidade | Critério |
|--------|-----------|------------|---------|
| Teste manual no browser | Chrome (DevTools aberto) | 32 casos | Todos os CAs (CA-01 a CA-07) + RNs críticos |
| Teste de migração IndexedDB | Chrome (dados reais do backup) | 3 casos | CA-07 — upgrade v5→v6 sem perda de dados |

### Pré-condições globais

- App servido localmente (ex: `http://localhost:5500` ou `file://...`)
- DevTools aberto na aba Console — qualquer erro durante os testes é bloqueante
- Antes de iniciar CA-07: ter o arquivo `G:\Meu Drive\financas_backup_20260626.json` disponível para restauração
- Estado limpo para CA-01 a CA-06: nenhuma categoria cadastrada (ou limpar store via DevTools > Application > IndexedDB > categoriasCartao antes de começar)

---

## 3. Casos de Teste

### CA-01 — Criar categoria

---

**CT-001 [CA-01]: Criar categoria com nome e valor válidos**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Aba Cartão aberta; nenhuma categoria cadastrada
Passos:
  1. Verificar que a seção "Categorias Orçadas" está visível no topo da aba (acima dos cards)
  2. Verificar que o texto "Nenhuma categoria. Toque em + Categoria." está visível
  3. Tocar em "+ Categoria"
  4. Verificar que o modal abre com título "Nova Categoria"
  5. Verificar que existem os campos "Nome" e "Valor Orçado Mensal"
  6. Preencher Nome = "Gasolina"
  7. Preencher Valor = "300"
  8. Tocar em "Salvar"
Resultado esperado:
  - Modal fecha sem erro
  - Toast "Categoria adicionada!" aparece
  - Categoria "Gasolina" aparece na seção com "R$ 300,00/mês"
  - Texto de estado vazio desaparece
  - Console sem erros
```

**CT-002 [CA-01]: Tentativa de salvar categoria sem nome**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Modal de categoria aberto (CT-001 passo 3)
Passos:
  1. Deixar campo Nome vazio
  2. Preencher Valor = "200"
  3. Tocar em "Salvar"
Resultado esperado:
  - Mensagem de erro aparece no campo Nome ("Informe o nome" ou similar)
  - Modal permanece aberto
  - Nenhuma categoria é salva
  - Console sem erros
```

**CT-003 [CA-01]: Tentativa de salvar categoria com valor zero**
```
Tipo: manual
Prioridade: alto
Pré-condição: Modal de categoria aberto
Passos:
  1. Preencher Nome = "Teste"
  2. Preencher Valor = "0"
  3. Tocar em "Salvar"
Resultado esperado:
  - Mensagem de erro aparece no campo Valor ("Informe um valor válido" ou similar)
  - Modal permanece aberto
  - Nenhuma categoria é salva
```

**CT-004 [CA-01]: Tentativa de salvar categoria com valor negativo**
```
Tipo: manual
Prioridade: alto
Pré-condição: Modal de categoria aberto
Passos:
  1. Preencher Nome = "Teste"
  2. Preencher Valor = "-100"
  3. Tocar em "Salvar"
Resultado esperado:
  - Mensagem de erro aparece no campo Valor
  - Modal permanece aberto
  - Nenhuma categoria é salva
```

**CT-005 [CA-01]: Cancelar criação de categoria**
```
Tipo: manual
Prioridade: médio
Pré-condição: Modal de categoria aberto, campos preenchidos
Passos:
  1. Preencher Nome = "Mercado" e Valor = "500"
  2. Tocar em "Cancelar"
Resultado esperado:
  - Modal fecha
  - Nenhuma categoria é criada
  - Console sem erros
```

---

### CA-02 — Editar categoria

---

**CT-006 [CA-02]: Editar nome e valor de categoria existente**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Existe categoria "Gasolina" com orçado de R$ 300,00 (criada no CT-001)
Passos:
  1. Tocar em ✏️ na categoria "Gasolina"
  2. Verificar que o modal abre com título "Editar Categoria"
  3. Verificar que o campo Nome está preenchido com "Gasolina"
  4. Verificar que o campo Valor está preenchido com "300"
  5. Alterar Valor para "350"
  6. Tocar em "Salvar"
Resultado esperado:
  - Modal fecha
  - Toast "Categoria atualizada!" aparece
  - Categoria exibe "R$ 350,00/mês"
  - Console sem erros
```

**CT-007 [CA-02]: Validação ao editar — campo nome vazio**
```
Tipo: manual
Prioridade: alto
Pré-condição: Modal de edição de categoria aberto
Passos:
  1. Limpar campo Nome
  2. Tocar em "Salvar"
Resultado esperado:
  - Mensagem de erro no campo Nome
  - Modal permanece aberto
  - Categoria não é alterada
```

**CT-008 [CA-02]: Editar categoria não altera gastos já lançados**
```
Tipo: manual
Prioridade: alto
Pré-condição:
  - Existe categoria "Gasolina" com orçado de R$ 350,00
  - Existe ao menos 1 gasto vinculado a "Gasolina" (ver CT-014)
  - Nota o valor do gasto no banco (via DevTools > IndexedDB > gastos)
Passos:
  1. Editar "Gasolina" — alterar valor para "400"
  2. Salvar
  3. Verificar no IndexedDB > gastos que o campo `value` do gasto vinculado não mudou
Resultado esperado:
  - Categoria exibe "R$ 400,00/mês"
  - Gasto vinculado tem o mesmo valor de antes na store `gastos`
  - Apenas `valorOrcado` da categoria mudou na store `categoriasCartao`
```

---

### CA-03 — Excluir categoria

---

**CT-009 [CA-03]: Excluir categoria sem gastos vinculados**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Existe categoria "Mercado" sem nenhum gasto vinculado
Passos:
  1. Tocar em ✕ na categoria "Mercado"
  2. Verificar que aparece caixa de confirmação (showConfirm)
  3. Verificar o texto da confirmação menciona que gastos vinculados perderão a referência
  4. Tocar em "Remover"
Resultado esperado:
  - Modal de confirmação fecha
  - Toast "Categoria removida" aparece
  - "Mercado" desaparece da seção de gerenciamento
  - Nenhum gasto é alterado
  - Console sem erros
```

**CT-010 [CA-03]: Cancelar exclusão de categoria**
```
Tipo: manual
Prioridade: médio
Pré-condição: Existe categoria "Gasolina"; caixa de confirmação aberta
Passos:
  1. Tocar em ✕ na categoria "Gasolina"
  2. Na confirmação, tocar em "Cancelar"
Resultado esperado:
  - Modal de confirmação fecha
  - Categoria "Gasolina" permanece na seção
  - Nenhum dado alterado
```

**CT-011 [CA-03]: Excluir categoria com gastos vinculados — gastos permanecem**
```
Tipo: manual
Prioridade: crítico
Pré-condição:
  - Existe categoria "Gasolina" com ao menos 2 gastos vinculados no mês atual
  - Anotar os IDs dos gastos via DevTools > IndexedDB > gastos
Passos:
  1. Tocar em ✕ na categoria "Gasolina"
  2. Confirmar exclusão
  3. Verificar que "Gasolina" desaparece da seção de gerenciamento
  4. Abrir DevTools > Application > IndexedDB > gastos
  5. Verificar que os gastos com categoriaId de "Gasolina" ainda existem (com categoriaId orphan)
  6. Verificar a fatura do cartão que continha esses gastos
Resultado esperado:
  - Categoria removida da store `categoriasCartao`
  - Gastos com o `categoriaId` orphan permanecem na store `gastos`
  - Fatura exibe os gastos normalmente na lista principal
  - Seção "Por Categoria" NÃO exibe "Gasolina" (categoriaId orphan tratado como null)
  - Console sem erros
```

---

### CA-04 — Vincular gasto a categoria

---

**CT-012 [CA-04]: Modal de gasto exibe campo Categoria com estado vazio padrão**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Existe ao menos 1 categoria cadastrada (ex: "Gasolina")
Passos:
  1. Abrir modal "+ Gasto" em qualquer cartão
  2. Verificar a presença do campo "Categoria (opcional)"
  3. Verificar que a opção "— Sem categoria —" está selecionada por padrão
  4. Verificar que "Gasolina" está disponível como opção no select
Resultado esperado:
  - Select visível com "— Sem categoria —" selecionado
  - Opções de categorias listadas em ordem alfabética
  - Console sem erros
```

**CT-013 [CA-04]: Modal de gasto sem categorias cadastradas — select com apenas opção vazia**
```
Tipo: manual
Prioridade: médio
Pré-condição: Nenhuma categoria cadastrada (limpar store categoriasCartao se necessário)
Passos:
  1. Abrir modal "+ Gasto" em qualquer cartão
  2. Verificar o campo "Categoria (opcional)"
Resultado esperado:
  - Select exibe apenas "— Sem categoria —"
  - Sem erros no console
```

**CT-014 [CA-04]: Criar gasto vinculado a uma categoria**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Existe categoria "Gasolina" (R$ 300/mês); cartão "Nubank" cadastrado
Passos:
  1. Abrir modal "+ Gasto" no cartão "Nubank"
  2. Preencher Descrição = "Posto BR"
  3. Preencher Valor = "80"
  4. Preencher Data = [data do mês atual dentro da fatura]
  5. Selecionar "Gasolina" no campo Categoria
  6. Tocar em "Salvar"
  7. Verificar no DevTools > IndexedDB > gastos o gasto recém-criado
Resultado esperado:
  - Gasto salvo com `categoriaId` = ID numérico da categoria "Gasolina"
  - Toast "Gasto adicionado!" aparece
  - Gasto aparece na lista de gastos da fatura
  - Console sem erros
```

**CT-015 [CA-04]: Gasto salvo sem categoria — categoriaId null**
```
Tipo: manual
Prioridade: alto
Pré-condição: Existe ao menos 1 categoria cadastrada
Passos:
  1. Abrir modal "+ Gasto"
  2. Preencher Descrição = "Restaurante" e Valor = "50"
  3. Não alterar o select de Categoria (manter "— Sem categoria —")
  4. Salvar
  5. Verificar no IndexedDB > gastos
Resultado esperado:
  - `categoriaId` do gasto é `null` (não o número 0 nem string vazia)
```

**CT-016 [CA-04]: Editar gasto — categoria pré-selecionada corretamente**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Existe gasto vinculado à categoria "Gasolina" (criado no CT-014)
Passos:
  1. Tocar em ✏️ no gasto "Posto BR"
  2. Verificar que o modal de edição abre
  3. Verificar o campo "Categoria (opcional)"
Resultado esperado:
  - Select exibe "Gasolina" como opção selecionada (não "— Sem categoria —")
  - Console sem erros
```

**CT-017 [CA-04]: Editar gasto — remover categoria (alterar para sem categoria)**
```
Tipo: manual
Prioridade: alto
Pré-condição: Existe gasto vinculado à categoria "Gasolina" (CT-014)
Passos:
  1. Tocar em ✏️ no gasto vinculado
  2. No campo Categoria, selecionar "— Sem categoria —"
  3. Salvar
  4. Verificar no IndexedDB > gastos
Resultado esperado:
  - `categoriaId` do gasto atualizado para `null`
  - Gasto desaparece da seção "Por Categoria" na fatura
```

**CT-018 [CA-04]: Editar gasto parcelado — categoriaId preservado em ambos os branches**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Existe gasto parcelado (3 parcelas) vinculado a "Gasolina"
Passos:
  1. Tocar em ✏️ na 1ª parcela
  2. Verificar "Gasolina" pré-selecionado
  3. Alterar outro campo (ex: observação)
  4. Escolher "Apenas esta parcela"
  5. Verificar no IndexedDB que a parcela atualizada tem o categoriaId correto
  Repetir com "Esta e seguintes": verificar que todas as novas parcelas têm categoriaId
Resultado esperado:
  - `categoriaId` mantido em ambos os fluxos de edição parcelada
  - Console sem erros
```

**CT-019 [CA-04]: Select de categoria não duplica opções ao reabrir modal**
```
Tipo: manual
Prioridade: médio
Pré-condição: Existem 2+ categorias cadastradas
Passos:
  1. Abrir modal "+ Gasto", verificar opções do select
  2. Fechar modal (Cancelar)
  3. Abrir modal "+ Gasto" novamente
  4. Contar opções no select
Resultado esperado:
  - Mesmo número de opções nas duas aberturas
  - Sem duplicação de opções
```

---

### CA-05 — Exibição na fatura

---

**CT-020 [CA-05]: Seção "Por Categoria" aparece com gastos vinculados — cor verde**
```
Tipo: manual
Prioridade: crítico
Pré-condição:
  - Categoria "Gasolina" com orçado R$ 300
  - 2 gastos vinculados à "Gasolina" no cartão "Nubank" no mês atual: R$ 80 + R$ 100 = R$ 180
Passos:
  1. Visualizar a fatura do mês atual do cartão "Nubank"
  2. Verificar que a seção "Por Categoria" aparece abaixo da lista de gastos
  3. Verificar o conteúdo da linha "Gasolina"
Resultado esperado:
  - Linha exibe "Gasolina" com "R$ 180,00 / R$ 300,00" (realizado/orçado)
  - Barra de progresso em verde (60% < 80%)
  - Valor realizado em verde
  - Console sem erros
```

**CT-021 [CA-05]: Cor âmbar quando realizado entre 80% e 100% do orçado**
```
Tipo: manual
Prioridade: alto
Pré-condição:
  - Categoria "Gasolina" com orçado R$ 300
  - Gastos vinculados somam R$ 270 (90% do orçado)
Passos:
  1. Visualizar a fatura
  2. Verificar seção "Por Categoria" — linha "Gasolina"
Resultado esperado:
  - Barra de progresso em âmbar (var(--amber))
  - Valor realizado em âmbar
```

**CT-022 [CA-05]: Cor vermelha quando realizado excede orçado**
```
Tipo: manual
Prioridade: alto
Pré-condição:
  - Categoria "Gasolina" com orçado R$ 300
  - Gastos vinculados somam R$ 350 (117% do orçado)
Passos:
  1. Visualizar a fatura
  2. Verificar seção "Por Categoria" — linha "Gasolina"
Resultado esperado:
  - Barra de progresso em vermelho (var(--red))
  - Valor realizado em vermelho
  - Barra não ultrapassa 100% visualmente (width: 100% no máximo)
```

**CT-023 [CA-05]: Seção "Por Categoria" NÃO aparece quando não há gastos vinculados**
```
Tipo: manual
Prioridade: crítico
Pré-condição:
  - Existe ao menos 1 categoria cadastrada
  - Nenhum gasto do cartão "Inter" tem categoriaId no mês atual
Passos:
  1. Visualizar a fatura do cartão "Inter"
  2. Verificar presença da seção "Por Categoria"
Resultado esperado:
  - Seção "Por Categoria" NÃO é renderizada
  - Lista de gastos normais aparece normalmente
  - Console sem erros
```

**CT-024 [CA-05]: Lista de gastos exibe todos os gastos independentemente de categoria**
```
Tipo: manual
Prioridade: alto
Pré-condição:
  - Cartão "Nubank" com 3 gastos: 2 vinculados a "Gasolina" + 1 sem categoria
Passos:
  1. Visualizar a fatura do cartão "Nubank"
  2. Contar itens na lista de gastos
  3. Verificar seção "Por Categoria"
Resultado esperado:
  - Lista de gastos: 3 itens (todos os gastos, com ou sem categoria)
  - Seção "Por Categoria": mostra apenas o resumo de "Gasolina" com os 2 gastos vinculados
  - Os dois grupos não se excluem
```

---

### CA-06 — Projeção com delta de categoria

---

**CT-025 [CA-06]: Mês futuro sem gastos — delta = valorOrcado somado ao cartão**
```
Tipo: manual
Prioridade: crítico
Pré-condição:
  - Categoria "Gasolina" com orçado R$ 300
  - Nenhum gasto vinculado a "Gasolina" no mês futuro (mês seguinte ao atual)
  - Anotar o total do cartão "Nubank" na aba Projeção para o mês seguinte (antes do teste)
Passos:
  1. Navegar para a aba Projeção
  2. Navegar para o mês seguinte
  3. Verificar o item do cartão "Nubank" na projeção
Resultado esperado:
  - O valor do cartão é R$ 300,00 a mais do que seria sem categoria
    (ou seja: total_sem_categoria + 300 = total_com_delta)
  - Console sem erros
```

**CT-026 [CA-06]: Mês com gastos parciais — delta = valorOrcado - realizado**
```
Tipo: manual
Prioridade: alto
Pré-condição:
  - Categoria "Gasolina" com orçado R$ 300
  - Gasto de R$ 180 vinculado a "Gasolina" no mês seguinte
Passos:
  1. Verificar projeção do mês seguinte para o cartão que tem o gasto
Resultado esperado:
  - Delta = 300 - 180 = R$ 120 somado ao total do cartão
  - O gasto de R$ 180 já está no total base, mais os R$ 120 de delta = orçado completo
```

**CT-027 [CA-06]: Gastos iguais ou acima do orçado — sem delta adicional**
```
Tipo: manual
Prioridade: alto
Pré-condição:
  - Categoria "Gasolina" com orçado R$ 300
  - Gastos vinculados no mês seguinte somam R$ 320
Passos:
  1. Verificar projeção do mês seguinte
Resultado esperado:
  - Nenhum valor adicional somado ao cartão (delta = max(0, 300 - 320) = 0)
  - Console sem erros
```

**CT-028 [CA-06]: Delta calculado uma única vez globalmente — não duplicado por cartão**
```
Tipo: manual
Prioridade: crítico
Pré-condição:
  - Categoria "Gasolina" com orçado R$ 300
  - Cartão "Nubank": R$ 150 vinculados a "Gasolina" no mês seguinte
  - Cartão "Inter": R$ 100 vinculados a "Gasolina" no mês seguinte
  - Total global realizado: R$ 250
Passos:
  1. Verificar projeção do mês seguinte
  2. Somar os totais de TODOS os cartões
  3. Verificar que o delta de "Gasolina" (R$ 50 = max(0, 300 - 250)) aparece UMA ÚNICA VEZ
     — no cartão com maior realizado desta categoria ("Nubank", R$ 150)
Resultado esperado:
  - Delta R$ 50 adicionado APENAS ao "Nubank" (maior realizado)
  - "Inter" NÃO recebe delta adicional de "Gasolina"
  - Soma total do delta em todos os cartões = R$ 50 (não R$ 100 nem R$ 300)
```

---

### CA-07 — Migração do IndexedDB

---

**CT-029 [CA-07]: Upgrade v5→v6 com dados reais sem perda**
```
Tipo: manual
Prioridade: crítico
Pré-condição:
  - Arquivo de backup disponível: G:\Meu Drive\financas_backup_20260626.json
  - Usar Chrome limpo (sem dados do app) OU abrir DevTools > Application > IndexedDB > excluir 'financas_pwa_v2' para simular versão antiga
  ATENÇÃO: Esta operação pode alterar dados reais — usar perfil de Chrome separado ou modo incógnito com extensão de backup
Passos:
  1. Restaurar dados do backup via a função de importação do app
  2. Verificar no DevTools > Application > IndexedDB a versão do banco após abertura
  3. Verificar que a store "categoriasCartao" existe e está vazia
  4. Verificar que as stores existentes (tx, gastos, cartoes, budget, pessoas, recorrentes, budgetDone) têm os dados intactos
  5. Navegar pelas abas do app (Início, Lançamentos, Cartões, Projeção, Orçamento)
Resultado esperado:
  - IndexedDB versão 6
  - Store "categoriasCartao" criada e vazia
  - Todos os dados pré-existentes intactos
  - App carrega normalmente em todas as abas
  - Console sem erros de upgrade
```

**CT-030 [CA-07]: Gastos sem categoriaId (dados antigos) renderizados normalmente**
```
Tipo: manual
Prioridade: crítico
Pré-condição: Dados do backup restaurados (CT-029) — gastos antigos não têm campo categoriaId
Passos:
  1. Abrir aba Cartões
  2. Verificar lista de gastos na fatura
  3. Verificar que seção "Por Categoria" não aparece (nenhuma categoria cadastrada ainda)
Resultado esperado:
  - Gastos sem categoriaId exibidos normalmente na lista
  - Nenhuma seção "Por Categoria" renderizada
  - Console sem erros
```

**CT-031 [CA-07]: Criar categoria após migração e vincular a gasto**
```
Tipo: manual
Prioridade: alto
Pré-condição: Dados migrados (CT-029); app funcionando normalmente
Passos:
  1. Criar categoria "Gasolina" (R$ 200)
  2. Editar um gasto existente (pré-migração) e vincular à "Gasolina"
  3. Verificar a fatura
Resultado esperado:
  - Categoria criada com sucesso
  - Gasto atualizado com categoriaId correto
  - Seção "Por Categoria" exibe "Gasolina" com o valor correto
  - Console sem erros
```

---

### RNs críticos — casos adicionais

---

**CT-032 [RN-006]: Barra de progresso não ultrapassa 100% visualmente**
```
Tipo: manual
Prioridade: médio
Pré-condição: Gasto vinculado a categoria "Gasolina" (R$ 300) totalizando R$ 600 (200%)
Passos:
  1. Verificar seção "Por Categoria" na fatura
  2. Inspecionar a barra de progresso de "Gasolina"
Resultado esperado:
  - Barra exibe largura máxima de 100% (não vaza para fora do container)
  - Cor vermelha (>100%)
  - Valores exibem R$ 600,00 / R$ 300,00 (o realizado pode ser maior que o orçado no texto)
```

---

## 4. Harness — Requisitos

Esta feature é de browser/IndexedDB — sem backend. Harness é mínimo:

| Item | Requisito |
|------|-----------|
| Ambiente | Browser local (Chrome) com DevTools |
| Banco | IndexedDB local — estado limpo ou com backup restaurado conforme o CT |
| Mocks | Nenhum necessário — toda lógica é client-side |
| Isolamento | Separar CT-029 a CT-031 (migração) em sessão diferente dos demais testes |
| Backup | `G:\Meu Drive\financas_backup_20260626.json` disponível antes de CT-029 |

---

## 5. Veredicto Estático

**STATUS: LIBERADO para testes manuais**

Todas as verificações estáticas passaram sem bloqueantes:
- Sintaxe válida nos 3 arquivos JS
- Sem `export`/`import` ou `<script type="module">`
- Sem nested template literals
- `JSON.stringify` em `onclick` somente na linha pré-existente (linha 175, `cards-render.js`)
- CRLF zerado nos 3 arquivos
- Guard `!contains` presente para todas as 8 stores do IndexedDB
- `categoriaId` capturado antes do bloco `if(existing.groupId)` em `saveGastoEdit`
- `#categorias-cartao-section` presente no `index.html` na posição correta
- onclick de categoria usando apenas ID numérico — sem `JSON.stringify` em atributos inline

**Observação registrada (não bloqueante):**
- Sort de gastos na fatura (linha 202, `cards-render.js`): `(b.date > a.date) ? -1 : 1` produz ordenação crescente (mais antigo no topo), não decrescente. Comportamento pré-existente, validado como "correto" pelo Code Reviewer. Registrar em débito técnico para confirmação com PO sobre comportamento desejado.

---

## 6. Critérios de Aprovação Final

| Critério | Threshold |
|----------|-----------|
| Bugs críticos abertos | 0 |
| Bugs altos abertos | 0 |
| CTs passando | 32/32 (100%) |
| Console sem novos erros | Obrigatório em todos os CTs |
| CT-029 (migração) aprovado | Obrigatório para DoD |
| Bugs médios | Aceitos com ressalva e registro no backlog |
| Bugs baixos | Aceitos com registro no backlog |

---

*Documento gerado pelo QA Engineer — Sprint 4b — 2026-06-27*
