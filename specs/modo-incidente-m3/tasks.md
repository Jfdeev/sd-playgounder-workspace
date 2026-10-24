# Tasks: M3 — Modo Incidente

**Input**: spec.md, plan.md (gates 1–4 decididos em 2026-10-24), research.md, data-model.md,
contracts/incident-api.md, quickstart.md (`specs/modo-incidente-m3/`)

**Gate de conteúdo (T010)**: nenhum incidente vira código antes de o autor aprovar
`content-draft.md`. As regras puras (falhas, zonas, unicidade, critério do fix, serializador) não
dependem do conteúdo e vêm antes — são elas que permitem rodar as checagens em cada rascunho.

**Convenção**: regra nova = função pura com teste; rotas e UI finas, verificadas no browser.

## Phase 1: Setup

- [x] T001 Baseline: `pnpm -r test`, `pnpm -r exec tsc --noEmit`, `pnpm --filter web build` verdes;
      gravar um snapshot de `simulate()` de todo problema (referência), template e preset — base do SC-006

## Phase 2: Foundational

- [x] T002 [P] `packages/engine`: `DesignNode.capacityFactor?: number` (gate 3); capacidade ×
      fator; teste: ausente/1 ⇒ idêntico; 0.5 ⇒ metade da capacidade; fator inválido (≤ 0) vira violação
      estrutural sem lançar. Teste de não-regressão: o snapshot do T001 é idêntico (SC-006). Conferir que
      `canonicalizeDesign` (narrador) não muda o hash de designs sem o campo
- [x] T003 [P] `packages/problems/src/incidents/zones.ts` + teste — regra fixa de 3 zonas (rodízio):
      quantas réplicas um nó perde quando a zona `z` cai (`ceil(r/3)` pra zona 0, etc. — determinístico)
- [x] T004 `packages/problems/src/incidents/faults.ts` + teste — `Fault` (5 tipos) e
      `applyFault(design, fault)`: relativa; nó que fica com 0 réplicas é removido com suas arestas (e
      sai de `entryNodeIds`); nunca gera `replicas: 0`; não muta a entrada
- [x] T005 `apps/web/src/lib/incidents/snapshot.ts` + teste — serializador do estado "durante" (lista
      branca, gate 4) a partir do design **original** + resultado do engine sobre o design com falha;
      nó removido ⇒ `offeredLoad: 0`, status `no-traffic`; teste: sem `replicas`/`capacity`/
      `cacheHitRate`/design com falha na saída (SC-003)
- [x] T006 `packages/problems/src/incidents/uniqueness.ts` + teste — gera todo par (componente ×
      tipo, com parâmetros do próprio incidente) e devolve os pares cujo snapshot é igual ao do par
      plantado (gate 1); depende de um comparador de snapshot sobre os mesmos campos da lista branca
- [x] T007 `apps/web/src/lib/incidents/fix.ts` + teste — avalia o critério do fix com a falha
      aplicada ao design submetido: p99, saturação, throughput, alvo presente e alcançável, sem órfão
      novo; devolve as checagens que falharam (nomes fixos)
- [x] T008 `apps/web/src/lib/incidents/diagnosis.ts` + teste — `(nodeId, faultType)` × falha plantada
      → `correct | right-component | wrong`; tipo fora dos 5 rejeitado

**Refinamento da estrutura (2026-10-24)**: serializador do estado "durante" (`snapshot.ts`),
comparação do diagnóstico (`diagnosis.ts`) e critério do fix (`fix.ts`) ficaram em
`packages/problems/src/incidents/` junto das falhas — a busca de unicidade e os testes de cada
incidente usam as mesmas funções, sem cópia em `apps/web`. Duas regras de modelagem explícitas em
`diagnosis.ts`: zona caída aceita o tipo com qualquer componente (a causa é a zona); partição aceita
qualquer uma das duas pontas. `capacityFactor` só aceita (0, 1] — falha só tira capacidade. A busca já
mostrou um par ambíguo real (perder metade das instâncias × pool a 50% no mesmo nó, sem SPOF) — os
rascunhos precisam evitar isso.

## Phase 3: Conteúdo (gate 5)

- [ ] T009 Redigir os 5 incidentes (um por tipo de falha) em `content-draft.md`, gerados de dado que
      já passou, no scratchpad, em: sintoma presente no "durante" e ausente no "antes" (SC-002);
      unicidade (só o par plantado reproduz a tela — SC-001); fix de referência aceito; design original
      recusado; design sem o alvo recusado (SC-005); alerta descreve só o que o snapshot mostra
- [ ] T010 ⚠️ **Aprovação do autor** do `content-draft.md`
- [ ] T011 Criar `packages/problems/src/incidents/public.ts` e `secret.ts` com o conteúdo literal;
      teste por incidente rodando as mesmas checagens do T009 (viram regressão permanente)

## Phase 4: US1 — Abrir e investigar (P1) 🎯 MVP

- [ ] T012 [US1] `app/api/incidents/[id]/route.ts` — `GET`: snapshot "durante" + status do usuário
      (diagnosticado/resolvido); importa o módulo secreto só aqui (`server-only`)
- [ ] T013 [US1] UI: menu "Incidentes" na topbar (livres, sem trava); modo incidente no canvas com
      storage próprio (`sdp-canvas-incident-<id>`), painel com alerta e "antes × agora" por componente
      (o "antes" calculado no cliente sobre o design público)
- [ ] T014 [US1] Verificação manual — quickstart.md §US1, incluindo inspeção da resposta do servidor

## Phase 5: US2 — Diagnosticar (P2)

- [ ] T015 [US2] `app/api/incidents/[id]/diagnosis/route.ts` — quota, `diagnosis.ts`, registra
      `incident-diagnosis:<id>` (XP 0) no acerto e o dia de atividade em toda tentativa conferida
- [ ] T016 [US2] UI: escolher componente no canvas + tipo de falha; mostrar o veredito
- [ ] T017 [US2] Verificação manual — quickstart.md §US2

## Phase 6: US3 — Corrigir (P3)

- [ ] T018 [US3] `app/api/incidents/[id]/fix/route.ts` — 409 sem diagnóstico; `validateSubmittedDesign`;
      `fix.ts`; `incident:<id>` (100 XP) idempotente; dia de atividade
- [ ] T019 [US3] Ampliar a união de tipos de `scoringEvents.type` (`incident-diagnosis`, `incident`) e
      conferir que `buildProgress`, `all-challenges` e a trava de desafios seguem só com `challenge`
      (teste); painel de progresso lista incidentes resolvidos
- [ ] T020 [US3] UI: "Submeter fix" no modo incidente, com as checagens que falharam e o XP
- [ ] T021 [US3] Verificação manual — quickstart.md §US3 (fix antes do diagnóstico → 409; original e
      sem-o-alvo recusados; referência aceita; duas abas → um crédito)

## Phase 7: Polish

- [ ] T022 `pnpm -r test`, `tsc`, build limpos; snapshot SC-006 idêntico; `.next/static` sem a falha
      plantada (SC-003); narrador e `NARRATOR_PROMPT_VERSION` fora do diff
- [ ] T023 Atualizar `docs/product-context.md` §10 e `CLAUDE.md`; promover `spec.md` a `Done` depois da
      verificação manual

## Dependências

T001 → T002–T008 (T002/T003 paralelos; T004 depende de T002/T003; T006 de T004/T005) → T009 → T010
(autor) → T011 → US1 → US2 → US3 → Polish.
