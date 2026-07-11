# Plano de Discovery — Migração para App Nativo (Android + iOS)

**Versão:** v1 (aguardando aprovação do usuário)
**Data:** 2026-07-11
**Classificação de complexidade:** N3 (Produto) evoluindo para N4 (Produção) na fase comercial

---

## 1. Visão e objetivo

Transformar o PWA Financas (vanilla JS, IndexedDB, GitHub Pages) em um **aplicativo nativo
Android + iOS com uma única base de código**, preservando 100% das funcionalidades atuais,
adicionando **contas de usuário com compartilhamento (casal/família)** e preparando o terreno
para **uso comercial futuro por assinatura** (barata, anual, dentro das lojas).

### Princípios acordados com o usuário

1. **Custo zero durante todo o desenvolvimento e beta família** — gastos (US$ 25 Play + US$ 99/ano
   Apple) só quando decidir publicar/distribuir de verdade.
2. **Nenhuma funcionalidade perdida** na transição — paridade total com o PWA atual (checklist §6).
3. **Modo híbrido de dados**: local-only (privacidade total, sem conta) OU conta na nuvem com
   sincronização — o usuário escolhe. Offline-first sempre: o banco local é a fonte primária.
4. **Contas + compartilhamento prontos no lançamento** para o grupo de ~15 amigos/familiares.
5. **O PWA atual continua intocado e em produção** durante toda a transição — Diego e Camila
   seguem usando; migração de dados via export/import v6 (manual, aceito pelo usuário).

---

## 2. Decisões tomadas (viram ADRs na Fase 0)

| # | Decisão | Justificativa resumida |
|---|---------|------------------------|
| D1 | **React Native + Expo, TypeScript** | Única base de código p/ Android+iOS; Expo Go permite testar no iPhone da Camila sem Mac e sem conta paga; EAS Build compila iOS na nuvem (grátis ~30 builds/mês); EAS Update entrega atualizações over-the-air à família sem loja; TypeScript aproveita a lógica JS existente |
| D2 | **Supabase como backend** | PostgreSQL relacional (modelo de dados atual já é relacional); Row Level Security para compartilhamento por household; auth inclusa (e-mail, Google, Apple); tier grátis suficiente p/ 15–100 usuários; baixo lock-in |
| D3 | **Expo Go como estratégia iOS interina** | Testes no iPhone via QR code, R$ 0; TestFlight/App Store (US$ 99/ano) adiados até decisão de distribuição real |
| D4 | **SQLite local como fonte primária + camada de sync opcional** | Viabiliza o modo híbrido (local-only vs conta); app funciona 100% offline; sync é feature, não dependência |
| D5 | **Repositório novo e privado** para o app nativo | Código será fechado (decisão do usuário); repo atual (público, GitHub Pages) permanece intacto servindo o PWA em produção |
| D6 | **Assinatura dentro das lojas** (fase comercial) via RevenueCat | 15% de comissão aceito; RevenueCat grátis até ~US$ 2,5k/mês de receita; CPF por enquanto, CNPJ se escalar |

## 3. Contexto de hardware/testes do usuário

- Celular do Diego: **Android** (dispositivo principal de teste)
- iPhone disponível: **da Camila** (teste via Expo Go)
- **Sem Mac** — builds iOS exclusivamente via nuvem (EAS Build)
- Consegue reunir **12+ testers Android** para o teste fechado obrigatório do Google Play
- Windows 11 como máquina de desenvolvimento (Android build local ilimitado)

---

## 4. Arquitetura-alvo (alto nível — detalhada em ADRs na Fase 0/2)

```
App (React Native + Expo, TypeScript)
├── UI: telas portadas do redesign atual (design tokens → tema RN)
├── Lógica de negócio: portada de js/*.js → módulos TS puros testáveis
│   (budget, faturas/getFaturaMonth, projeção, _budgetItemAppliesTo, etc.)
├── Dados: SQLite local (expo-sqlite) — fonte primária, sempre
│   └── espelha o schema IndexedDB v6 (tx, budget, budgetDone, pessoas,
│       cartoes, gastos, recorrentes) + metas (sai do localStorage)
└── Sync (opcional, ativado ao criar conta):
    └── Supabase: auth + Postgres com RLS por household
        - household = unidade de compartilhamento (casal/família)
        - conceito "Pessoa" existente mapeia para membros do household
```

