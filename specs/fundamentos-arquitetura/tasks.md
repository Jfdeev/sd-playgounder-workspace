# Tasks: M2.6 — Fundamentos de arquitetura

**Input**: plan.md, research.md, data-model.md, quickstart.md (specs/fundamentos-arquitetura/)

**Gate antes de T004**: nenhuma task de conteúdo (T005, T006, T019-T021) começa antes do autor
revisar/aprovar o conteúdo proposto em research.md §2-§4 — mesmo tipo de gate que as fórmulas de
score tiveram em M2 (Constitution VI). Ver mensagem de fechamento do `/speckit-plan` no chat.

**Gate antes de T024**: nenhuma task de US4 (T024-T028) começa antes do autor decidir o
sequenciamento com M2 (plan.md, "Nota de governança") — esperar M2 fechar (`Done`) ou re-rodar a
verificação de 20 submissões de M2 contra o prompt novo depois de US4.

## Phase 1: Setup

- [ ] T001 Criar scaffold de `packages/knowledge/` (`package.json` nome `@sdp/knowledge`,
      `tsconfig.json`, `vitest.config.ts`) espelhando exatamente `packages/problems/`
- [ ] T002 Adicionar `"@sdp/knowledge": "workspace:*"` em `apps/web/package.json`,
      `packages/problems/package.json` e `packages/narrator/package.json`
- [ ] T003 Adicionar `"@sdp/knowledge"` em `transpilePackages` de `apps/web/next.config.ts`

## Phase 2: Foundational (bloqueia todas as user stories)

- [ ] T004 Criar `packages/knowledge/src/source.ts` — `Source`, `CLEAN_ARCHITECTURE`,
      `FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE`, `PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE`
      (data-model.md §source.ts)
- [ ] T005 [P] Criar `packages/knowledge/src/architecture-characteristic.ts` — tipos
      `ArchitectureCharacteristic`/`Tradeoff` + `ARCHITECTURE_CHARACTERISTICS` com as 7 fichas de
      research.md §2 (conteúdo aprovado pelo autor — ver gate acima)
- [ ] T006 [P] Criar `packages/knowledge/src/architecture-style.ts` — `TemplateId`,
      `ArchitectureStyle`, `ARCHITECTURE_STYLES` com as 4 fichas de research.md §3 (conteúdo
      aprovado pelo autor — ver gate acima)
- [ ] T007 Criar `packages/knowledge/src/index.ts` reexportando os 3 módulos acima
- [ ] T008 [P] Escrever `packages/knowledge/test/architecture-characteristic.spec.ts` — as 7
      `Dimension` têm ficha; cada ficha tem >= 1 `tradeoff`; `tradeoff.against` nunca é a própria
      dimensão; `source` é uma referência a uma das 3 constantes de `source.ts` (identidade, não
      comparação de string)
- [ ] T009 [P] Escrever `packages/knowledge/test/architecture-style.spec.ts` — os 4 `TemplateId`
      têm ficha; cada ficha tem >= 1 trade-off; `source` é uma das 3 constantes
- [ ] T010 [P] Editar `apps/web/src/lib/canvas-templates.ts` — `ArchitectureTemplate.id: TemplateId`
      (import de `@sdp/knowledge`) em vez de `id: string`
- [ ] T011 Escrever `apps/web/test/template-ids.spec.ts` — `Set` dos ids de
      `ARCHITECTURE_TEMPLATES` é exatamente igual ao `Set` das chaves de `ARCHITECTURE_STYLES`, sem
      duplicata em nenhum dos dois lados (prova a mão dupla que `Record<TemplateId,...>` sozinho não
      garante — research.md §1.2)

**Checkpoint**: `pnpm --filter knowledge test && pnpm --filter web test template-ids && pnpm -r exec tsc --noEmit` passam antes de abrir qualquer user story.

## Phase 3: US1 — Entender uma dimensão de score (P1) 🎯 MVP

**Goal**: usuário abre a ficha de qualquer dimensão a partir do `ScorePanel`.
**Independent Test**: quickstart.md §US1.

- [ ] T012 [US1] Criar `apps/web/src/components/canvas/characteristic-sheet.tsx` — modal/painel
      que recebe uma `Dimension`, lê `ARCHITECTURE_CHARACTERISTICS[dimension]` de `@sdp/knowledge` e
      renderiza definição + fonte + trade-offs
- [ ] T013 [US1] Editar `apps/web/src/components/canvas/score-panel.tsx` — botão "?" por linha de
      dimensão, abre `CharacteristicSheet` com a dimensão clicada (estado local, sem tocar no store)
- [ ] T014 [US1] Verificação manual — quickstart.md §US1 (todas as 7 dimensões abrem com conteúdo)

## Phase 4: US2 — Entender um estilo de arquitetura (P2)

**Goal**: usuário abre a ficha de qualquer template a partir do dropdown de Templates.
**Independent Test**: quickstart.md §US2.

- [ ] T015 [US2] Criar `apps/web/src/components/canvas/style-sheet.tsx` — modal/painel que recebe
      um `TemplateId`, lê `ARCHITECTURE_STYLES[templateId]` de `@sdp/knowledge` e renderiza quando
      usar + trade-offs + fonte (+ `furtherReading`, se presente)
- [ ] T016 [US2] Editar `apps/web/src/components/canvas/challenge-topbar.tsx` — botão "?" por
      template no dropdown, abre `StyleSheet` com o template clicado
- [ ] T017 [US2] Verificação manual — quickstart.md §US2 (todos os 4 templates abrem com conteúdo)

## Phase 5: US3 — Receber uma dica sobre responsabilidade e acoplamento (P3)

