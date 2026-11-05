# Implementation Plan: M4.3 — Wiki de conceitos e progresso por conceito

**Branch**: `feature/003-concept-progress-wiki-m4-3` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

## Summary

Os 13 conceitos aprovados viram uma **categoria nova da biblioteca do M2.7** (`concepts`), reaproveitando
busca, `?entry=`, validação e UI. A categoria exige três campos que as outras não usam — trade-off,
capítulo da fonte e princípios relacionados — validados por `validateLibraryEntries`, no mesmo padrão
de "campo obrigatório por categoria" que já existe. A 4ª obra (DDIA) entra em `source.ts`. Cada
`Problem` declara os conceitos que exercita; a lista "aparece em" de um conceito é derivada disso
(`problemsForConcept`). O progresso por conceito é uma função pura sobre os desafios resolvidos, que a
página de progresso já carrega. Engine, narrador, banco e XP intocados.

## Technical Context

**Language/Version**: TypeScript 5.7 · **Dependencies**: nenhuma nova · **Storage**: nenhuma mudança

**Testing**: Vitest — validação da biblioteca com a categoria nova (casos inválidos incluídos), mapa
problema → conceito (ids válidos, totais do rascunho aprovado), `problemsForConcept`, progresso por
conceito e pontos fracos (função pura em `apps/web/src/lib/gamification/`, sob a cobertura de 90%).

## Design

**`packages/knowledge`**
- `source.ts`: `DESIGNING_DATA_INTENSIVE_APPLICATIONS`.
- `library.ts`: categoria `concepts` (primeira na ordem, rótulo "Conceitos de system design");
  `LibraryEntry` ganha `tradeoff?`, `chapter?`, `relatedEntryIds?`; a validação exige `tradeoff` e
  `chapter` em `concepts`, aceita DDIA como 4ª fonte e exige que `relatedEntryIds` existam.
- `library/concepts.ts`: os 13 verbetes (grupo único "System design").

**`packages/problems`**
- `Problem.concepts: string[]` nos 12 (mapa aprovado); `problemsForConcept(conceptId)` no índice.

**`apps/web`**
- `lib/gamification/concept-progress.ts`: `conceptProgress(problems, solvedIds)` →
  `{ conceptId, solved, total }[]` (só total > 0) e `weakestConcepts(progress)` (menor fração entre os
  incompletos; vazio se tudo completo).
- `/app/progresso`: seção "Por conceito" (convite se nada resolvido; senão pontos fracos + lista).
- `/app/biblioteca`: título vira "Biblioteca"; o card do conceito mostra trade-off, capítulo,
  princípios relacionados (abre a entrada) e "aparece em" — link para `/app/<problemId>` se aberto,
  senão o motivo da trava (`blockingLevel`, calculado no servidor com os resolvidos da conta).
- Card do desafio: chips dos conceitos → `/app/biblioteca?entry=<id>`.
