# Estado Atual do Projeto

**Atualizado em:** 2026-06-27
**Agente:** QA Engineer
**Sessão:** Sprint 4 — verificação estática e plano de testes QA

## Em andamento

- Sprint 4: verificação estática concluída (LIBERADO), plano de testes manuais elaborado (24 CTs)
- Aguardando execução dos testes manuais pelo usuário ou Test Runner

## Próximo passo esperado

- Executar os 24 casos de teste manuais descritos em `specs/sprint-4-projecao-qa.md`
- Prioridade: CT-001, CT-009, CT-013, CT-014, CT-022 (críticos) primeiro
- Após execução: QA consolida veredicto final (aprovado / reprovado com bugs)

## Contexto crítico para não perder

- Nested template literals em `pessoas.js` linhas 55 e 60 são pré-existentes — nao introduzidos pelo Sprint 4
- Formato da chave budgetDone em projection.js: `item.id+'_'+y+mm` (mm = m+1 padStart 2) — consistente com db.js
- CT-009 e CT-012 cobrem o risco de dupla contagem (maior risco técnico desta sprint)
- CT-016 cobre o caso de budget sem pessoaId com filtro ativo (deve excluir — consistente com renderBudget)
- `_syncProjTabActive()` garante sincronização do botão ativo após restauração do localStorage — validar via CT-001/CT-002