**Ponto de maior risco técnico do projeto: o motor de sincronização** (local ⇄ nuvem,
offline-first, resolução de conflitos). Decisão de abordagem (PowerSync vs. sync própria
via pull/push com updated_at/tombstones) será um ADR dedicado na Fase 2, com spike de
validação antes de comprometer.

## 5. Fases

### Fase 0 — Fundação (sem código de features)
- Criar repo privado + projeto Expo (TypeScript) + estrutura .claude/ própria
- ADRs: D1–D6 + estrutura de pastas + convenções
- Portar design tokens (`theme.js` → tema RN) e provar 1 tela (Dashboard estático)
- Expo Go rodando no Android do Diego e no iPhone da Camila (prova do fluxo de teste)
- **Critério de pronto:** app esqueleto abre nos dois aparelhos com o visual do tema atual

### Fase 1 — Paridade local (a maior fase)
- Schema SQLite + camada de dados (repositórios) com testes unitários
- Port da lógica de negócio com **testes unitários desde o início** (corrige o débito
  DT-003 — o PWA nunca teve testes formais; a reescrita é a oportunidade)
- Telas, na ordem: Lançamentos → Dashboard → Orçamento → Cartões → Projeção →
  Relatório → Configurações → Metas/Planejamento
- **Importador do export v6** (migração dos dados atuais do Diego/Camila — respeitar a
  ordem crítica das 10 etapas documentada em architecture.md)
- **Critério de pronto:** checklist de paridade (§6) 100% + dados reais do Diego importados
  e batendo com o PWA (mesmos saldos, mesmas projeções)

### Fase 2 — Contas + compartilhamento + sync
- Supabase: auth (e-mail + Google; Apple entra quando houver App Store), households, RLS
- Spike + ADR do motor de sync; implementação; modo local-only preservado como padrão
- Fluxos: criar conta, convidar parceiro(a) p/ household, sair, excluir conta (LGPD)
- **Critério de pronto:** Diego e Camila em aparelhos distintos com o mesmo orçamento
  sincronizado, inclusive após edições offline dos dois lados

### Fase 3 — Beta família (~15 pessoas)
- Android: APK distribuído direto (link) + EAS Update para correções over-the-air
- iOS: Expo Go para quem tiver iPhone
- Ciclo de feedback → correções (metodologia atual: spec → correção → validação)
- **Critério de pronto:** 2+ semanas de uso real sem bug bloqueante

### Fase 4 — Lojas (primeiro gasto: US$ 25 + US$ 99/ano, mediante autorização)
- Conta Google Play → teste fechado obrigatório (12 testers / 14 dias) → produção
- Conta Apple Developer → TestFlight → App Store Review
- Política de privacidade + termos (obrigatórios nas lojas; LGPD)
- **Critério de pronto:** app publicado nas duas lojas

### Fase 5 — Monetização (N4)
- RevenueCat + assinatura anual nas duas lojas; free tier vs. premium a definir
  (discovery próprio de pricing/paywall quando chegar a hora)
- Revisão de segurança/LGPD formal (agente cybersecurity-privacy) antes do lançamento público

## 6. Checklist de paridade funcional (Fase 1)

Tudo que existe hoje (fonte: product.md + architecture.md):

- [ ] Lançamentos: CRUD, subitens, parcelamentos, filtros, busca, swipe-to-action, duplicar, calendário
- [ ] Dashboard completo: hero de saldo (variação, slot-machine, sparkline, ocultar valores),
      entradas/saídas, donut de composição, por responsável, histórico 6 meses, alertas, link relatório
