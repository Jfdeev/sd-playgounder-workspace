# Tasks: M2.6 — Fundamentos de arquitetura

**Input**: plan.md, research.md, data-model.md, quickstart.md (specs/fundamentos-arquitetura/)

**Gate antes de T004**: nenhuma task de conteúdo (T005, T006, T019-T021) começa antes do autor
revisar/aprovar o conteúdo proposto em research.md §2-§4 — mesmo tipo de gate que as fórmulas de
score tiveram em M2 (Constitution VI). Ver mensagem de fechamento do `/speckit-plan` no chat.

**Gate antes de T024 — resolvido (decisão do autor, 2026-09-26)**: o autor optou por desbloquear
US4 sem esperar o M2 chegar a `Done` — "implementar US4 agora mesmo assim", em resposta direta à
pergunta de fechamento desta fase. Consequência assumida: a verificação de 20 submissões consecutivas
de M2 (ainda pendente) vai precisar ser refeita contra o prompt novo (com o bloco de citação), não
contra o prompt de M2 original — `NARRATOR_PROMPT_VERSION` (T025) existe exatamente pra isso não
colidir silenciosamente com cache antigo.

## Phase 1: Setup

- [x] T001 Criar scaffold de `packages/knowledge/` (`package.json` nome `@sdp/knowledge`,
      `tsconfig.json`, `vitest.config.ts`) espelhando exatamente `packages/problems/`
- [x] T002 Adicionar `"@sdp/knowledge": "workspace:*"` em `apps/web/package.json` e
      `packages/problems/package.json` (`packages/narrator/package.json` fica pra quando US4 for
      desbloqueada — decisão do autor, 2026-09-26)
- [x] T003 Adicionar `"@sdp/knowledge"` em `transpilePackages` de `apps/web/next.config.ts`

## Phase 2: Foundational (bloqueia todas as user stories)

- [x] T004 Criar `packages/knowledge/src/source.ts` — `Source`, `CLEAN_ARCHITECTURE`,
      `FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE`, `PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE`
      (data-model.md §source.ts)
- [x] T005 [P] Criar `packages/knowledge/src/architecture-characteristic.ts` — tipos
      `ArchitectureCharacteristic`/`Tradeoff` + `ARCHITECTURE_CHARACTERISTICS` com as 7 fichas de
      research.md §2 (conteúdo aprovado pelo autor, 2026-09-26)
- [x] T006 [P] Criar `packages/knowledge/src/architecture-style.ts` — `TemplateId`,
      `ArchitectureStyle`, `ARCHITECTURE_STYLES` com as 4 fichas de research.md §3 (conteúdo
      aprovado pelo autor, 2026-09-26)
- [x] T007 Criar `packages/knowledge/src/index.ts` reexportando os 3 módulos acima
- [x] T008 [P] Escrever `packages/knowledge/test/architecture-characteristic.spec.ts` — as 7
      `Dimension` têm ficha; cada ficha tem >= 1 `tradeoff`; `tradeoff.against` nunca é a própria
      dimensão; `source` é uma referência a uma das 3 constantes de `source.ts` (identidade, não
      comparação de string)
- [x] T009 [P] Escrever `packages/knowledge/test/architecture-style.spec.ts` — os 4 `TemplateId`
      têm ficha; cada ficha tem >= 1 trade-off; `source` é uma das 3 constantes
- [x] T010 [P] Editar `apps/web/src/lib/canvas-templates.ts` — `ArchitectureTemplate.id: TemplateId`
      (import de `@sdp/knowledge`) em vez de `id: string`
- [x] T011 Escrever `apps/web/test/template-ids.spec.ts` — `Set` dos ids de
      `ARCHITECTURE_TEMPLATES` é exatamente igual ao `Set` das chaves de `ARCHITECTURE_STYLES`, sem
      duplicata em nenhum dos dois lados (prova a mão dupla que `Record<TemplateId,...>` sozinho não
      garante — research.md §1.2)

**Achado durante a implementação, fora do escopo original de tasks.md**: `@sdp/engine` não
exportava `ALL_DIMENSIONS` como valor (só o tipo `Dimension`) — `packages/problems/test/rubric.spec.ts`
hardcodava a lista de 7 dimensões por conta disso (comentário do gap corrigido no mesmo commit).
`packages/knowledge/test/architecture-characteristic.spec.ts` precisava da mesma lista; em vez de
hardcodar uma terceira vez, `packages/engine/src/index.ts` passou a reexportar `ALL_DIMENSIONS` de
`types.ts` (adição pura, sem lógica nova, sem violar Constitution II) — mudança de superfície
pública real, então `pnpm -r test` (não só `typecheck`) roda de novo sobre `engine`/`narrator`
antes do Polish (quickstart.md atualizado).

