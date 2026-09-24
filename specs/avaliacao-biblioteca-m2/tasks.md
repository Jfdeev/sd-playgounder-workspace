---
description: "Task list for M2 — Avaliação e biblioteca"
---

# Tasks: M2 — Avaliação e biblioteca

**Input**: Design documents from `specs/avaliacao-biblioteca-m2/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: incluídos — mesmo padrão de M0/M0.5/M1/M1.5 (`.specify/memory/constitution.md`, Fluxo de
Trabalho SDD): cobertura forte em módulos puros (`packages/engine`, `packages/problems`, `apps/web/src/lib/**`,
`packages/narrator`); wiring de UI/Route Handler/chamada real ao Gemini verificado por
`tsc`/build/checagem manual no browser, nunca por unit test contra a API real.

**Organização**: Setup → Foundational → US1 (P1) → US2 (P2) → US3 (P3) → US4 (P4) → Polish. As
fórmulas de score (`research.md` §1) já foram aprovadas pelo autor em 2026-09-23 — nenhum
checkpoint de pausa adicional (⏸️ PARAR) exigido pela spec deste marco; verificação de qualidade
(`tsc`/testes/build) a cada fase, como já é rotina.

## Formato: `[ID] [P?] [Story] Descrição`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência de tarefa incompleta)
- **[Story]**: a qual user story a tarefa pertence (US1/US2/US3/US4)

---

## Nota de design: por que `referenceSolution` é Foundational, não US3

`Problem.referenceSolution` é um campo **obrigatório** (data-model.md) — assim que o tipo muda,
`packages/problems` para de compilar até os 3 arquivos de catálogo existentes preencherem o campo.
Isso já é, na prática, uma dependência de compilação, não só de produto — por isso a AUTORIA da
solução de referência dos 3 problemas existentes entra em **Foundational** (T009-T013), não em
US3. O que sobra pra US3 (fase própria, T029-T032) é só a **UI pra visualizar** o que já foi
autorado — sem isso, US3 não seria "independentemente testável" (teria que reautorar o mesmo dado
duas vezes). Essa reorganização também resolve a dependência que a spec já sinalizava: a dimensão
de Custo de US1 (P1) precisa do custo da `referenceSolution` simulada — como a autoria vira
Foundational, US1 já pode calcular Custo desde o primeiro commit da fase, sem dividir a story em
duas entregas.

---

## Phase 1: Setup

- [X] T001 Adicionar `@google/generative-ai` (versão estável mais recente) às dependências de `apps/web/package.json` — trocado de `@anthropic-ai/sdk` (decisão original de D4) pra Google Gemini (`gemini-2.5-flash`), pedido do autor durante a implementação de US2, antes de qualquer código do narrador existir
- [X] T002 [P] Documentar `GEMINI_API_KEY` como variável server-only em `apps/web/.env.example` (criar o arquivo se não existir), seguindo o mesmo padrão de `RESEND_API_KEY` já documentado ali
- [X] T003 Rodar `pnpm install` na raiz do monorepo pra resolver a dependência nova

---

## Phase 2: Foundational (bloqueia todas as user stories)

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase estar completa e verde (`tsc` limpo nos
3 pacotes afetados).

### `availability` no catálogo (bloqueia US1 — dimensão Disponibilidade)

- [X] T004 Adicionar campo `availability: number` ao tipo `ComponentSpec` em `packages/engine/src/catalog/components.ts` (data-model.md)
- [X] T005 Preencher `availability` nas 44 entradas de `COMPONENT_CATALOG` em `packages/engine/src/catalog/components.ts` — valores ilustrativos plausíveis (0.99-0.999), maior pra componentes de borda/rede de alta capacidade (ex. `vpc`, `cdn`), menor pra bancos/filas (ex. `sql_primary`, `queue`), mesmo espírito "plausível e redondo" já documentado no cabeçalho do arquivo (research.md §1)
- [X] T006 Coverage pass: `COMPONENT_CATALOG` — teste que itera `ALL_COMPONENT_TYPES` (mesmo padrão de `packages/engine/test/catalog/components.spec.ts` já existente) e confirma que todo `availability` está no intervalo `(0, 1]`, fechando o `Record` exaustivo

### Fórmula de capacidade compartilhada (bloqueia US1 parcialmente via `toWorkload`, e US4 inteira)

- [X] T007 [P] Extrair `averageRps(dau, requestsPerUserPerDay)` e `peakRps(averageRps, peakMultiplier)` de `apps/web/src/lib/canvas-to-design.ts` para um módulo novo `apps/web/src/lib/capacity-formula.ts` (research.md §4)
- [X] T008 Atualizar `toWorkload()` em `apps/web/src/lib/canvas-to-design.ts` para usar as funções extraídas de `capacity-formula.ts`, sem duplicar a conta
- [X] T009 [P] Coverage pass: `capacity-formula.ts` — testes em `apps/web/test/capacity-formula.spec.ts` cobrindo os casos já testados indiretamente em `canvas-to-design.spec.ts` (garante que a extração não mudou o resultado — mesmos números de antes)

### `Problem.referenceSolution` (bloqueia US1 — dimensão Custo — e US3)

- [X] T010 Adicionar o campo `referenceSolution: { design: Design; reasoning: string }` (obrigatório) ao tipo `Problem` em `packages/problems/src/types.ts` (data-model.md)
- [X] T011 [P] Autorar `referenceSolution` do Encurtador de URL em `packages/problems/src/catalog/url-shortener.ts` — design completo que resolve 100% da rubrica na escala oficial do problema, mais texto de raciocínio
- [X] T012 [P] Autorar `referenceSolution` do Social Feed em `packages/problems/src/catalog/social-feed.ts`
- [X] T013 [P] Autorar `referenceSolution` do E-commerce Checkout em `packages/problems/src/catalog/ecommerce-checkout.ts`
- [X] T014 Teste em `packages/problems/test/reference-solution.spec.ts`: para cada um dos 3 problemas, rodar `simulate(referenceSolution.design, toWorkload(problem))` (via `@sdp/engine`) e confirmar `isProblemSolved(problem, result, referenceSolution.design)` verdadeiro (SC-005) — mesmo padrão de `bottleneck-scenario.spec.ts`
- [X] T014b (achado durante a implementação, fora do plano original) Adicionar `Problem.latencyBudgetMs` — `RubricCriterion.evaluate` é uma função opaca, não dava pra extrair o limiar numérico de latência de dentro dela pra alimentar a dimensão Latência de score; campo novo + teste de consistência contra o critério `latency-p99` em `packages/problems/test/catalog.spec.ts`

**Checkpoint**: `pnpm -r typecheck` limpo, `pnpm --filter engine test` e `pnpm --filter problems test` verdes antes de prosseguir.

---

## Phase 3: US1 — Ver a nota por dimensão depois de resolver um desafio (P1) 🎯 MVP

**Goal**: as 7 dimensões de `SimulationResult.scores` refletem o design de verdade, nunca mais
placeholder zerado; UI nunca as reduz a uma nota única.

**Independent Test**: resolver o Encurtador de URL com/sem Cache, confirmar que a dimensão de
Latência ou Custo muda de valor entre os dois designs (spec.md, US1).

- [X] T015 [US1] Criar `packages/engine/src/scores/calculate.ts` com `calculateScores(params)` (options object, não posicional — melhor que os 7 parâmetros originalmente sketchados aqui) implementando as 7 fórmulas aprovadas em `research.md` §1 (data-model.md)
- [X] T016 [US1] Em `packages/engine/src/index.ts`, remover `placeholderScores()` e chamar `calculateScores(...)` com os dados já calculados em `simulate()` — `latencyBudgetMs`/`referenceCostUsd` chegam via um 3º parâmetro opcional `scoreContext` de `simulate()` (ambos `| null`, `null` fora de um desafio)
- [X] T017 [US1] Em `apps/web/src/components/canvas/canvas.tsx`, extrair `latencyBudgetMs` (de `problem.latencyBudgetMs`, campo novo — não da rubrica, que é opaca) e `referenceCostUsd` (memoizado por `problem`, simulando `problem.referenceSolution.design` com `toWorkload(problem)` e lendo `cost.monthlyTotal`) antes de chamar `simulate()`, passando ambos como `null` no sandbox/sem desafio ativo
- [X] T018 [US1] [P] Criar `apps/web/src/components/canvas/score-panel.tsx` — exibe as 7 dimensões separadamente (barras + números 0-100), nunca uma soma/média/nota geral (Constitution V, FR-002); renderiza só quando `lastResult` existe, fecha por padrão (mesmo padrão de `result-panel.tsx`)
- [X] T019 [US1] Integrar `<ScorePanel>` em `apps/web/src/components/canvas/canvas.tsx`, ao lado de `<ResultPanel>`
- [X] T020 [US1] Testes de cenário em `packages/engine/test/scores/calculate.spec.ts`: cada uma das 7 dimensões varia com um design diferente; `latencyBudgetMs`/`referenceCostUsd` nulos → dimensões correspondentes retornam 0 (edge case do spec.md)
- [X] T021 [US1] Coverage pass: `calculate.ts` — para cada decision point das 7 fórmulas (clamps, o `if` de replication em Consistência, a soma condicional de Segurança, os `null` de Latência/Custo), confirmar que existe um teste que quebra se aquela linha for mutada; escrever os testes faltantes

**Checkpoint**: `pnpm --filter engine test` verde, `pnpm --filter web exec vitest run --exclude "**/password.spec.ts"` verde, `tsc` limpo, verificação manual no browser (US1 do quickstart.md).

