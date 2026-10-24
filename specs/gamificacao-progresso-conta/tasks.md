# Tasks: M2.8 — Gamificação e progresso na conta

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/gamification-api.md,
content-draft.md (aprovado em 2026-10-23), quickstart.md (`specs/gamificacao-progresso-conta/`)

**Gate de migração**: o banco é um só (dev = Neon live). Nada é aplicado ao Neon antes de o autor
autorizar T006. Tudo que é puro (`lib/gamification/`) e o schema/migração gerada podem andar antes.

**Convenção de testes**: toda regra nova é função pura em `apps/web/src/lib/gamification/` com teste
em `apps/web/test/gamification/`. Rotas e páginas finas, verificadas no browser (convenção de M0.5).

## Phase 1: Setup

- [ ] T001 Confirmar a base: `pnpm -r test`, `pnpm -r exec tsc --noEmit` e `pnpm --filter web build`
      verdes na branch (baseline pra provar SC-005 — engine, narrador e `NARRATOR_PROMPT_VERSION`
      intocados)

## Phase 2: Foundational (bloqueia todas as user stories)

- [ ] T002 [P] `lib/gamification/levels.ts` + teste — `levelForXp(xp)` →
      `{ level, xpIntoLevel, xpForNextLevel }` com a curva de content-draft §2 (limiares 0, 100,
      300, 600, 1000…); casos: 0, 99, 100, 299, 300, 1000, XP negativo rejeitado
- [ ] T003 [P] `lib/gamification/design-validation.ts` + teste — `validateSubmittedDesign(unknown)`
      (research §3): forma, limites (60 nós / 150 arestas / réplicas 1–1000 / `cacheHitRate` 0–1),
      tipos do catálogo do engine, ids únicos, arestas/entradas para nós existentes, toda aresta em
      `isValidCanvasConnection` e toda entrada destino válido de `client`; um caso inválido por regra
      + os 3 `referenceSolution.design` do catálogo passando
- [ ] T004 Em `apps/web/src/db/schema.ts`: `userProfiles`, `scoringEvents` (único
      `(userId, eventKey)`), `activityDays` (PK `(userId, day)`), `submissionRateLimits` — todas com
      FK `userId → user.id` `onDelete: 'cascade'`; índice único em `userProfiles.nickname`
      (data-model.md)
- [ ] T005 `pnpm --filter web db:generate` → `db/migrations/0004_*.sql`; revisar o SQL gerado
      (restrições únicas, cascade) antes de commitar
- [ ] T006 ⚠️ **Só com autorização do autor**: `pnpm --filter web db:migrate` no Neon live
- [ ] T007 `lib/gamification-store.ts` (servidor, Drizzle) — `creditEvent` (`INSERT … ON CONFLICT DO
      NOTHING RETURNING`), `recordActivityDay`, `consumeSubmissionQuota` (upsert único da janela de 10/min),
      `loadProgress(userId)` (eventos + dias → derivados). Sem `transaction()` (neon-http não tem —
      research §2)

## Phase 3: US1 — XP verificado e persistido (P1) 🎯 MVP

**Goal**: resolver um desafio credita XP uma única vez, verificado pelo servidor, visível em qualquer
dispositivo. **Independent Test**: quickstart.md §US1.

- [ ] T008 [US1] `app/api/submissions/route.ts` — contrato `POST /api/submissions`: `auth()`, mesma
      origem, quota, `getProblem`, `validateSubmittedDesign`, `toWorkload(problem)`, custo de referência,
      `simulate` + `isProblemSolved`; se resolveu, `creditEvent('challenge:<id>', 100)`; registra o dia
      de atividade em **toda** submissão reexecutada (opção A); responde `{ solved, credited, progress }`
- [ ] T009 [US1] `app/api/progress/route.ts` — `GET` do próprio progresso (contrato)
- [ ] T010 [US1] Em `components/canvas/canvas.tsx`: "Submeter" continua mostrando o resultado local na
      hora e chama `POST /api/submissions` em paralelo; mostra o XP creditado só quando a rota confirma;
      erro/429 → aviso discreto "progresso não registrado", resultado intacto (FR-013)
- [ ] T011 [US1] Trava de desafios pelo servidor (gate 2): `challenge-topbar.tsx` e
      `canvas-workspace.tsx` leem `solvedProblemIds` de `GET /api/progress` (atualizado após cada
      submissão resolvida); `isChallengeUnlocked` inalterada; `stores/progression-store.ts` e a chave
      `sdp-challenge-progression` aposentados (remover a chave do `localStorage` ao carregar)
- [ ] T012 [US1] Verificação manual — quickstart.md §US1 (inclui payload forjado, design com aresta
      proibida → 400, duas submissões simultâneas → um crédito, 11ª submissão no minuto → 429)