**Checkpoint**: `pnpm --filter knowledge test && pnpm --filter web test template-ids && pnpm -r exec tsc --noEmit` passam antes de abrir qualquer user story.

## Phase 3: US1 — Entender uma dimensão de score (P1) 🎯 MVP

**Goal**: usuário abre a ficha de qualquer dimensão a partir do `ScorePanel`.
**Independent Test**: quickstart.md §US1.

- [x] T012 [US1] Criar `apps/web/src/components/canvas/characteristic-sheet.tsx` — painel inline
      (mesmo padrão de `reference-solution-panel.tsx`, sem overlay/modal novo) que recebe uma
      `Dimension`, lê `ARCHITECTURE_CHARACTERISTICS[dimension]` de `@sdp/knowledge` e renderiza
      definição + fonte + trade-offs
- [x] T013 [US1] Editar `apps/web/src/components/canvas/score-panel.tsx` — botão "?" por linha de
      dimensão, abre `CharacteristicSheet` com a dimensão clicada (estado local, sem tocar no store)
- [x] T014 [US1] Verificação manual — confirmado no browser (2026-09-27), login via conta de teste
      throwaway criada e removida na mesma sessão (`m26-verificacao-qa@example.com`, apagada do
      banco ao final). Botão "?" na dimensão Segurança abre `CharacteristicSheet` com definição,
      fonte (*Fundamentals of Software Architecture*, Richards & Ford) e 2 trade-offs nomeados.

## Phase 4: US2 — Entender um estilo de arquitetura (P2)

**Goal**: usuário abre a ficha de qualquer template a partir do dropdown de Templates.
**Independent Test**: quickstart.md §US2.

- [x] T015 [US2] Criar `apps/web/src/components/canvas/style-sheet.tsx` — painel inline que recebe
      um `TemplateId`, lê `ARCHITECTURE_STYLES[templateId]` de `@sdp/knowledge` e renderiza quando
      usar + trade-offs + fonte (+ `furtherReading`, se presente)
- [x] T016 [US2] Editar `apps/web/src/components/canvas/challenge-topbar.tsx` — botão "?" por
      template no dropdown, abre `StyleSheet` com o template clicado (sem disparar `onApplyTemplate`)
- [x] T017 [US2] Verificação manual — confirmado no browser (2026-09-27): botão "?" no template
      Monolito (dropdown Templates) abre `StyleSheet` com quando usar, 3 trade-offs e a fonte exata.

## Phase 5: US3 — Receber uma dica sobre responsabilidade e acoplamento (P3)

**Goal**: pelo menos 1 hint por problema cita Clean Architecture com fonte.
**Independent Test**: quickstart.md §US3.

- [x] T018 [US3] Editar `packages/problems/src/types.ts` — `Hint.source?: Source` (import de
      `@sdp/knowledge`)
- [x] T019 [P] [US3] Editar `packages/problems/src/catalog/url-shortener.ts` — adicionar hint nova
      citando `CLEAN_ARCHITECTURE` (conteúdo de research.md §4.1, aprovado pelo autor)
- [x] T020 [P] [US3] Editar `packages/problems/src/catalog/social-feed.ts` — adicionar hint nova
      citando `CLEAN_ARCHITECTURE` (research.md §4.2, aprovado)
- [x] T021 [P] [US3] Editar `packages/problems/src/catalog/ecommerce-checkout.ts` — adicionar hint
      nova citando `CLEAN_ARCHITECTURE` (research.md §4.3, aprovado)
- [x] T022 [US3] Escrever `packages/problems/test/hints-source.spec.ts` — todo problema do catálogo
      tem >= 1 hint com `source` definido (prova positiva de FR-003, research.md §1.5); toda hint
      com `source` referencia uma das 3 constantes reais (nunca uma citação solta)
- [x] T023 [US3] Verificação manual — confirmado no browser (2026-09-27): dica "Por que separar
      Cache e Store em vez do App Server acessar tudo direto?" do problema "Encurtador de URL"
      revela texto citando *Clean Architecture* (Robert C. Martin).

