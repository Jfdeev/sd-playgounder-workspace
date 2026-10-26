# Tasks: M4.1 — Designs na conta, histórico e compartilhamento

**Input**: spec.md, plan.md (gates decididos em 2026-10-25), research.md, data-model.md,
contracts/designs-api.md, quickstart.md

## Phase 1: Setup
- [x] T001 Baseline verde: `pnpm -r test`, `tsc`, build

## Phase 2: Foundational (puro + banco)
- [x] T002 [P] `lib/designs/saved-canvas.ts` + teste — `toSavedCanvas`/`fromSavedCanvas` (sem
      `result`/seleção), `contentHash` canonicalizado; ida e volta preserva o `Design` do engine (SC-005)
- [x] T003 [P] `lib/designs/validate-saved-canvas.ts` + teste — validação do conteúdo vindo da API
      (canvas parcial ok; tipos, réplicas, taxa de acerto, posições, ids, arestas, matriz, limites)
- [x] T004 [P] `lib/designs/return-path.ts` + teste — `safeReturnPath` (só `/app/...`; casos de bypass)
- [x] T005 [P] `lib/designs/shared-view.ts` + teste — visão compartilhada sem e-mail/userId; apelido só
      se visível
- [x] T006 `db/schema.ts` (`savedDesigns`, `designVersions`) + `db:generate` (revisar SQL) + aplicar ao
      Neon (autorizado) + `db/designs.ts` (versão via `INSERT … SELECT max+1` com retry na única; limites)

## Phase 3: US1 — Salvar (P1) 🎯 MVP
- [x] T007 [US1] Rotas `GET/POST /api/designs`, `GET/PATCH/DELETE /api/designs/[id]`
- [x] T008 [US1] `openDesignId` no canvas store; menu "Meus designs" (salvar como, salvar, lista, abrir no
      contexto certo, renomear, apagar)
- [x] T009 [US1] Verificação manual — quickstart §US1

## Phase 4: US2 — Histórico (P2)
- [x] T010 [US2] `POST /api/designs/[id]/versions` (sem duplicata); `GET ?version=N`
- [x] T011 [US2] UI de histórico (lista de versões, restaurar)
- [x] T012 [US2] Verificação manual — quickstart §US2

## Phase 5: US3 — Compartilhar (P3)
- [x] T013 [US3] `POST/DELETE /api/designs/[id]/share`; `/entrar?voltar=` com `safeReturnPath`
- [x] T014 [US3] `/app/d/[token]` — só leitura, Simular, abrir cópia, aviso de spoiler, apelido do dono
- [x] T015 [US3] Verificação manual — quickstart §US3 (duas contas)

## Phase 6: Polish
- [x] T016 Testes/tsc/build limpos; docs (`product-context.md` §10, `CLAUDE.md`); spec → `Done`

## Achados da verificação no browser (2026-10-25)

Três contas descartáveis (A dona, B e C visitantes), apagadas no fim. Tudo do quickstart passou depois
de 4 correções:

1. **`voltar` perdido no login** — o layout de `/app` redireciona sem sessão em paralelo com a página e
   ganhava a corrida com `/entrar` puro. Correção: `src/middleware.ts` repassa o caminho no header
   `x-sdp-pathname` e o layout monta `/entrar?voltar=...` (validado por `safeReturnPath` em `/entrar`).
2. **Vínculo com design de outra conta** — o rascunho do canvas é do navegador, não da conta; ao trocar
   de conta, `openDesign` apontava pro design da conta anterior. Correção: 404 ao abrir o menu ou ao
   salvar solta o vínculo (e pede "Salvar como…").
3. **Spoiler pro próprio dono** — o dono de um design de desafio ainda não resolvido via o aviso no
   próprio link. Correção: `loadSharedDesign` devolve `ownerId` (só usado no servidor) e o dono não vê o
   aviso.
4. **Lista desatualizada** — "· compartilhado" não aparecia/sumia depois de compartilhar/revogar; e
   "1 versões". Correção: recarrega a lista; singular.

Conferido: salvar/listar/abrir; v1→v2→v3, restaurar, "Nada mudou" sem versão nova; link só leitura +
Simular + abrir cópia (cópia solta, com confirmação); 404 em GET/DELETE/share de design alheio; página
sem e-mail do dono; login volta pro link; `voltar=//evil.com` → `/app`; revogar → "Design não
encontrado"; recompartilhar gera token novo. 337 testes web (cobertura `src/lib` 100/97.85), tsc e build
limpos.