- [ ] Orçamento: recorrência always/once/installments, atraso/pendência, confirmação de realizado,
      categorias orçadas, resumo Previsto×Realizado, detalhe de categoria, dueMonthOffset,
      card de lançamentos avulsos, pílula de status (ver spec status-pill-orcamento.md — pendente validação)
- [ ] Cartões: fatura por fechamento (getFaturaMonth), limite com barra, gastos parcelados,
      recorrentes, timeline por dia, exclusão com patch cirúrgico
- [ ] Projeção: 3/6/12 meses, dia a dia, horizonte de saldos, explicação do cálculo
- [ ] Relatório mensal: comparação mês anterior, top 5, % por categoria, recordes, evolução patrimonial
- [ ] Pessoas: CRUD, cores, filtros por seção (vira base do compartilhamento na Fase 2)
- [ ] Planejamento: alertas inteligentes, limite de gasto livre, metas de economia
- [ ] Mês de referência (pin 📌) — refMonth/refYear como fonte de verdade de "hoje"
- [ ] Sistema de aparência: temas claro/escuro/auto, OLED, 10 presets, mood, superfície,
      heroStyle, accent — portado como tema RN
- [ ] Microinterações: as que fizerem sentido em nativo (pull-to-refresh, empty states, tour,
      splash, haptics como upgrade nativo) — avaliar caso a caso, sem obsessão por réplica exata
- [ ] Export/Import v6 (backup manual continua existindo) + importador de migração
- [ ] Ocultar valores (hideValues) global

## 7. Estratégia de testes

- **Unitários (Jest)** na lógica de negócio portada — obrigatórios desde a Fase 1
- **Validação visual/manual** nos dois aparelhos reais (Android Diego + iPhone Camila via Expo Go)
- **Paridade de dados**: após importar o export v6, comparar totais/saldos/projeções com o PWA
- **E2E (Maestro)**: avaliar na Fase 2+ para fluxos críticos (criar conta, sync)
- Teste fechado do Play (12×14d) na Fase 4 já com o grupo da família

## 8. Custos consolidados

| Momento | Custo |
|---------|-------|
| Fases 0–3 (dev + beta família Android/Expo Go + Supabase) | **R$ 0** |
| Fase 4 — Play Store | US$ 25 (único) |
| Fase 4 — App Store/TestFlight | US$ 99/ano |
| Fase 5 — comissão lojas sobre assinatura | 15% |
| Supabase/EAS acima do free tier | só com centenas de usuários ativos (US$ 25/mês cada, se ocorrer) |

## 9. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Motor de sync offline-first (maior risco técnico) | Spike + ADR dedicado na Fase 2; avaliar PowerSync antes de construir do zero |
| Expo Go tem limitações (nem todo módulo nativo roda) | Escolher bibliotecas compatíveis com Expo Go nas fases 0–3; development build via EAS como fallback |
| Free tier Supabase hiberna após 7 dias sem uso | Ping automático agendado; irrelevante com uso diário real |
| Reescrita regride comportamento sutil (bugs já corrigidos no PWA) | current.md/architecture.md documentam as armadilhas conhecidas; testes unitários na lógica portada; comparação de paridade com dados reais |
| Escopo da Fase 1 é grande (8 telas + lógica) | Ordem de port definida; entregas tela a tela testáveis no aparelho desde o 1º dia |
| LGPD (dados financeiros + contas de terceiros) | Modo local-only como padrão; agente cybersecurity antes do lançamento público; política de privacidade na Fase 4 |

## 10. Fora de escopo (por enquanto)

- OFX/QFX importer (permanece no backlog, pós-migração)
- Web app da versão nova (React Native Web é possível no futuro; PWA atual cobre o interim)
- Notificações push, widgets, biometria — candidatos a upgrade nativo pós-paridade
- Pricing/paywall detalhado (discovery próprio na Fase 5)

---

**Próximo passo após aprovação:** atualizar product.md (visão muda: app nativo deixa de ser
"fora do escopo") e iniciar Fase 0.