**Checkpoint**: US1-US3 eram o incremento entregável sem tocar no narrador — o gate de US4 abaixo
foi resolvido pelo autor (desbloqueado) antes desta fase ser retomada.

## Phase 6: US4 — O narrador cita um princípio ao explicar (P4)

Gate resolvido — ver nota no topo deste arquivo ("Gate antes de T024 — resolvido").

**Goal**: narrador cita, quando relevante, uma ficha real com fonte — nunca inventa.
**Independent Test**: quickstart.md §US4.

- [x] T024 [US4] Editar `packages/narrator/src/schema.ts` — `citation_id` opcional em
      `EXPLAIN_RESULT_SCHEMA` (`SchemaType.STRING`, `enum` com todos os ids válidos de
      `@sdp/knowledge`); `parseNarratorExplanation` rejeita (`null`) qualquer `citation_id` fora do
      enum ou de tipo errado
- [x] T025 [US4] Editar `packages/narrator/src/prompt.ts` — `NARRATOR_PROMPT_VERSION = 2` +
      `selectRelevantKnowledge(result: SimulationResult)` (mapeia `violations[].type === 'spof'` →
      característica Disponibilidade, e `scores[dimension] < 40` → característica da própria
      dimensão; nunca lê `Design`/`Workload`); `buildNarratorPrompt` inclui o bloco de contexto só
      quando `selectRelevantKnowledge` retorna algo
- [x] T026 [US4] Editar `packages/narrator/src/design-hash.ts` — `hashDesign` ganha 3º parâmetro
      `promptVersion` (default `NARRATOR_PROMPT_VERSION`), incluído no material hasheado
- [x] T027 [US4] Escrever/estender testes em `packages/narrator/test/` — `selectRelevantKnowledge`
      confirma o mapeamento de violação/score (12 testes novos em `prompt.spec.ts`);
      `parseNarratorExplanation` rejeita `citation_id` fora do enum (`schema.spec.ts`); `hashDesign`
      com `promptVersion` diferente muda o hash pro mesmo design/workload (`design-hash.spec.ts`)
- [x] T028 [US4] Verificação manual — confirmado no browser (2026-09-27) com `GEMINI_API_KEY` real,
      contra um design saturado (SPOF real, Escalabilidade com score baixo): o narrador explicou a
      saturação corretamente e a UI mostrou "Princípio citado: Escalabilidade — fonte: Fundamentals
      of Software Architecture, Mark Richards & Neal Ford" (`citation_id` groundado corretamente
      contra `selectRelevantKnowledge(result)`). Achou 2 bugs reais no processo — ver seção abaixo.

**Trabalho adicional fora do tasks.md original, necessário para US4 ser genuinamente utilizável**:
- `apps/web/src/db/schema.ts` — coluna `citationId` (nullable) em `narratorExplanations`; migração
  `0003_regular_prowler.sql` **aplicada ao Neon live em 2026-09-27** (`pnpm --filter web db:migrate`,
  a pedido do autor).
- `apps/web/src/app/api/narrator/route.ts` — lê/grava `citation_id` no cache e na resposta; groundeia
  `citation_id` contra `selectRelevantKnowledge(result)` antes de aceitar (ver achado abaixo).
- `apps/web/src/components/canvas/narrator-panel.tsx` — resolve `citation_id` contra
  `ARCHITECTURE_CHARACTERISTICS`/`ARCHITECTURE_STYLES` e renderiza "Princípio citado" com a fonte
  atribuída (sem isso, US4 calcularia a citação no servidor mas nunca a mostraria ao usuário).

**Dois achados do advisor pós-implementação, corrigidos no mesmo lote**:
1. **Falso positivo de sandbox**: `calculateScores` retorna 0 pra `latencia`/`custo` quando não há
   `scoreContext` (sandbox/"Simular" fora de desafio) — 0 aí significa "sem orçamento de
   referência", nunca "ruim" (`packages/engine/src/scores/calculate.ts`). O gatilho por score baixo
   de `selectRelevantKnowledge` disparava essas duas fichas em TODO sandbox, mesmo sem problema
   real. `SimulationResult` não distingue as duas situações, então a correção foi excluir
   `latencia`/`custo` do gatilho por score (ficam fora só desse gatilho — o resto do prompt
   continua citando os números reais dessas dimensões normalmente). Perda aceita: em desafio, um
   score genuinamente baixo de latência/custo não dispara mais a ficha proativamente — a citação é
   um enriquecimento oportunista (FR-007), não obrigatório.
