# Tasks: M4.1 — Designs na conta, histórico e compartilhamento

**Input**: spec.md, plan.md (gates decididos em 2026-10-25), research.md, data-model.md,
contracts/designs-api.md, quickstart.md

## Phase 1: Setup
- [ ] T001 Baseline verde: `pnpm -r test`, `tsc`, build

## Phase 2: Foundational (puro + banco)
- [ ] T002 [P] `lib/designs/saved-canvas.ts` + teste — `toSavedCanvas`/`fromSavedCanvas` (sem
      `result`/seleção), `contentHash` canonicalizado; ida e volta preserva o `Design` do engine (SC-005)
- [ ] T003 [P] `lib/designs/validate-saved-canvas.ts` + teste — validação do conteúdo vindo da API
      (canvas parcial ok; tipos, réplicas, taxa de acerto, posições, ids, arestas, matriz, limites)
- [ ] T004 [P] `lib/designs/return-path.ts` + teste — `safeReturnPath` (só `/app/...`; casos de bypass)
- [ ] T005 [P] `lib/designs/shared-view.ts` + teste — visão compartilhada sem e-mail/userId; apelido só
      se visível
- [ ] T006 `db/schema.ts` (`savedDesigns`, `designVersions`) + `db:generate` (revisar SQL) + aplicar ao
      Neon (autorizado) + `db/designs.ts` (versão via `INSERT … SELECT max+1` com retry na única; limites)

## Phase 3: US1 — Salvar (P1) 🎯 MVP
- [ ] T007 [US1] Rotas `GET/POST /api/designs`, `GET/PATCH/DELETE /api/designs/[id]`
- [ ] T008 [US1] `openDesignId` no canvas store; menu "Meus designs" (salvar como, salvar, lista, abrir no
      contexto certo, renomear, apagar)
- [ ] T009 [US1] Verificação manual — quickstart §US1

## Phase 4: US2 — Histórico (P2)
- [ ] T010 [US2] `POST /api/designs/[id]/versions` (sem duplicata); `GET ?version=N`
- [ ] T011 [US2] UI de histórico (lista de versões, restaurar)
- [ ] T012 [US2] Verificação manual — quickstart §US2

## Phase 5: US3 — Compartilhar (P3)
- [ ] T013 [US3] `POST/DELETE /api/designs/[id]/share`; `/entrar?voltar=` com `safeReturnPath`
- [ ] T014 [US3] `/app/d/[token]` — só leitura, Simular, abrir cópia, aviso de spoiler, apelido do dono
- [ ] T015 [US3] Verificação manual — quickstart §US3 (duas contas)

## Phase 6: Polish
- [ ] T016 Testes/tsc/build limpos; docs (`product-context.md` §10, `CLAUDE.md`); spec → `Done`
