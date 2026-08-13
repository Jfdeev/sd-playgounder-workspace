# System Design Playground

## Leitura obrigatória antes de qualquer tarefa neste repo

- [`docs/product-context.md`](docs/product-context.md) — fonte de verdade funcional.
  Rege toda decisão de escopo, arquitetura e prioridade. Em caso de conflito com
  qualquer outro documento, **este vence**.
- [`docs/foundational-doc.md`](docs/foundational-doc.md) — documento completo
  (lista exaustiva de funcionalidades, concorrentes, diferenciais). Consultar
  quando precisar de mais profundidade do que a versão condensada oferece.

Nenhuma feature, dependência, endpoint ou decisão de arquitetura pode ser criada
fora do que está descrito nesses dois arquivos. Se algo necessário não estiver
lá, pare e pergunte ao autor — não assuma, não improvise.

## Estrutura do monorepo

```
apps/web/            # Next.js: canvas, problemas, resultado
packages/engine/      # cálculo puro — o ativo real do projeto
packages/narrator/    # prompt + parsing da explicação em linguagem natural
packages/problems/    # catálogo de problemas + rubricas, como dados versionados
packages/ui/          # componentes compartilhados
```

Gerenciador de pacotes: **pnpm workspaces** (`pnpm-workspace.yaml`).

## Governança SDD

Este projeto segue Spec-Driven Development via GitHub Spec Kit
(`.specify/`). A ordem de construção é por marco (M0, M1, ...) conforme
`docs/product-context.md` §10 — nenhum marco começa antes do critério de saída
do anterior ser atingido.

<!-- SPECKIT START -->
**Plano ativo**: [specs/landing-page-conta-m0-5/plan.md](specs/landing-page-conta-m0-5/plan.md)
(M0.5 — Landing Page e Conta, branch `feature/001-landing-page-auth-m05`).
<!-- SPECKIT END -->