---

## Phase 4: US2 — O narrador explica o resultado em linguagem natural (P2)

**Goal**: explicação em texto do resultado, fora do caminho crítico, cacheada por hash, nunca
contradiz `SimulationResult`.

**Independent Test**: submeter o mesmo design duas vezes, confirmar cache hit na segunda vez, sem
nova chamada ao provedor (spec.md, US2).

- [ ] T022 [US2] [P] Criar `packages/narrator/src/design-hash.ts` — `hashDesign(design, workload)` usando `crypto.subtle.digest` sobre a versão canonicalizada (nodes/edges ordenados por id, research.md §3)
- [ ] T023 [US2] [P] Criar `packages/narrator/src/schema.ts` — `responseSchema` estruturado do Gemini (contracts/narrator-contract.md §2), sem nenhum campo numérico
- [ ] T024 [US2] [P] Criar `packages/narrator/src/prompt.ts` — monta o prompt a partir só de `SimulationResult` (nunca de `Design`/`Workload` brutos, contracts/narrator-contract.md Regra 2)
- [ ] T025 [US2] Adicionar tabela `narratorExplanations` em `apps/web/src/db/schema.ts` (data-model.md) e gerar a migration com `pnpm --filter web db:generate`
- [ ] T026 [US2] Criar `apps/web/src/app/api/narrator/route.ts` — Route Handler seguindo `contracts/narrator-contract.md`: `auth()` direto na rota, hash → cache lookup → chamada Gemini (`responseSchema`, timeout RNF-5) → parse/validação contra o schema → persiste → devolve; nunca devolve 200 com corpo inventado em caso de erro
- [ ] T027 [US2] [P] Criar `apps/web/src/components/canvas/narrator-panel.tsx` — busca a explicação via `POST /api/narrator`, estado de loading/erro próprio, nunca bloqueia `<ResultPanel>`/`<ScorePanel>` (FR-010)
- [ ] T028 [US2] Integrar `<NarratorPanel>` em `apps/web/src/components/canvas/canvas.tsx`
- [ ] T029 [US2] Testes em `packages/narrator/test/`: `design-hash.spec.ts` (mesmo design em ordem diferente de nodes/edges → mesmo hash; designs diferentes → hashes diferentes), `schema.spec.ts` (schema não aceita campo numérico), `prompt.spec.ts` (prompt gerado nunca inclui campos fora de `SimulationResult`) — sem chamada real à API
- [ ] T030 [US2] Testes em `apps/web/test/` pro Route Handler: mockar o SDK do Gemini (`@google/generative-ai`) — cache hit não chama o mock; cache miss chama e persiste; resposta fora do schema → `INVALID_RESPONSE`; timeout simulado → `TIMEOUT`, nunca 200 inventado
- [ ] T031 [US2] Coverage pass: `design-hash.ts`, `schema.ts`, Route Handler — decision points (cache hit/miss, validação de schema, branches de erro) cobertos; escrever os testes faltantes

