# Tasks: M4.2 — Biblioteca de 12 problemas

**Input**: [plan.md](plan.md), [spec.md](spec.md), [content-draft.md](content-draft.md) (aprovado)

## Phase 1: Setup
- [ ] T001 Baseline verde: `pnpm -r test`, `tsc`, build

## Phase 2: Foundational
- [ ] T002 `Problem.level` + `PROBLEM_LEVELS`; níveis dos 3 atuais
- [ ] T003 [P] `rubric-criteria.ts` + teste; os 3 atuais passam a usar os construtores (sem mudar o que
      avaliam — testes de rubrica existentes continuam verdes)
- [ ] T004 [P] Matriz de conexões: 5 conexões novas + teste

## Phase 3: US1 — 9 problemas (P1) 🎯 MVP
- [ ] T005 Básico: Rate limiter, Leaderboard, Notificações
- [ ] T006 Intermediário: Chat, Vídeo, Web crawler
- [ ] T007 Avançado: Pix, Matching de corridas, Cliques em anúncios
- [ ] T008 Testes: 4 por nível; ingênuo falha (SC-002); referência na matriz do canvas (FR-009);
      ρ ≤ 0,8 na referência (FR-003)

## Phase 4: US2 — Progressão por nível (P2)
- [ ] T009 `challenge-progression.ts` por nível + teste (inclui "não fecha o que estava aberto")
- [ ] T010 Chamadores (submissions, workspace) e menu agrupado por nível com motivo da trava

## Phase 5: Polish
- [ ] T011 Verificação no browser (conta nova: básico aberto, resolver 1 básico abre intermediário;
      carregar referências novas; servidor recusa nível travado)
- [ ] T012 Testes/tsc/build; docs (`product-context.md` §10, `CLAUDE.md`); spec → `Done`; PR
