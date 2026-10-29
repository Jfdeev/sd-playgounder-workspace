# Tasks: M4.3 — Wiki de conceitos e progresso por conceito

**Input**: [plan.md](plan.md), [spec.md](spec.md), [content-draft.md](content-draft.md) (aprovado)

## Phase 1: Foundational
- [x] T001 DDIA em `source.ts`; categoria `concepts` + campos e validação em `library.ts` + testes
- [x] T002 `library/concepts.ts` com os 13 verbetes aprovados
- [x] T003 `Problem.concepts` nos 12 + `problemsForConcept` + testes (ids, totais)

## Phase 2: US1 — Wiki (P1) 🎯
- [x] T004 Biblioteca: categoria Conceitos, card com trade-off/capítulo/relacionados/"aparece em" (com trava)

## Phase 3: US2 — Conceitos no desafio (P2)
- [x] T005 Chips de conceito no card do desafio

## Phase 4: US3 — Progresso por conceito (P3)
- [x] T006 `concept-progress.ts` + testes
- [x] T007 Seção "Por conceito" em `/app/progresso`

## Phase 5: Polish
- [x] T008 Verificação no browser; testes/tsc/build; docs (`product-context.md` §10, `CLAUDE.md`); spec → `Done`; PR

## Resultado (2026-10-29)

- 13 conceitos na biblioteca (categoria `concepts`, DDIA por capítulo), mapa problema → conceito nos 12
  problemas, `problemsForConcept` derivado. Narrador intocado (ele só usa fichas e estilos, não a
  biblioteca — conferido antes de mexer).
- Browser, conta descartável (apagada no fim): progresso de conta nova mostra o convite e 11 conceitos
  (Replicação e Consenso fora); busca "idempotencia" sem acento acha o verbete, com trade-off, "na
  plataforma", fonte com capítulo e "aparece em" (Pix com o motivo da trava); Consenso mostra "ainda não
  há desafio"; "Robustez" no verbete de Redundância limpa a busca e abre a entrada; card do Encurtador
  mostra Caching e Redundância com link; depois de resolver o Encurtador, o progresso mostra Caching
  1/5 e Redundância 1/2.
- Observação de UX (não corrigida, segue o spec): com muitos conceitos empatados em 0, "você está mais
  fraco em" lista todos (9 depois do primeiro desafio). A regra aprovada é "empate: todos".
- 887 testes (engine 207, knowledge 72, narrator 34, problems 185, web 389), cobertura
  `apps/web/src/lib` 100% linhas, tsc e build limpos; snapshot do engine intacto.