**Goal**: pelo menos 1 hint por problema cita Clean Architecture com fonte.
**Independent Test**: quickstart.md §US3.

- [ ] T018 [US3] Editar `packages/problems/src/types.ts` — `Hint.source?: Source` (import de
      `@sdp/knowledge`)
- [ ] T019 [P] [US3] Editar `packages/problems/src/catalog/url-shortener.ts` — adicionar hint nova
      citando `CLEAN_ARCHITECTURE` (conteúdo de research.md §4.1, aprovado pelo autor)
- [ ] T020 [P] [US3] Editar `packages/problems/src/catalog/social-feed.ts` — adicionar hint nova
      citando `CLEAN_ARCHITECTURE` (research.md §4.2, aprovado)
- [ ] T021 [P] [US3] Editar `packages/problems/src/catalog/ecommerce-checkout.ts` — adicionar hint
      nova citando `CLEAN_ARCHITECTURE` (research.md §4.3, aprovado)
- [ ] T022 [US3] Escrever `packages/problems/test/hints-source.spec.ts` — todo problema do catálogo
      tem >= 1 hint com `source` definido (prova positiva de FR-003, research.md §1.5); toda hint
      com `source` referencia uma das 3 constantes reais (nunca uma citação solta)
- [ ] T023 [US3] Verificação manual — quickstart.md §US3

**Checkpoint**: US1-US3 são o incremento entregável sem tocar no narrador — podem parar aqui até a decisão de governança de US4 (ver gate).

## Phase 6: US4 — O narrador cita um princípio ao explicar (P4)

⚠️ **NÃO INICIAR sem a decisão do autor sobre sequenciamento com M2** (plan.md "Nota de
governança"; mensagem enviada ao final do `/speckit-plan`).

**Goal**: narrador cita, quando relevante, uma ficha real com fonte — nunca inventa.
**Independent Test**: quickstart.md §US4.

- [ ] T024 [US4] Editar `packages/narrator/src/schema.ts` — `citation_id` opcional em
      `EXPLAIN_RESULT_SCHEMA` (`SchemaType.STRING`, `enum` com todos os ids válidos de
      `@sdp/knowledge`); `parseNarratorExplanation` rejeita (`null`) qualquer `citation_id` fora do
      enum ou de tipo errado
- [ ] T025 [US4] Editar `packages/narrator/src/prompt.ts` — `NARRATOR_PROMPT_VERSION` (nova
      constante) + `selectRelevantKnowledge(result: SimulationResult)` (mapeia
      `violations[].type` → característica relacionada, e `scores[dimension] < 40` → característica
      da dimensão; nunca lê `Design`/`Workload`); `buildNarratorPrompt` inclui o bloco de contexto
      só quando `selectRelevantKnowledge` retorna algo
- [ ] T026 [US4] Editar `packages/narrator/src/design-hash.ts` — `hashDesign` ganha 3º parâmetro
      `promptVersion` (default `NARRATOR_PROMPT_VERSION`), incluído no material hasheado
- [ ] T027 [US4] Escrever/estender testes em `packages/narrator/test/` — `selectRelevantKnowledge`
      nunca acessa `Design`/`Workload` (assinatura de tipo já garante, teste confirma o mapeamento
      de violação/score); `parseNarratorExplanation` rejeita `citation_id` fora do enum; `hashDesign`
      com `promptVersion` diferente muda o hash pro mesmo design/workload
- [ ] T028 [US4] Verificação manual — quickstart.md §US4 (precisa de `GEMINI_API_KEY` real, mesma
      limitação de M2)

## Phase 7: Polish

- [ ] T029 Rodar `pnpm -r exec tsc --noEmit` — todos os pacotes tocados (`knowledge`, `problems`,
      `narrator`, `web`) sem erro
- [ ] T030 Rodar `pnpm --filter web build` — build de produção limpo com `@sdp/knowledge` em
      `transpilePackages`
- [ ] T031 Atualizar `docs/product-context.md` §10 — seção M2.6 refletindo o que foi de fato
      implementado (US1-US3 sempre; US4 conforme a decisão de sequenciamento)
- [ ] T032 Atualizar `CLAUDE.md` "Plano ativo" — apontar pra `specs/fundamentos-arquitetura/`, status
      real (o mesmo cuidado de não declarar `Done` antes do critério de saída — aqui, antes das
      verificações manuais de quickstart.md serem feitas pelo autor)

## Dependencies

- Setup (T001-T003) → Foundational (T004-T011) → todas as user stories
- US1 (T012-T014) e US2 (T015-T017) são independentes entre si — podem rodar em paralelo depois do
  Foundational
- US3 (T018-T023) só depende do Foundational (T004, T007 — `Source`/reexports), independente de
  US1/US2
- US4 (T024-T028) depende do Foundational E é bloqueada pelo gate de governança — sempre a última
- Polish (T029-T032) depende de todas as fases anteriores concluídas (ou de US1-US3 concluídas, se
  US4 ficar pra depois)

## Parallel Example

```text
# Depois do Foundational, US1 e US2 em paralelo (arquivos diferentes):
T012, T013 (US1: characteristic-sheet.tsx, score-panel.tsx)
T015, T016 (US2: style-sheet.tsx, challenge-topbar.tsx)

# Dentro do Foundational, os 3 arquivos de conteúdo/teste independentes:
T005 (architecture-characteristic.ts) + T006 (architecture-style.ts) + T010 (canvas-templates.ts)
```

## Implementation Strategy

**MVP = US1 apenas** (T001-T014) — já cumpre a metade mais visível do critério de saída (SC-001).
US2/US3 são incrementos pequenos e independentes. US4 fica atrás do gate de governança e pode virar
um M2.6-b separado no tempo, sem bloquear o resto do marco.
