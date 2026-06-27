#!/bin/bash
# .claude/scripts/init.sh
# Script de inicialização da estrutura de contexto do projeto
# Execute na raiz do projeto: bash .claude/scripts/init.sh

set -e

# ─── Cores ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${GREEN}✅ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠️  $1${NC}"; }
info()   { echo -e "${BLUE}ℹ️  $1${NC}"; }

# ─── Nome do projeto ──────────────────────────────────────────────────────────
PROJECT_NAME=${1:-$(basename "$PWD")}
NOW=$(date '+%Y-%m-%d %H:%M')

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Inicializando contexto do projeto    ║"
echo "╚══════════════════════════════════════════╝"
echo ""
info "Projeto: $PROJECT_NAME"
info "Data: $NOW"
echo ""

# ─── Criar estrutura de diretórios ───────────────────────────────────────────
dirs=(
  ".claude/discovery"
  ".claude/inventory"
  ".claude/inventory/runbooks"
  ".claude/specs"
  ".claude/contracts"
  ".claude/decisions"
  ".claude/progress"
  ".claude/debt"
  ".claude/retro"
  ".claude/skills"
  ".claude/scripts"
  ".claude/archive/specs"
  ".claude/archive/contracts"
  ".claude/archive/decisions"
)

for dir in "${dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    log "Criado: $dir"
  else
    warn "Já existe: $dir"
  fi
done

echo ""

# ─── current.md ──────────────────────────────────────────────────────────────
if [ ! -f ".claude/progress/current.md" ]; then
cat > .claude/progress/current.md << EOF
# Estado Atual do Projeto

**Atualizado em:** $NOW
**Agente:** Inicialização
**Sessão:** Setup inicial do projeto

## Em andamento
- Projeto recém-inicializado — contexto ainda não definido

## Próximo passo esperado
- Product Owner: definir escopo, vision e primeiras stories
- Ou: descrever o projeto ao agente para ele gerar o contexto inicial

## Contexto crítico
- Estrutura .claude/ criada em $NOW
- Projeto: $PROJECT_NAME
EOF
log "Criado: .claude/progress/current.md"
else
  warn "Já existe: .claude/progress/current.md"
fi

# ─── log.md ──────────────────────────────────────────────────────────────────
if [ ! -f ".claude/progress/log.md" ]; then
cat > .claude/progress/log.md << EOF
# Log de Progresso — $PROJECT_NAME

> Arquivo append-only. Nunca editar entradas existentes. Sempre adicionar no topo.

---
**$NOW — Inicialização**
- Feito: Estrutura .claude/ criada via init.sh
- Decisões: Nenhuma ainda
- Artefatos: Diretórios e arquivos base da estrutura de contexto
- Pendências: Definir escopo e primeiras stories com o Product Owner
---
EOF
log "Criado: .claude/progress/log.md"

# ─── debt/backlog.md ─────────────────────────────────────────────────────────
if [ ! -f ".claude/debt/backlog.md" ]; then
cat > .claude/debt/backlog.md << DEBTEOF
# Backlog de Débito Técnico — 

> Arquivo append-only. Registrar débitos identificados pelo Code Reviewer ou Senior Dev.
> Revisar e priorizar na Retrospectiva de cada ciclo.

DEBTEOF
log "Criado: .claude/debt/backlog.md"
else
  warn "Já existe: .claude/debt/backlog.md"
fi
else
  warn "Já existe: .claude/progress/log.md"
fi

# ─── inventory/project.md ────────────────────────────────────────────────────
if [ ! -f ".claude/inventory/project.md" ]; then
cat > .claude/inventory/project.md << EOF
# Inventory — $PROJECT_NAME

**Criado em:** $NOW
**Status:** Em definição

## Visão geral
> Descrever o projeto aqui após alinhamento com o Product Owner.

## Módulos / Serviços
| Nome | Responsabilidade | Status |
|------|-----------------|--------|
| — | — | Não definido |

## Entidades principais
| Entidade | Descrição | Módulo |
|----------|-----------|--------|
| — | — | — |

## Stack
| Camada | Tecnologia | Observações |
|--------|-----------|-------------|
| — | — | — |