**Checkpoint**: `pnpm --filter narrator test`, `pnpm --filter web exec vitest run --exclude "**/password.spec.ts"` verdes, `tsc` limpo, verificação manual no browser (US2 do quickstart.md, incluindo o cache hit via Network tab).

---

## Phase 5: US3 — Ver a solução de referência de um problema (P3)

**Goal**: UI pra visualizar a `referenceSolution` já autorada em Foundational (T011-T013).

**Independent Test**: abrir a referência do Encurtador de URL, confirmar design carregável +
raciocínio associado a pelo menos uma decisão de capacidade (spec.md, US3).

- [ ] T032 [US3] Criar `apps/web/src/components/canvas/reference-solution-panel.tsx` — mostra `problem.referenceSolution.reasoning` e um botão pra carregar `problem.referenceSolution.design` no canvas (mesma ação destrutiva de `loadDesign`, mesmo tratamento de confirmação de `handleApplyTemplate` em `canvas-workspace.tsx`)
- [ ] T033 [US3] Adicionar o botão de abrir a solução de referência em `apps/web/src/components/canvas/challenge-card.tsx`, ao lado do botão de sair do desafio
- [ ] T034 [US3] Verificação manual no browser (US3 do quickstart.md) — sem teste automatizado novo: o dado já foi validado em T014 (Foundational), esta fase só adiciona wiring de UI

