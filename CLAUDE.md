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
packages/knowledge/    # fichas de característica/estilo de arquitetura, dado versionado (M2.6)
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
**Plano ativo**: M2.6 — Fundamentos de arquitetura
([specs/fundamentos-arquitetura/plan.md](specs/fundamentos-arquitetura/plan.md)), branch
`feature/001-architecture-fundamentals-knowledge-base` (contém também todos os commits de M2, que
não foi PR'd/merged antes desta branch ser criada). **Código completo de US1-US4** (pacote novo
`packages/knowledge` — 7 fichas de característica + 4 de estilo, dicas de responsabilidade/
acoplamento nos 3 problemas, UI de ficha em `ScorePanel`/`ChallengeTopBar`, narrador citando uma
ficha real via `citation_id` com fonte atribuída na UI) — `tsc`/433 testes/build limpos nos 5
pacotes. **US4 foi desbloqueada e implementada antes do critério de saída de M2 ser verificado** —
decisão do autor, 2026-09-26 (ver `docs/product-context.md`, "Ordem fora de sequência"):
consequência é que a verificação de 20 submissões de M2 precisa ser refeita contra o prompt atual
(`NARRATOR_PROMPT_VERSION`, versiona o hash de cache pra não colidir com o prompt antigo).
**Verificação manual concluída em 2026-09-27** (US1-US4 confirmados no browser, dados reais) — achou
e corrigiu 1 bug real pré-existente de M2 (commit `9956fcf`, narrador 500-ava em design saturado) e
encontrou 1 problema em aberto pendente de decisão do autor: timeout de 5s do narrador curto demais
pra `gemini-2.5-flash` com `responseSchema` na prática (~5.8s medido). Ver
`specs/fundamentos-arquitetura/tasks.md` (achados 3 e 4).

M2 — Avaliação e biblioteca ([specs/avaliacao-biblioteca-m2/plan.md](specs/avaliacao-biblioteca-m2/plan.md)):
**código completo** (US1-US4: score por dimensão, narrador via Google Gemini `gemini-2.5-flash`,
solução de referência, calculadora de capacidade) — `tsc`/381 testes/build limpos nos 4 pacotes.
Catálogo de problemas fica em 3 (não 6) neste marco — decisão de `/speckit-clarify`. **Status da
spec continua `Ready`, não `Done`**: o critério de saída oficial ("narrador nunca contradiz o
engine em 20 submissões consecutivas") ainda exige a observação formal das 20 submissões (agora
contra o prompt versão 2, de M2.6/US4 — não o original de M2) e uma decisão sobre o timeout de 5s
do narrador (achado 4 de M2.6, acima) antes de promover `spec.md` pra `Done`.

Marcos concluídos: M1.5 (Catálogo expandido de componentes,
[specs/catalogo-expandido-m1-5/plan.md](specs/catalogo-expandido-m1-5/plan.md)), M1 (Canvas e
submissão, [specs/canvas-submissao-m1/plan.md](specs/canvas-submissao-m1/plan.md)), M0.5 (Landing
Page e Conta, [specs/landing-page-conta-m0-5/plan.md](specs/landing-page-conta-m0-5/plan.md)) — mais
um lote fora do fluxo formal entre M1.5 e M2 (canvas sandbox/desafios/templates/Simular,
[specs/canvas-sandbox-desafios-templates/decisions.md](specs/canvas-sandbox-desafios-templates/decisions.md)).
<!-- SPECKIT END -->
