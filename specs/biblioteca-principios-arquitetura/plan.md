# Implementation Plan: M2.7 — Biblioteca de princípios de arquitetura

**Branch**: `feature/001-architecture-principles-library` | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/biblioteca-principios-arquitetura/spec.md` (Status: Ready)

## Summary

Uma biblioteca navegável de 39 entradas (9 de *Clean Architecture* incluindo SOLID, 19 características de
Richards & Ford fora das 7 dimensões de score, 11 padrões do Fowler como leitura), em página própria
`/app/biblioteca`. O conteúdo vive como dado puro em `packages/knowledge` (módulo novo `library`),
reaproveitando `Source` e as 3 constantes de obra do M2.6. Como SOLID não tem dimensão nem template, o
modelo é uma **lista com testes de integridade**, não o `Record` exaustivo do M2.6 (`research.md` §2.2).
A US4 liga as dicas do M2.6 à biblioteca por um campo opcional `Hint.libraryEntryId`. Narrador, engine,
canvas e banco **não mudam**.

## Technical Context

**Language/Version**: TypeScript 5.7 (igual ao resto do monorepo)

**Primary Dependencies**: nenhuma dependência nova — `@sdp/knowledge` (já existe), `lucide-react` e
`next/link` (já em uso) para a UI

**Storage**: nenhuma — dado estático versionado em código; **sem tabela, sem migração**

**Testing**: Vitest. `packages/knowledge`: invariantes da lista (ids únicos, fonte ∈ 3 constantes,
topologia/nota obrigatórias, inventário completo, SOLID presente). `packages/problems`: todo
`libraryEntryId` resolve. `apps/web`: `filterLibraryEntries` (função pura em `src/lib/`). **Nenhum teste
de componente/rota** — convenção de M0.5 (verificado no browser, `quickstart.md`).

**Target Platform**: Web (Next.js App Router) — uma rota nova, filha de `app/app/layout.tsx`

**Project Type**: monorepo existente — estende `packages/knowledge`, `packages/problems` (1 campo
opcional), `apps/web` (rota + 2 componentes + 1 função pura + link na dica + link na topbar)

**Performance Goals**: nenhuma meta nova — conteúdo estático; SC-003 (≤ 3 interações) é de navegação

**Constraints**: nenhuma entrada sem fonte (FR-002); citação só obra + autor (FR-007); nenhum padrão
do Fowler vira componente/cálculo (FR-005); **conteúdo só entra em código depois da aprovação do
autor** (FR-006, `content-draft.md`); narrador/engine/componentes intocados (FR-009)

**Scale/Scope**: 39 entradas, 1 rota, 1 campo novo em `Hint`, 3 dicas ligadas

## Constitution Check

| Princípio | Como este marco cumpre | Risco |
|---|---|---|
| I — Engine é a fonte da verdade | A biblioteca é só texto; nenhum número, nota ou métrica nasce nela | Nenhum |
| II — Engine puro | `packages/engine` não é tocado; `knowledge` só importa tipo de `@sdp/engine` (já era assim) | Nenhum |
| III — Determinismo | Conteúdo estático; sem cálculo, sem RNG | Nenhum |
| IV — Só pontua o caminho da requisição | Não se aplica — sem score novo | Nenhum |
| V — Score multidimensional | A biblioteca não pontua nada e não tem estado de usuário (FR-010); características fora das 7 dimensões dizem que a plataforma não as calcula | Baixo — a UI não pode sugerir ranking/progresso |
| VI — Modelo matemático é especificação | Nenhuma fórmula nova ou alterada | Nenhum |
| VII — Fronteira de camadas | Dado em `knowledge`, UI em `apps/web`; filtro de busca é lógica de UI (não recalcula métrica); narrador não consome a biblioteca (FR-009) | Baixo |

**Resultado**: sem violação; sem entrada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/biblioteca-principios-arquitetura/
├── plan.md            # este arquivo
├── research.md        # inventário aprovado + decisões técnicas + gate de conteúdo
├── content-draft.md   # rascunho das 39 definições — AGUARDA aprovação do autor (FR-006)
├── data-model.md      # LibraryEntry, invariantes, Hint.libraryEntryId, filterLibraryEntries
├── quickstart.md      # verificação por user story
└── tasks.md           # /speckit-tasks
```

### Source Code (repository root)

```text
packages/knowledge/
├── src/
│   ├── library.ts                 # NOVO — tipos + LIBRARY_ENTRIES + getLibraryEntry + labels + validação
│   ├── library/                   # NOVO — uma categoria por arquivo (um gate de aprovação cada):
│   │   ├── clean-architecture.ts  #        9 entradas
│   │   ├── characteristics.ts     #        19 entradas
│   │   └── poeaa.ts               #        11 entradas
│   └── index.ts                   # + reexport de library
└── test/library.spec.ts           # NOVO — invariantes da lista

packages/problems/
├── src/types.ts                   # Hint ganha libraryEntryId?: string
├── src/catalog/{url-shortener,social-feed,ecommerce-checkout}.ts   # vínculo nas 3 dicas M2.6
└── test/hints-library-link.spec.ts # NOVO — todo libraryEntryId resolve

apps/web/src/
├── app/app/biblioteca/page.tsx    # NOVO — Server Component; herda o guard do layout
├── components/library/
│   ├── library-browser.tsx        # NOVO — busca + categorias/grupos + entrada aberta (?entry=)
│   └── library-entry-card.tsx     # NOVO — renderiza uma entrada (definição, fonte, topologia/nota)
├── components/canvas/
│   ├── challenge-topbar.tsx       # + link "Biblioteca" (next/link)
│   └── challenge-card.tsx         # + "Ler na biblioteca" quando hint.libraryEntryId
└── lib/library-search.ts          # NOVO — filterLibraryEntries (pura)
apps/web/test/library-search.spec.ts # NOVO
```

**Structure Decision**: biblioteca dentro de `@sdp/knowledge` (`research.md` §2.1) e rota filha de
`/app` (§2.3) — herda o guard de autenticação sem código de auth novo. `packages/narrator`,
`packages/engine`, `apps/web/src/db` e `next.config.ts` ficam intocados (o pacote `@sdp/knowledge` já
está em `transpilePackages`).

## Gates antes do `/speckit-implement`

1. **Conteúdo (FR-006)**: o autor revisa/aprova `content-draft.md`. Sem isso, nenhuma entrada vira
   código — mesmo gate das fórmulas de score (M2) e das fichas (M2.6).
2. Nenhum outro: não há decisão de produto aberta (clarify fechado; M4 mantém a "wiki de conceitos").

## Fora de escopo (já decidido)

Prompt do narrador (continua v3), progresso por conceito e mapeamento completo problema ↔ conceito
(M4), segunda leva de conteúdo (princípios de componentes, estilos, 40 padrões restantes do Fowler),
qualquer XP/ranking (M2.8).
