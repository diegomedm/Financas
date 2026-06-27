# Estado Atual do Projeto

**Atualizado em:** 2026-06-26
**Agente:** QA Engineer
**Sessão:** Sprint 1 — Plano de Testes QA do Split de cards.js

## Em andamento

- Plano de testes QA produzido em `.claude/specs/sprint-1-cards-split-qa.md`
- Verificações estáticas CA-11, CA-12 e CA-14 concluídas e aprovadas pelo QA
- CA-01 a CA-10 e CA-13 aguardam validação manual no navegador pelo usuário

## Próximo passo esperado

- Usuário executa o checklist de validação manual no navegador (`.claude/specs/sprint-1-cards-split-qa.md` seção 2)
- Após execução: reportar resultado ao QA (passou / falhou e em qual CA)
- Se aprovado: mover `sprint-1-cards-split.md` e `sprint-1-cards-split-qa.md` para `archive/specs/`, registrar DoD concluído no log
- Sprint 2 na fila: Simplificação TX + Dashboard + data no "marcar como realizado"

## Contexto crítico para não perder

- CA-11, CA-12, CA-14: APROVADOS via verificação estática — não precisam ser re-executados
- DT-005 (TDZ em saveRecorrenteEdit) é débito pré-existente — não é bloqueante para aprovação do Sprint 1
- JSON.stringify em onclick (cards-render.js linha 149) é pré-existente (linha 915 do cards.js original) — não introduzido pelo split, não é bloqueante
- Service worker: se não ativar após hard reload, usar skipWaiting em DevTools > Application
