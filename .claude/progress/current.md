# Estado Atual do Projeto

**Atualizado em:** 2026-07-11
**Agente:** Sessão direta com o usuário (discovery + início da migração para app nativo)
**Sessão:** Discovery completo da migração para app nativo (Android + iOS). Plano aprovado
pelo usuário (PR #1 mesclado). **Fase 0 executada no repositório novo e privado
`diegomedm/financas-app`**: projeto Expo SDK 57 (TypeScript, expo-router), design tokens
portados de js/theme.js, ThemeContext, 5 abas, Dashboard estático, ADRs 001–006.

## Decisões estratégicas desta sessão (mudam o rumo do produto)

- App nativo via **React Native + Expo (TypeScript)** — reescrita, não wrapper
- Backend **Supabase** (Fase 2): contas + compartilhamento por household + RLS
- **SQLite local-first**: modo local-only é o padrão; nuvem é opt-in
- **Expo Go** para testes iOS sem Mac e sem custo; US$ 99/ano da Apple adiados até distribuição real
- Repo novo privado `financas-app`; **este repo (PWA) permanece em produção, intocado**,
  durante toda a transição — Diego e Camila continuam usando
- product.md atualizado: app nativo deixou de ser "fora do escopo"

## Próximo passo esperado

1. **Usuário valida o esqueleto Fase 0 nos aparelhos**: `npx expo start` em
   `C:\Users\SESI\Documents\GitHub\financas-app` → Expo Go no Android (Diego) e iPhone (Camila)
2. Fase 0 validada → Fase 1 no repo novo (Jest + tokens.ts, depois SQLite + port da lógica)
3. **Trabalho do app nativo acontece no repo `financas-app`** — ler o `.claude/` de lá;
   este repo só recebe correções do PWA reportadas do uso real (regras de sempre)

## Pendências pré-existentes do PWA (inalteradas)

- Validação da pílula de status do Orçamento pelo usuário (spec em
  `.claude/specs/status-pill-orcamento.md`)
- Débitos DT-001..DT-010 em `.claude/debt/backlog.md`

## Contexto crítico

- O `.claude/architecture.md` do repo novo copiou as regras de domínio críticas daqui
  (mês de referência, _budgetItemAppliesTo, dueMonthOffset, getFaturaMonth, ordem import v6)
  — manter os dois sincronizados se essas regras evoluírem
- `sw.js` em `financas-v67` (nenhum código do PWA foi alterado nesta sessão)
- Migração de dados PWA → app nativo será via export/import v6 (importador na Fase 1)