## Phase 4: US2 — Painel de progresso (P2)

- [ ] T013 [US2] `app/app/progresso/page.tsx` (Server Component) — XP, nível, falta pro próximo,
      desafios resolvidos com data; estado inicial explícito (nível 1, 0 XP); link "Progresso" na
      topbar do canvas
- [ ] T014 [US2] Verificação manual — quickstart.md §US2

## Phase 5: US3 — Ofensiva (P3)

- [ ] T015 [P] [US3] `lib/gamification/streak.ts` + teste — `toLocalDay(date)` em
      `America/Sao_Paulo` via `Intl.DateTimeFormat`; `computeStreak(days, today)` → `{ current, best }`;
      casos: mesmo dia repetido, dias seguidos, dia pulado (zera, recorde preservado), ontem sem hoje
      (ainda vale), virada perto da meia-noite em SP, horário de verão (SC-006)
- [ ] T016 [US3] Ofensiva no painel (`/app/progresso`) e em `GET /api/progress`
- [ ] T017 [US3] Verificação manual — quickstart.md §US3

## Phase 6: US4 — Conquistas (P4)

- [ ] T018 [P] [US4] `lib/gamification/achievements.ts` + teste — as 5 conquistas de content-draft §6
      e `achievementsUnlockedBy(state)`; `no-spof` olha as violações do resultado **do servidor**;
      `all-challenges` compara com `ALL_PROBLEM_IDS`
- [ ] T019 [US4] Na rota de submissão: após creditar/registrar o dia, avaliar conquistas e
      `creditEvent('achievement:<id>', 0)` pras novas; `credited.achievements` na resposta
- [ ] T020 [US4] Conquistas no painel — desbloqueadas com data e bloqueadas com a condição
- [ ] T021 [US4] Verificação manual — quickstart.md §US4

## Phase 7: US5 — Ranking e perfil público (P5)

- [ ] T022 [P] [US5] `lib/gamification/nickname.ts` + teste — normaliza (minúsculas) e valida
      (3–20, `a–z0–9_`, começa com letra); casos de borda e caixa mista
- [ ] T023 [P] [US5] `lib/gamification/ranking.ts` + teste — XP desc → data do último evento com XP
      asc → apelido asc (content-draft §7); empates de cada nível
- [ ] T024 [P] [US5] `lib/gamification/public-profile.ts` + teste — monta só apelido, nível, XP,
      conquistas, desafios resolvidos e ofensiva; teste afirma que a saída nunca tem `email`, `name`,
      `image` nem `design`, mesmo recebendo um objeto com esses campos (SC-007)
- [ ] T025 [US5] `app/api/profile/route.ts` — `PUT` apelido/visibilidade (contrato); `409` vem da
      violação do índice único, nunca de checar-e-gravar
- [ ] T026 [US5] `app/app/ranking/page.tsx` — ranking (só apelido + `isPublic`), convite pra escolher
      apelido, formulário de apelido e "esconder meu perfil"; `robots: noindex`
- [ ] T027 [US5] `app/app/u/[apelido]/page.tsx` — perfil via serializador público; escondido ou
      inexistente → mesma página "perfil não encontrado"; `robots: noindex`
- [ ] T028 [US5] Verificação manual — quickstart.md §US5, conferindo também as respostas do servidor
      (sem e-mail/design), com duas contas de teste throwaway apagadas ao final

## Phase 8: Polish

- [ ] T029 `pnpm -r test`, `pnpm -r exec tsc --noEmit`, `pnpm --filter web build` limpos;
      `packages/engine`, `packages/narrator`, `/api/narrator` e `NARRATOR_PROMPT_VERSION` fora do diff
- [ ] T030 Atualizar `docs/product-context.md` §10 e `CLAUDE.md` (status real do M2.8); se o PR #8
      (M2.5) já tiver entrado, mesclar a `main` nesta branch antes do PR (as duas mexem no mesmo
      parágrafo do CLAUDE.md)
- [ ] T031 Promover `spec.md` a `Done` só depois da verificação manual de US1–US5

## Dependências

- T001 → Foundational → tudo. T002/T003 independentes entre si e do banco.
- T004 → T005 → T006 (autor) → T007 → rotas (T008, T009, T019, T025) e páginas.
- US1 é o MVP; US2 depende de T009; US3 de T007/T008; US4 de T008; US5 de T007 e dos módulos puros.
- Módulos puros (T002, T003, T015, T018, T022, T023, T024) podem ser escritos e testados antes do
  banco existir.

## Estratégia

**MVP = T001–T012**: XP verificado pelo servidor, idempotente, visível em qualquer dispositivo, com a
trava de desafios na mesma fonte. US2–US4 tornam o progresso legível; US5 (social) vem por último por
ser a que mais expõe dados.