2. **Citação não groundada**: o `enum` do schema valida "é um dos 11 ids reais de
   `@sdp/knowledge`", mas não "é um dos ids que entraram no prompt desta chamada" — um estilo
   (nunca injetado, já que `selectRelevantKnowledge` retorna só `ArchitectureCharacteristic[]`, não
   o `Array<ArchitectureCharacteristic | ArchitectureStyle>` do data-model.md original) ou uma
   dimensão não selecionada passaria a validação mesmo sem o modelo ter visto aquela ficha —
   violando a garantia do edge case do spec ("nunca inventa uma citação que não viu"). Corrigido em
   `route.ts`: `citation_id` só é aceito se pertencer a `selectRelevantKnowledge(result)`; caso
   contrário é descartado (não rejeita a resposta inteira — só a citação solta).

**Dois achados da verificação manual no browser (2026-09-27, T028), ambos corrigidos**:
3. **`POST /api/narrator` 500-ava pra qualquer design saturado** — `TypeError: Cannot read
   properties of null (reading 'toFixed')` em `buildNarratorPrompt`. Causa raiz: `Infinity`
   (`PathResult.latency`, propagado de propósito quando um nó do caminho satura,
   `packages/engine/src/index.ts`) não sobrevive a `JSON.stringify`/`parse` — vira `null` no corpo
   que a rota recebe do client. **Pré-existente de M2, não introduzido por M2.6** — só nunca tinha
   sido exercitado contra um design saturado numa sessão de browser real antes. Corrigido em
   `packages/narrator/src/prompt.ts` (`formatLatencySummary`, commit `9956fcf`): latência não-finita
   vira `"saturado (fila infinita)"` na linha do prompt, em vez de derrubar a chamada.
4. **`NARRATOR_TIMEOUT_MS = 5_000` (route.ts, RNF-5 de M2) é curto demais pra `gemini-2.5-flash`
   com `responseSchema` na prática** — medido diretamente (chamada real, fora da app, mesmo schema
   de `EXPLAIN_RESULT_SCHEMA`): ~5.8s pra uma resposta completa. Isso bateu 504 (`"O narrador
   demorou demais pra responder"`) duas vezes seguidas na verificação manual, com a mesma chave e
   rede reais que a app usa — não parece ser um artefato só desta sessão. **Resolvido em
   2026-09-27** — decisão do autor: subir `NARRATOR_TIMEOUT_MS` pra `15_000`. Como isso é um NFR de
   M2 (spec diferente), RNF-5/SC-003 de `specs/avaliacao-biblioteca-m2/spec.md`, o Performance Goal
   de `plan.md`, `contracts/narrator-contract.md` e a tabela de NFRs de `docs/product-context.md`
   foram atualizados junto pro novo valor — nenhum documento continua descrevendo um limite de 5s
   que o código não respeita mais.

## Phase 7: Polish

- [x] T029 Rodar `pnpm -r exec tsc --noEmit` — todos os 5 pacotes (`engine`, `knowledge`, `narrator`,
      `problems`, `web`) sem erro
- [x] T030 Rodar `pnpm --filter web build` — build de produção limpo (`@sdp/narrator` continua fora
      de `transpilePackages` — build passou sem precisar adicioná-lo, gap pré-existente de M2, não
      deste marco)
- [x] T031 Atualizar `docs/product-context.md` §10 — seção M2.6 refletindo o que foi de fato
      implementado (código completo US1-US4; verificação manual e o re-teste das 20 submissões de
      M2 contra o prompt novo continuam pendentes)
- [x] T032 Atualizar `CLAUDE.md` "Plano ativo" — apontar pra `specs/fundamentos-arquitetura/`,
      status real (código completo, verificação manual pendente)

## Dependencies

- Setup (T001-T003) → Foundational (T004-T011) → todas as user stories
- US1 (T012-T014) e US2 (T015-T017) são independentes entre si — podem rodar em paralelo depois do
  Foundational
- US3 (T018-T023) só depende do Foundational (T004, T007 — `Source`/reexports), independente de
  US1/US2
- US4 (T024-T028) depende do Foundational — gate de governança resolvido pelo autor, implementada
  na sequência
- Polish (T029-T032) depende de todas as fases anteriores concluídas

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
US2/US3/US4 são incrementos pequenos, cada um independente dos outros dois.
