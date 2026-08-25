# Implementation Plan: M1.5 — Catálogo expandido de componentes do canvas

**Branch**: `feature/001-expanded-component-catalog` | **Date**: 2026-08-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/catalogo-expandido-m1-5/spec.md`

## Summary

M1 restringiu deliberadamente a paleta do canvas aos 11 `ComponentType` de M0. Depois de usar o
produto, o autor pediu a paleta real do concorrente citado como inspiração
(`sdplayground.vercel.app`) — 9 categorias, 46 componentes (44 `ComponentType` + 2 variantes de
Cliente). Esta feature entrega isso em 3 fases sequenciais com revisão do autor entre elas (FR-007):
US1 reorganiza a paleta atual em 9 categorias sem adicionar nenhum componente; US2 adiciona os 23
componentes "limpos" (mesmo modelo de "capacidade ao longo do caminho" dos 11 atuais); US3 adiciona
os 10 componentes de Observability/Network, que a clarificação decidiu tratar como `ComponentType`
real com specs simbólicas plausíveis, nunca como nó decorativo. Nenhuma mudança de forma nos tipos
`Design`/`Workload`/`SimulationResult` do engine — só o domínio de `ComponentType` cresce, com uma
entrada de catálogo (capacidade/latência/custo) e uma regra de conectividade por componente novo.

## Technical Context

**Language/Version**: TypeScript 5.7 (mesma versão de `packages/engine`/`apps/web`, já fixada em M0/M0.5/M1)

**Primary Dependencies**: nenhuma dependência nova — reaproveita `@xyflow/react`, `zustand`+`immer` (ADR-002/ADR-004, já em uso desde M1); `lucide-react` ganha só novos ícones importados (já é dependência existente de `apps/web`)

**Storage**: nenhuma mudança — `localStorage` do canvas (autosave, FR-011 de M1) continua igual; designs salvos antes deste incremento continuam válidos (Edge Case da spec)

**Testing**: Vitest — mesmo padrão de M0/M0.5/M1: cobertura forte em módulos puros (`packages/engine/src/catalog/components.ts`, `apps/web/src/lib/connection-rules.ts`, `component-categories.ts` novo, `canvas-ui-catalog.ts`); wiring de UI (`palette.tsx` reagrupado) verificado por `tsc`/build/checagem manual no browser

**Target Platform**: Web (Next.js App Router, `apps/web`), mesmo app de M1 — nenhuma rota nova

**Project Type**: Web application (monorepo já existente) — esta feature só estende `packages/engine` (dados) e `apps/web` (apresentação/regra de conectividade); `packages/problems` e `packages/narrator` não são tocados

**Performance Goals**: mesmas de M1 (RNF-2 <100ms preview, RNF-7 60fps até 50 nós) — catálogo maior não muda o formato de `simulate()`, só o tamanho do domínio de entrada

**Constraints**: cálculo 100% client-side (sem mudança de modelo de confiança — `research.md` §6); `packages/engine` só ganha dado versionado, nenhuma lógica de `simulate()`/`propagateLoad` muda (Constitution II); nenhuma dependência de LLM nova (fora de escopo até M2)

**Scale/Scope**: `ComponentType` cresce de 11 para 44; paleta cresce de 2 grupos fixos pra 9 categorias; `ALLOWED_TARGETS` cresce de 12 para 45 chaves

## Constitution Check

*GATE: verificado antes da Fase 0 e re-checado após a Fase 1.*

| Princípio | Como este marco cumpre | Risco de violação |
|---|---|---|
| I — Engine é a fonte da verdade | Todo componente novo tem `ComponentSpec` real em `COMPONENT_CATALOG` — nenhum número de utilização/latência/custo pro componente novo é inventado em `apps/web` (SC-002 exige reação real da simulação). | Baixo — mesma garantia mecânica de M0/M1 (o `Record` exaustivo recusa build sem spec). |
| II — Engine puro | `packages/engine` ganha só dados (`types.ts` + `catalog/components.ts`) — nenhuma função nova, nenhuma dependência de UI/rede/IO. `simulate()`/`propagateLoad` não mudam de assinatura nem de lógica. | Baixo — verificado por `tsc` do pacote isolado. |
| III — Determinismo | Specs novas são constantes estáticas, como as 11 já existentes — nenhum RNG introduzido. | Nenhum. |
| IV — Só pontua o caminho da requisição | Já garantido pelo engine (`computeReachableNodeIds`, M0) — componentes novos não mudam essa regra, só ampliam o domínio de nós que podem estar (ou não) no caminho. VPC/Subnet como "container de alta capacidade" (FR-006) não é uma exceção à regra — ainda MUST estar no caminho pra contar, só nunca é o fator limitante. | Baixo. |
| V — Score multidimensional, nunca nota única | Sem mudança — `SimulationResult.scores` continua placeholder (M0, FR-020); esta feature não adiciona painel de nota. | Nenhum. |
| VI — Modelo matemático é especificação | Nenhuma fórmula nova — os componentes novos usam exatamente `ρ = λ/(c·μ)`, M/M/1, etc. já implementados; só variam os parâmetros de entrada (μ, latência base, custo) por componente. | Nenhum. |
| VII — Fronteira de camadas | `apps/web` só consome `ComponentType`/`COMPONENT_CATALOG` novos via `@sdp/engine` — nenhuma métrica recalculada fora do engine. `component-categories.ts` é puramente apresentação, nunca lido por `packages/engine`. | Baixo. |

**Resultado**: nenhuma violação. Nenhuma entrada em Complexity Tracking necessária.

## Project Structure

### Documentation (this feature)

```text
specs/catalogo-expandido-m1-5/
├── plan.md                              # Este arquivo
├── research.md                          # Fase 0 — arquétipos de spec/conectividade
├── data-model.md                        # Fase 1 — ComponentType expandido, CATEGORY_OF
├── quickstart.md                        # Fase 1 — verificação manual por user story
├── contracts/
│   └── novo-componente-contract.md      # Fase 1 — checklist de 5 pontos por componente novo
└── tasks.md                             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

Nenhum pacote/diretório novo — esta feature estende arquivos já existentes de M0/M1:

```text
packages/
└── engine/
    └── src/
        ├── types.ts                     # ComponentType: 11 → 44 valores (US2: +23, US3: +10)
        └── catalog/
            └── components.ts            # COMPONENT_CATALOG: +33 entradas, por arquétipo (research.md §2)

apps/web/
└── src/
    ├── lib/
    │   ├── connection-rules.ts          # ALLOWED_TARGETS: +33 chaves (research.md §3)
    │   ├── canvas-ui-catalog.ts         # COMPONENT_UI: +33 entradas (label/icon/description, FR-004)
    │   └── component-categories.ts      # NOVO — CATEGORY_OF + PALETTE_CATEGORY_ORDER (FR-001, data-model.md)
    └── components/
        └── canvas/
            └── palette.tsx              # reagrupa por PALETTE_CATEGORY_ORDER em vez de 2 grupos fixos
```

**Structure Decision**: nenhuma estrutura nova — a feature é uma extensão de dados/apresentação
sobre arquivos que M0/M1 já estabeleceram. O único arquivo novo é `component-categories.ts`,
colocado ao lado de `canvas-ui-catalog.ts`/`connection-rules.ts` em `apps/web/src/lib` porque
segue a mesma natureza (dado de apresentação puro, sem dependência de framework) — não justifica
um diretório novo.

## Complexity Tracking

*Sem violações da Constitution Check acima — seção não aplicável.*