## Integrações externas
| Serviço | Tipo | Status |
|---------|------|--------|
| — | — | — |
EOF
log "Criado: .claude/inventory/project.md"
else
  warn "Já existe: .claude/inventory/project.md"
fi

# ─── product.md ──────────────────────────────────────────────────────────────
if [ ! -f ".claude/product.md" ]; then
cat > .claude/product.md << EOF
# Visão de Produto — $PROJECT_NAME

**Criado em:** $NOW
**Status:** Em definição

## Problema que resolve
> Descrever o problema central que este produto resolve.

## Usuário alvo
> Quem vai usar e em que contexto.

## Proposta de valor
> O que torna este produto único ou superior às alternativas.

## Objetivos estratégicos
| Objetivo | Métrica de sucesso | Prazo |
|----------|-------------------|-------|
| — | — | — |

## Escopo atual
> O que está dentro do escopo do produto hoje.

## Fora do escopo
> O que explicitamente não faz parte do produto.
EOF
log "Criado: .claude/product.md"
else
  warn "Já existe: .claude/product.md"
fi

# ─── architecture.md ─────────────────────────────────────────────────────────
if [ ! -f ".claude/architecture.md" ]; then
cat > .claude/architecture.md << EOF
# Visão de Arquitetura — $PROJECT_NAME

**Criado em:** $NOW
**Status:** Em definição

## Visão geral do sistema
> Descrição de alto nível da arquitetura.

## Stack tecnológica
| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| — | — | — |

## Padrões arquiteturais adotados
> Listar padrões e convenções que todos os agentes devem seguir.

## Fronteiras de domínio
> Módulos, serviços e suas responsabilidades.

## Decisões arquiteturais vigentes
> Referenciar ADRs em .claude/decisions/

## Restrições técnicas
> Limitações que impactam decisões de implementação.
EOF
log "Criado: .claude/architecture.md"
else
  warn "Já existe: .claude/architecture.md"
fi

# ─── glossary.md ─────────────────────────────────────────────────────────────
if [ ! -f ".claude/glossary.md" ]; then
cat > .claude/glossary.md << EOF
# Glossário — $PROJECT_NAME

**Criado em:** $NOW

> Termos do domínio e do projeto. Todo agente deve usar esta linguagem.
> Adicionar termos sempre que surgir ambiguidade de vocabulário.

| Termo | Definição | Contexto de uso |
|-------|-----------|----------------|
| — | — | — |
EOF
log "Criado: .claude/glossary.md"
else
  warn "Já existe: .claude/glossary.md"
fi

# ─── .gitignore para .claude ─────────────────────────────────────────────────
if [ ! -f ".claude/.gitignore" ]; then
cat > .claude/.gitignore << EOF
# Não versionar secrets ou dados sensíveis
*.env
*.key
*.pem
secrets/
EOF
log "Criado: .claude/.gitignore"
fi

# ─── Copiar init.sh para o lugar certo ───────────────────────────────────────
SCRIPT_PATH=".claude/scripts/init.sh"
if [ ! -f "$SCRIPT_PATH" ]; then
  cp "$0" "$SCRIPT_PATH" 2>/dev/null || true
  chmod +x "$SCRIPT_PATH" 2>/dev/null || true
  log "Script copiado para: $SCRIPT_PATH"
fi

# ─── CLAUDE.md na raiz ───────────────────────────────────────────────────────
if [ ! -f "CLAUDE.md" ]; then
  warn "CLAUDE.md não encontrado na raiz."
  info "Copie o CLAUDE.md padrão para a raiz do projeto para ativar o contexto automático."
else
  log "CLAUDE.md encontrado na raiz ✓"
fi

# ─── Resumo final ────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           Inicialização completa         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Estrutura criada em .claude/"
echo ""
echo "  Próximos passos:"
echo "  1. Certifique-se que CLAUDE.md está na raiz"
echo "  2. Abra o Claude Code neste diretório"
echo "  3. O agente lerá o contexto automaticamente"
echo "  4. Descreva o projeto para o Product Owner gerar o contexto inicial"
echo ""