**Checkpoint**: `tsc` limpo, `pnpm --filter web exec vitest run --exclude "**/password.spec.ts"` verde (sem regressão), verificação manual no browser.

---

## Phase 6: US4 — Estimar capacidade sem montar um design (P4)

**Goal**: calculadora independente, reusando `capacity-formula.ts` (Foundational).

**Independent Test**: informar a escala do Encurtador de URL na calculadora, confirmar que bate com
`toWorkload()` pro mesmo problema (spec.md, US4).

- [ ] T035 [US4] Criar `apps/web/src/components/canvas/capacity-calculator-panel.tsx` — inputs de DAU/requisições por usuário/dia/pico, usa `averageRps`/`peakRps` de `capacity-formula.ts` (T007), sempre acessível independente de desafio ativo
- [ ] T036 [US4] Adicionar botão "Calculadora" em `apps/web/src/components/canvas/challenge-topbar.tsx`, ao lado de Desafios/Templates
- [ ] T037 [US4] Teste em `apps/web/test/capacity-calculator-panel.spec.ts` (se houver lógica além de UI pura — caso contrário, cobertura já herdada de T009) ou verificação manual, conforme o que a implementação de T035 revelar

**Checkpoint**: `tsc` limpo, `pnpm --filter web exec vitest run --exclude "**/password.spec.ts"` verde, verificação manual no browser (US4 do quickstart.md).

---

## Phase 7: Polish

- [ ] T038 `pnpm -r typecheck` limpo nos 4 pacotes (engine, problems, narrator, web)
- [ ] T039 `pnpm --filter web build` limpo
- [ ] T040 Atualizar `docs/product-context.md` §10 — marcar M2 como concluído, com link pra `specs/avaliacao-biblioteca-m2/spec.md`, mesmo padrão já usado pra M1/M1.5
- [ ] T041 Promover `**Status**` de `specs/avaliacao-biblioteca-m2/spec.md` para `Done`

---

## Dependencies

```
Setup (T001-T003)
  ↓
Foundational (T004-T014) — bloqueia tudo abaixo
  ↓
US1 (T015-T021, P1) ──┐
US2 (T022-T031, P2)   ├─ independentes entre si depois de Foundational
US3 (T032-T034, P3)   │  (US3 só precisa do dado já autorado em T011-T013)
US4 (T035-T037, P4) ──┘
  ↓
Polish (T038-T041)
```

## Parallel execution examples

- Dentro de Foundational: T005 (preencher `availability`) e T007-T009 (fórmula de capacidade) e
  T011-T013 (autorar as 3 referências) podem rodar em paralelo — arquivos diferentes, nenhum
  depende do outro.
- Depois de Foundational: US1, US2 e US4 podem ser implementadas em paralelo por serem
  independentes uma da outra (US3 também, mas é pequena o bastante pra não valer a pena separar).

## Implementation strategy

**MVP** = Setup + Foundational + US1 — já entrega o score por dimensão (o requisito mais citado
no critério de saída indireto do marco, já que o narrador de US2 depende dele existir pra ter o que
narrar). US2 é o diferencial de produto mais visível, mas tecnicamente independente de US3/US4 —
pode seguir em paralelo ou logo depois. US3/US4 são as menores e podem ser adiadas sem bloquear
nada, inclusive entregues depois de M2 "fechado" se o tempo apertar.
