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
**Plano ativo**: M2 — Avaliação e biblioteca
([specs/avaliacao-biblioteca-m2/plan.md](specs/avaliacao-biblioteca-m2/plan.md)), branch
`feature/001-evaluation-narrator-scoring`. **Código completo** (US1-US4: score por dimensão,
narrador via Google Gemini `gemini-2.5-flash`, solução de referência, calculadora de capacidade) —
`tsc`/381 testes/build limpos nos 4 pacotes. Catálogo de problemas fica em 3 (não 6) neste marco —
decisão de `/speckit-clarify`. **Status da spec continua `Ready`, não `Done`**: o critério de saída
oficial ("narrador nunca contradiz o engine em 20 submissões consecutivas") exige observação
empírica com uma `GEMINI_API_KEY` real e login manual no browser — nenhum dos dois disponível pro
agente nesta sessão. Falta ao autor: configurar a chave, verificar `quickstart.md`, e promover
`spec.md` pra `Done` depois de confirmar as 20 submissões.

Marcos concluídos: M1.5 (Catálogo expandido de componentes,
[specs/catalogo-expandido-m1-5/plan.md](specs/catalogo-expandido-m1-5/plan.md)), M1 (Canvas e
submissão, [specs/canvas-submissao-m1/plan.md](specs/canvas-submissao-m1/plan.md)), M0.5 (Landing
Page e Conta, [specs/landing-page-conta-m0-5/plan.md](specs/landing-page-conta-m0-5/plan.md)) — mais
um lote fora do fluxo formal entre M1.5 e M2 (canvas sandbox/desafios/templates/Simular,
[specs/canvas-sandbox-desafios-templates/decisions.md](specs/canvas-sandbox-desafios-templates/decisions.md)).
<!-- SPECKIT END -->
