# Implementation Plan: M4.2 — Biblioteca de 12 problemas

**Branch**: `feature/002-problem-library-m4-2` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

## Summary

Conteúdo puro em `packages/problems`: 9 arquivos de catálogo novos com o texto aprovado em
`content-draft.md`, um campo `level` em `Problem` e construtores dos critérios de rubrica que se repetem
(latência p99, nenhum nó saturado, sem SPOF, "usa X", "X consulta Y") — os 3 problemas atuais passam a
usá-los sem mudar o que avaliam. Em `apps/web`: a matriz de conexões ganha 5 conexões (spec,
Clarifications 2026-10-28), a progressão vira "por nível" (mesma função no cliente e no servidor) e o
menu "Desafios" agrupa por nível. Engine, narrador e banco intocados.

## Technical Context

**Language/Version**: TypeScript 5.7 · **Dependencies**: nenhuma nova · **Storage**: nenhuma mudança

**Testing**: Vitest. Já existentes e que passam a cobrir os 9 automaticamente (iteram `ALL_PROBLEM_IDS`):
referência resolve a própria rubrica, dica citada por problema, links da biblioteca, validação de design
no servidor, scoring, snapshot de regressão do engine (ganha entradas novas; as antigas ficam iguais).
Novos: construtores de rubrica; 4 por nível; design ingênuo de cada problema novo falha a rubrica
(SC-002); toda referência cabe na matriz do canvas, incluindo Cliente → entradas (FR-009); nenhum nó da
referência acima de ρ 0,8 (FR-003); progressão por nível.

## Constitution Check

- Engine é a fonte dos números: critérios só comparam o que `simulate()` já produziu — inclusive o novo
  "SQL recebe < 30% da carga de entrada" (Matching), que lê `offeredLoad` dos nós.
- Sem nota única de desafio: rubrica continua pass/fail por critério.
- Escopo: tudo vem do §10 (M4: "biblioteca de 12 problemas") + decisões do autor registradas no spec.

## Design

**`packages/problems`**
- `types.ts`: `ProblemLevel = 'basic' | 'intermediate' | 'advanced'`; `Problem.level`.
- `rubric-criteria.ts` (novo): `latencyWithin(budgetMs, label)`, `NO_SATURATED_NODE`, `NO_SPOF`,
  `usesComponent(id, label, ...types)`, `connects(id, label, fromTypes, toTypes)`. O critério de
  latência continua com id `latency-p99` (o teste de `latencyBudgetMs` depende dele).
- `catalog/*.ts`: 9 novos; os 3 atuais trocam os critérios copiados pelos construtores.
- `index.ts`: `PROBLEM_LEVELS` (ordem), catálogo em ordem de nível, `ALL_PROBLEMS` (lista ordenada,
  para a progressão) além de `ALL_PROBLEM_IDS`/`getProblem`.

**`apps/web`**
- `lib/connection-rules.ts`: rate_limiter → cache/nosql_kv; worker → notifications; auth_service →
  app_server; api_gateway → kafka/event_stream; kafka/event_stream → analytics/data_warehouse.
- `lib/challenge-progression.ts`: `blockingLevel(problemId, catalog, completedIds)` (nível que falta
  resolver, `null` se aberto) e `isChallengeUnlocked(...)` (id desconhecido nunca abre). Regra: básico
  sempre aberto; nível N abre quando há ao menos um problema resolvido no nível N-1. Só abre mais que a
  regra antiga (Encurtador e Feed/Checkout continuam acessíveis para quem já tinha).
- Chamadores: `POST /api/submissions`, `canvas-workspace.tsx` (2), `challenge-topbar.tsx` (menu
  agrupado por nível, com "Resolva um problema do nível X").

## Riscos

- Snapshot do engine: só ganha entradas; se alguma antiga mudar, é regressão — parar.
- "Catálogo completo" passa a exigir 12 (aceito no spec).
