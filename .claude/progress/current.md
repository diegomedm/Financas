# Estado Atual do Projeto

**Atualizado em:** 2026-06-27
**Agente:** Orchestrator
**Sessão:** Sprint 2 concluído — iniciando Sprint 3

## Em andamento

- Sprint 3: Gráficos/visualizações no dashboard

## Próximo passo esperado

- Product Owner: escrever spec do Sprint 3
- Senior Dev: implementar gráficos
- Code Reviewer + QA: validar

## Roadmap aprovado

| Sprint | Item | Complexidade | Status |
|--------|------|-------------|--------|
| 1 | Split `cards.js` em dois módulos | N2 | ✅ Concluído |
| 2 | Simplificação TX + Dashboard + data no "marcar como realizado" | N2 | ✅ Concluído |
| 3 | Gráficos/visualizações no dashboard | N3 | Em andamento |
| 4 | Melhorar aba de projeção | A definir | Pendente |
| 5 | Onboarding para novo usuário | N3 | Pendente |
| 6 | OFX/QFX importer (Nubank) | N3 | Pendente |

## Contexto crítico para o Sprint 3

- Dashboard perdeu a seção "últimos lançamentos" no Sprint 2 — espaço livre para gráficos
- Stack: vanilla JS ES2020, sem frameworks, sem build tool — qualquer lib de gráficos deve ser carregada via CDN com fallback ou bundled local
- Sem `<script type="module">`, sem `export`/`import`
- CONTEXT.md é fonte de verdade técnica
- Dados disponíveis: receitas/despesas por mês (store `tx`), orçamento (store `budget`), cartões/faturas (stores `gastos`, `cartoes`)
