# Estado Atual do Projeto

**Atualizado em:** 2026-06-27
**Agente:** Senior Software Engineer
**Sessão:** Sprint 4b — categorias orçadas de cartão — implementação e correção de bugs

## Em andamento

- Sprint 4b implementado e em validação manual no browser pelo usuário
- Erro de carregamento da aba Cartão corrigido (guard `db.objectStoreNames.contains` em `categoriasCartaoAll`)
- Usuário confirmou que cartões carregam agora — validando funcionalidades

## Próximo passo esperado

- Usuário testar os pontos principais do Sprint 4b:
  1. Criar/editar/excluir categoria na seção "Categorias Orçadas"
  2. Vincular gasto a categoria no modal de gasto
  3. Seção "Por Categoria" na fatura (realizado vs orçado + barra)
  4. Projeção considera delta de categoria
  5. Editar recorrente (fix do bug pré-existente confirmado)
- Após validação: commitar e seguir para Sprint 5 (onboarding)

## Contexto crítico para não perder

- Guard adicionada em `categoriasCartaoAll()` em `db.js`: se store não existe (banco ainda em v5), retorna `[]` sem lançar exceção — garante retrocompatibilidade enquanto SW não atualiza
- SW bumpeado para v7 no commit anterior (1736244) — força recarga do db.js novo
- IndexedDB versão 6 cria store `categoriasCartao` no upgrade
- `saveRecorrenteEdit` bug pré-existente (DT-005) corrigido nesta sprint — declarações agora antes das validações
- JSON.stringify em onclick linha 175 de cards-render.js é pré-existente — documentado e aceito

## Roadmap

| Sprint | Item | Status |
|--------|------|--------|
| 1 | Split cards.js | Concluído |
| 2 | Simplificação TX + Dashboard | Concluído |
| 3 | Gráficos no dashboard | Concluído |
| 4 | Melhorias na projeção | Concluído |
| 4b | Categorias orçadas de cartão | Em validação |
| 5 | Onboarding | Pendente |
| 6 | OFX/QFX importer | Pendente |
