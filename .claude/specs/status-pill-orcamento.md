# Pílula de Status dos Itens de Orçamento — PENDENTE DE VALIDAÇÃO DO USUÁRIO

**Criada em:** 2026-07-08
**Status:** Implementada e testada, mas o usuário sinalizou que provavelmente precisará de ajustes.
**Código:** `_budgetStatusPill(item, done)` em `js/budget.js` (antes de `_budgetItemCard`).
**Origem:** spec extraída do protótipo `Financas App.dc.html`, linhas 2134-2141.

## Regras implementadas (ordem de precedência)

| # | Condição | Pílula | Cor |
|---|----------|--------|-----|
| 1 | Item marcado como realizado (`done`) | ✓ Pago | verde |
| 2 | Item movido via "Marcar como atrasado" (`item.delayed`) | ↪ Atrasado | âmbar |
| 3 | Tem `dueDay` E vencimento já passou E mês visualizado ≤ mês real | ⚠ Atrasado | vermelho |
| 4 | Tem `dueDay` E faltam 0–5 dias para o vencimento | Vence em Xd / Vence em hoje | âmbar |
| 5 | Qualquer outro caso (inclusive sem `dueDay`) | Pendente | cinza |

- A data de vencimento considera `dueMonthOffset` com a fórmula canônica:
  `rawDue = curMonth + offset; dueYear = curYear + floor(rawDue/12); dueMonth = (rawDue%12+12)%12`.
- `diffDays = Math.round((dueDate - hoje) / 86400000)`, ambos zerados em horas.
- "mês atual/passado" (regra 3): `curYear < anoReal || (curYear === anoReal && curMonth <= mêsReal)`.
- Aplicada nos DOIS tipos de card: item normal e fatura de cartão (`item._isCartao`).

## Decisão de adaptação (NÃO existe no protótipo — candidata a ajuste)

**Regras 3 e 4 só ativam quando o mês de referência (pin 📌, `refMonth`/`refYear` no localStorage)
é o mês real do sistema.** Se o usuário pinou outro mês como referência, comparar datas contra o
relógio real marcaria tudo como "⚠ Atrasado" — então o item cai na regra 5 ("Pendente" neutro).
O protótipo usa `new Date()` puro, sem esse guard.

Alternativas possíveis se o comportamento atual não agradar:
- a) Usar a data real sempre (fiel ao protótipo, mas ruidoso com pin ativo).
- b) Simular "hoje" como dia real dentro do mês de referência (ex.: pin=Maio, dia real=8 → "hoje"=8/Maio).
- c) Manter como está (avisos só com pin no mês real).

## Mudanças visíveis que vieram junto (avaliar se mantém)

1. O texto "✅ Realizado" foi substituído pela pílula "✓ Pago" (rótulo do protótipo).
2. O badge antigo "⚠️ Atrasado" (para `delayed`) foi removido — a pílula "↪ Atrasado" cobre o caso,
   e quando o item é pago a pílula "✓ Pago" tem precedência (o atraso deixa de ser exibido).
3. Classe CSS `.color-green-nowrap` ficou órfã e foi removida do `index.html`.

## Validação já executada (Playwright, 2026-07-08)

- Pin=Junho (≠ mês real Julho): todos os itens "Pendente" ✓
- Pin=Julho (= mês real, dia 8): venc. dia 5 → "⚠ Atrasado"; dia 10 → "Vence em 2d"; dia 17 → "Pendente" ✓
- Ramos "✓ Pago" / "↪ Atrasado" / "Pendente sem dueDay" validados unitariamente in-page ✓
- Marcar como pago segue criando a TX real + toast ✓
