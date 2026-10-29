# Tasks: M4.2 — Biblioteca de 12 problemas

**Input**: [plan.md](plan.md), [spec.md](spec.md), [content-draft.md](content-draft.md) (aprovado)

## Phase 1: Setup
- [x] T001 Baseline verde: `pnpm -r test`, `tsc`, build

## Phase 2: Foundational
- [x] T002 `Problem.level` + `PROBLEM_LEVELS`; níveis dos 3 atuais
- [x] T003 [P] `rubric-criteria.ts` + teste; os 3 atuais passam a usar os construtores (sem mudar o que
      avaliam — testes de rubrica existentes continuam verdes)
- [x] T004 [P] Matriz de conexões: 5 conexões novas + teste

## Phase 3: US1 — 9 problemas (P1) 🎯 MVP
- [x] T005 Básico: Rate limiter, Leaderboard, Notificações
- [x] T006 Intermediário: Chat, Vídeo, Web crawler
- [x] T007 Avançado: Pix, Matching de corridas, Cliques em anúncios
- [x] T008 Testes: 4 por nível; ingênuo falha (SC-002); referência na matriz do canvas (FR-009);
      ρ ≤ 0,8 na referência (FR-003)

## Phase 4: US2 — Progressão por nível (P2)
- [x] T009 `challenge-progression.ts` por nível + teste (inclui "não fecha o que estava aberto")
- [x] T010 Chamadores (submissions, workspace) e menu agrupado por nível com motivo da trava

## Phase 5: Polish
- [x] T011 Verificação no browser (conta nova: básico aberto, resolver 1 básico abre intermediário;
      carregar referências novas; servidor recusa nível travado)
- [x] T012 Testes/tsc/build; docs (`product-context.md` §10, `CLAUDE.md`); spec → `Done`; PR

## Resultado (2026-10-29)

- 12 problemas, 4 por nível; as 12 referências passam a própria rubrica; as 9 novas ficam com ρ ≤ 0,8.
- Achados durante a implementação, todos levados ao autor antes de seguir:
  1. 7 arestas das referências eram proibidas pela matriz do canvas → matriz ampliada com 5 conexões e
     2 entradas ajustadas (spec, Clarifications 2026-10-28).
  2. 6 dos 9 problemas não tinham dica citando obra clássica, exigida pelo M2.6 → 6 dicas novas
     aprovadas.
  3. A referência antiga do Feed roda em ρ 0,93 → FR-003 (ρ ≤ 0,8) vale só para as 9 novas.
- Os placeholders "em breve" do menu Desafios saíram: dois deles (Real-time Chat, Video Platform) agora
  existem e o roadmap fecha a biblioteca em 12.
- Browser, conta descartável (apagada no fim): conta nova vê só o básico aberto, com o motivo da trava
  nos outros níveis; submeter o Chat pela API antes da hora → 403 `CHALLENGE_LOCKED`; Rate limiter
  resolvido pela UI (+100 XP) abre o intermediário inteiro; Web crawler resolvido abre o avançado;
  Pix, Cliques e Notificações (as 3 que usam conexões novas) carregados pela "solução de referência" e
  aceitos pelo servidor (que valida as arestas contra a matriz).
- Snapshot do engine: +9 entradas, nenhuma linha antiga mudou. 859 testes (engine 207, knowledge 66,
  narrator 34, problems 170, web 382), cobertura `apps/web/src/lib` 100% linhas, tsc e build limpos.
