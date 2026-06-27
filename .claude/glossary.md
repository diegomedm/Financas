# Glossário — Financas

**Atualizado em:** 2026-06-26

> Termos do domínio. Todo agente deve usar esta linguagem ao discutir o projeto.

| Termo | Definição | Contexto de uso |
|-------|-----------|----------------|
| **tx** | Lançamento financeiro (transaction) | Store `tx` no IndexedDB; arquivo transactions.js |
| **budget** | Item do orçamento mensal | Store `budget`; arquivo budget.js |
| **budgetDone** | Marcação de item de orçamento como realizado no mês | Store `budgetDone`; chave `budgetId_YYYYMM` |
| **ym** | Índice de mês: `year * 100 + month` (ex: 202606) | Usado para filtrar tx por mês via índice IndexedDB |
| **rawExpr** | Expressão matemática salva como string (ex: "1000/2") | Salvo junto com `value` para re-edição no numpad |
| **subitems** | Array de itens detalhados dentro de um lançamento ou gasto | `[{name, value, repeat?, sgid?, skip?, startMonth?, startYear?}]` |
| **subRepeatStart** | Ponto de início de repetição de subitens — `{month, year}` | Usado para calcular elapsed em `getActiveSubitems` |
| **sgid** | ID de grupo de subitem repetido (string) | Liga subitems do mesmo grupo para controle de skip |
| **repeat** | Flag em subitem: `true` = repete todo mês a partir de `startMonth/startYear` | Usado em budget e gastos parcelados |
| **groupId** | ID que agrupa parcelas de um mesmo lançamento parcelado | Mesmo groupId em múltiplos registros |
| **recorrente** | Cobrança fixa mensal vinculada a um cartão (ex: Netflix) | Store `recorrentes`; aparece em todas as faturas |
| **gasto** | Compra avulsa feita no cartão (pode ser parcelada) | Store `gastos`; cartaoId é chave estrangeira |
| **fatura** | Consolidação dos gastos de um cartão em um mês específico | Calculada pela função `getFaturaMonth` |
| **fechamento** | Dia do mês em que a fatura do cartão fecha | Campo `cartao.fechamento`; define qual mês uma compra entra |
| **vencimento** | Dia do mês em que a fatura do cartão vence para pagamento | Campo `cartao.vencimento` |
| **dueDay** | Dia de vencimento de um item do orçamento (1-31) | Campo `budget.dueDay` |
| **dueMonthOffset** | Deslocamento de mês do vencimento (0=mesmo mês, 1=próximo) | Campo `budget.dueMonthOffset`; ex: salário cai dia 5 do mês seguinte |
| **recurrence** | Tipo de recorrência do item de orçamento | `'always'` (todo mês), `'once'` (mês específico), `'installments'` (parcelado) |
| **delayed** | Flag que indica item de orçamento atrasado/pendente | Campo `budget.delayed`; move item para o próximo mês |
| **delayedFromId** | ID do item de orçamento original que gerou este clone atrasado | Usado no 2º passe do import v6 para remapear |
| **delayedFrom / delayedTo** | Período de origem e destino do atraso — `{month, year}` | Registra de onde veio e para onde foi |
| **enrichedItem** | Item de orçamento após processamento para exibição (inclui subitems ativos calculados) | Nunca persistir enrichedItem; sempre usar raw do banco |
| **getActiveSubitems** | Função que filtra subitems ativos no mês atual considerando repeat e elapsed | Contexto muda: TX usa `t.month/year`, Budget usa `curMonth/year`, Gasto usa `startMonth` |
| **pessoaId** | ID de referência para o responsável do lançamento/orçamento/cartão | Chave estrangeira para store `pessoas` |
| **fromBudget** | Referência ao item de orçamento que originou um lançamento | Campo `tx.fromBudget`; rastreia origem |
| **fromCartao** | Referência ao cartão de origem de um lançamento de cartão | Campo `tx.fromCartao`; remapeado no import v6 |
| **_dbCache** | Objeto global de cache em memória para todos os stores | Em globals.js; invalidado automaticamente nas escritas |
| **invalidateCache(store)** | Limpa o cache de um store específico | Chamado automaticamente pelos helpers `*Add/*Put/*Del` |
| **invalidateAllCache()** | Limpa todo o cache | Obrigatório após import ou clearAll |
| **income** | Tipo receita | `type = 'income'` em tx e budget |
| **fixed** | Tipo despesa fixa | `type = 'fixed'` em tx e budget |
| **variable** | Tipo despesa variável | `type = 'variable'` em tx e budget |
| **credit** | Tipo cartão de crédito | `type = 'credit'` apenas em tx (não em budget) |
| **PWA** | Progressive Web App — instala no device sem app store | Manifesto dinâmico + Service Worker |
| **Export v6** | Formato de exportação atual com remapeamento de IDs em 2 passagens | JSON gerado por config.js |
