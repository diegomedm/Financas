# Estado Atual do Projeto

**Atualizado em:** 2026-07-07
**Agente:** Senior Software Engineer
**Sessão:** Implementação da Fase 0 — Fundação Visual

## O que está em andamento

- Spec `.claude/specs/fase0-fundacao-visual.md` **implementada** conforme as 4 fases recomendadas (A→D,
  exceto o smoke test manual em browser, que é passo do usuário/QA)
- `node --check` passou em `js/theme.js`, `js/app.js` e `sw.js`
- Nenhum commit realizado — aguardando revisão/aprovação do usuário

## Próximo passo esperado

- Usuário roda o smoke test manual de 8 passos descrito na spec (seção "Smoke test manual obrigatório")
- Code Reviewer revisa o diff (foco: FOUC, dessincronização de chaves localStorage, zero regressão)
- QA Engineer valida os 10 itens INTOCÁVEIS
- Após aprovação explícita do usuário → commit

## Contexto crítico para não perder

- `js/theme.js` (novo) implementa `buildTokens(theme, mood, surface, accent)`, `applyLook(look)` e
  `getSavedLook()` — valores dark/light extraídos 1:1 de `index.html` (`:root`/`body.light`), sem alterar
  nenhuma variável CSS existente
- `applyTheme(dark)` foi removida de `js/app.js` (sem alias) — `toggleTheme(dark)` agora delega para
  `applyLook()`, lendo `getSavedLook()` e trocando apenas `theme`
- `init()` em `js/app.js` agora chama `applyLook(getSavedLook())` na mesma posição síncrona onde antes
  chamava `applyTheme(...)` — antes de `openDB()`, sem inline script no `<head>`
- `index.html`: `<script src="js/theme.js">` inserido entre `projection.js` e `config.js`;
  `:root`/`body.light` não foram tocados
- `sw.js`: `CACHE` bump `financas-v10` → `financas-v11`; `js/theme.js` adicionado em `urlsToCache` na
  mesma posição relativa
- RN-04 (fórmula de derivação de `--blue-bg`/`--blue-border` a partir de accent customizado): não
  implementada nesta fase, conforme decisão do Tech Lead — accent customizado troca apenas `--blue`,
  mantendo `--blue-bg`/`--blue-border` do tema base como estão hoje
- Débitos técnicos abertos (sem mudança): DT-001, DT-002, DT-003, DT-005, DT-006, DT-009 (já resolvido
  em sessão anterior), DT-010 (já resolvido em sessão anterior)
