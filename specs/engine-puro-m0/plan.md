# Implementation Plan: M0 — Engine de Simulação Puro

**Branch**: `feature/001-engine-core-m0` | **Date**: 2026-08-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/engine-puro-m0/spec.md`

## Summary

Construir `packages/engine` como função pura `simulate(design, workload) → SimulationResult`:
propaga carga pelo grafo com split de peso normalizado, calcula utilização/fila M/M/1/latência
p50-p99/throughput limitado pelo gargalo, aplica efeito de cache, roda análises estáticas (SPOF,
órfão, ciclo, aresta async), calcula custo a partir de um catálogo de ~10 componentes com dados
ilustrativos fixos (D5), e nunca lança exceção para entrada malformada (sempre retorna `Violation`).
Zero UI, zero dependência de runtime, determinístico. Abordagem técnica: TypeScript puro + Vitest,
sem build step próprio neste marco (ver [research.md](research.md)).

## Technical Context

**Language/Version**: TypeScript 5.x, modo `strict`. Executado sobre Node.js 20 LTS para
desenvolvimento/teste; consumido como fonte TS via workspace (sem `dist/` compilado em M0 — ver
research.md §1).

**Primary Dependencies**: Nenhuma dependência de runtime (constitution II). DevDependencies:
`typescript`, `vitest`, `@vitest/coverage-v8`.

**Storage**: N/A — função pura sem persistência.

**Testing**: Vitest, com `@vitest/coverage-v8` e thresholds `lines/functions/branches/statements: 80`
configurados em `packages/engine/vitest.config.ts` (research.md §2).

**Target Platform**: Runtime-agnóstico — deve funcionar tanto em Node.js (testes) quanto em browser
(via `apps/web`/Next.js a partir de M1), portanto sem uso de APIs exclusivas de Node (`fs`, `process`)
nem de browser (`window`, `document`).

**Project Type**: Biblioteca TypeScript pura (pacote de workspace pnpm), não CLI nem serviço web.

**Performance Goals**: `simulate()` sobre um grafo de 30 nós conclui em <50ms (SC-002/RNF-1).

**Constraints**: zero dependência de runtime (constitution II); determinismo total, sem RNG
não-semeado (constitution III); nenhuma métrica/nota gerada fora do engine (constitution I).

**Scale/Scope**: catálogo de 11 tipos de componente (FR-014, ver data-model.md); grafos de teste de
referência de poucos nós até o caso de estresse de 30 nós (SC-002); sem limite superior de nós
imposto pelo M0 além da meta de performance.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio/Seção | Verificação | Status |
|---|---|---|
| I. Engine é a fonte da verdade | `SimulationResult` é o único produtor de número/nota; nenhum campo é preenchido por texto livre ou LLM | PASS |
| II. Engine puro | Nenhuma dependência de runtime planejada (Primary Dependencies acima); Target Platform explicitamente runtime-agnóstico | PASS |
| III. Determinismo total | Nenhum uso de `Math.random`/`Date.now`/estado global nos algoritmos descritos em research.md | PASS |
| IV. Só pontua o caminho | `orphan-node` (FR-010) exclui nós desconectados de `cost`/`scores`/`path` — ver data-model.md | PASS |
| V. Score multidimensional | `SimulationResult.scores: Record<Dimension, ...>` com as 7 dimensões de §9, nunca um número único | PASS |
| VI. Modelo matemático é especificação | Fórmulas de §7 usadas literalmente (research.md §3-4); nenhuma substituição por heurística própria | PASS |
| VII. Fronteira de camadas | Estrutura de pastas abaixo confina tudo a `packages/engine`; nenhum import de `apps/web` nem `packages/narrator` | PASS |
| Restrições Técnicas Adicionais (contrato do engine) | `contracts/engine-api.md` documenta o contrato público; qualquer mudança de shape é breaking change explícito | PASS |

Nenhuma violação — **Complexity Tracking não se aplica** a este plano.

**Re-check pós Fase 1** (após research.md, data-model.md, contracts/, quickstart.md): nenhum dos
artefatos de design introduziu dependência de runtime, estado mutável, aleatoriedade não-semeada ou
produção de métrica fora do engine. Todas as linhas da tabela permanecem PASS.

## Project Structure

### Documentation (this feature)

```text
specs/engine-puro-m0/
├── plan.md              # Este arquivo
├── research.md           # Fase 0
├── data-model.md          # Fase 1
├── quickstart.md          # Fase 1
├── contracts/
│   └── engine-api.md      # Fase 1 — contrato da API pública (biblioteca, não serviço web)
└── tasks.md               # Fase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

<!--
  Não existe .specify/memory/patterns.md ainda (primeira feature do repositório). A estrutura abaixo
  deriva de docs/product-context.md §8 (estrutura de monorepo esperada) e do esqueleto já criado no
  Passo 2 da fundação do projeto (packages/engine/README.md). Nenhuma opção genérica do template foi
  usada — biblioteca TypeScript pura dentro do monorepo definido no CLAUDE.md.
-->

```text
packages/engine/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                 # export público: simulate()
│   ├── types.ts                 # Design, Workload, SimulationResult, Violation, Dimension...
│   ├── catalog/
│   │   └── components.ts        # os 11 tipos de componente com specs (dado versionado — D5)
│   ├── graph/
│   │   ├── validate.ts          # validação estrutural → Violation, nunca throw (FR-019)
│   │   ├── propagate.ts         # propagação de carga + normalização de peso (FR-002, FR-018)
│   │   └── static-analysis.ts   # SPOF, órfão, ciclo (FR-009, FR-010, FR-011)
│   ├── metrics/
│   │   ├── utilization.ts       # ρ = λ/(c·μ) (FR-003)
│   │   ├── queue.ts             # M/M/1 + Lei de Little (FR-004)
│   │   ├── latency.ts           # percentis p50/p95/p99 do caminho (FR-005, research.md §3)
│   │   ├── throughput.ts        # gargalo do caminho (FR-006, FR-007)
│   │   └── cache.ts             # efeito de cache sobre carga/latência (FR-008)
│   └── cost/
│       └── calculate.ts         # custo por nó e total (FR-013)
└── test/
    ├── reference-designs/       # os 3 designs de referência com conta à mão (FR-015, SC-001)
    ├── metrics/                 # 1 arquivo de teste por fórmula
    ├── graph/                   # testes das análises estáticas e validação
    └── catalog/                 # teste de sanidade do catálogo (11 tipos, specs completas)
```

**Structure Decision**: pacote único `packages/engine` dentro do monorepo pnpm já estabelecido
(`CLAUDE.md`, `docs/product-context.md` §8). Submódulos internos (`graph/`, `metrics/`, `cost/`,
`catalog/`) espelham as áreas funcionais da spec (FR-002 a FR-014) — modularização por
responsabilidade, não por camada técnica arbitrária, evitando um único arquivo monolítico sem criar
abstração extra (nenhum `Service`/`Repository`/DI — é cálculo puro, não há estado para injetar).

## Complexity Tracking

*Não aplicável — Constitution Check não encontrou violações (ver tabela acima).*
