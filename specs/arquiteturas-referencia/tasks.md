# Tasks: M2.5 — Arquiteturas de referência

**Input**: spec.md, plan.md, research.md, data-model.md, quickstart.md, content-draft.md
(`specs/arquiteturas-referencia/`)

**Gate antes de T006**: nenhum conteúdo de preset vira código antes de o autor revisar/aprovar
`content-draft.md` (preset do GitHub) — FR-008, mesmo gate de M2 (fórmulas), M2.6 e M2.7. Tudo o que
vem antes de T006 (tipos, validação, testes, store) **não** depende do conteúdo e pode andar.

**Gate por preset adicional (T018–T026)**: cada um começa **lendo** as fontes marcadas "aberta, não
lida" em `research.md` §1 e tem o seu próprio gate de aprovação. Preset cujas fontes não sustentem
os componentes fica de fora (US4 cenário 2).

## Phase 1: Setup

Nenhuma dependência nova, nenhuma migração, nenhuma rota — nada a instalar.

- [ ] T001 Confirmar a base: `pnpm -r test` e `pnpm -r exec tsc --noEmit` verdes na branch antes de
      começar (baseline para provar FR-010 — engine/narrador/prompt v3 intocados)

## Phase 2: Foundational (bloqueia todas as user stories)

- [ ] T002 Criar `packages/knowledge/src/reference-architectures.ts` — tipos `WebSource`,
      `PresetNode`, `PresetEdge`, `ReferenceArchitecture` (data-model.md), `REFERENCE_ARCHITECTURES`
      (lista vazia por ora), `getReferenceArchitecture(id)` e `toDesign(preset): Design`; reexportar
      em `packages/knowledge/src/index.ts`
- [ ] T003 Em `packages/knowledge/src/reference-architectures.ts`, adicionar
      `validateReferenceArchitecture(preset): string[]` (pura; devolve a lista de violações dos 7
      invariantes de data-model.md: ids únicos, fontes existentes, explicação em todo nó, `basis` em
      toda aresta, `afirmada` ⇒ fonte, `inferida` ⇒ `note` e citada em `limitations`,
      `limitations` não vazio, `replicasIllustrative:false` ⇒ `replicasSourceId`, URL https e data
      ISO)
- [ ] T004 [P] Escrever `packages/knowledge/test/reference-architectures.spec.ts` — (a) **fixtures
      inline inválidas**, uma por invariante, provando que `validateReferenceArchitecture` de fato
      acusa cada violação (senão o teste passa no vácuo); (b) `it.each(REFERENCE_ARCHITECTURES)`
      devolve `[]`; (c) `toDesign` descarta explicação/fonte/`basis` e preserva ids, tipos, réplicas,
      arestas e `entryNodeIds`
- [ ] T005 [P] Escrever `apps/web/test/reference-architectures.spec.ts` — para cada preset: toda
      aresta passa em `isValidCanvasConnection` (usando o tipo do nó de origem/destino), e
      `simulate(toDesign(preset), workloadIlustrativa)` devolve **zero** violações (FR-002, SC-003;
      mesmo padrão de `canvas-templates.spec.ts`). Inclui uma fixture inválida (aresta proibida)
      provando que o teste acusa

## Phase 3: US1 — Carregar o preset de uma empresa (P1) 🎯 MVP

**Goal**: o usuário escolhe uma empresa e o design aparece no canvas, com resumo e fontes visíveis
antes de confirmar. **Independent Test**: quickstart.md §US1.

- [ ] T006 [US1] ⚠️ **Só após a aprovação do autor.** Criar `packages/knowledge/src/presets/github.ts`
      com o conteúdo **literal** de `content-draft.md` (6 componentes, 6 conexões, fontes, resumo,
      limitações, réplicas ilustrativas) e registrá-lo em `REFERENCE_ARCHITECTURES`; T004/T005 passam
      a rodar sobre dado real
- [ ] T007 [US1] Em `apps/web/src/stores/canvas-store.tsx`: campo `loadedPresetId: string | null`;
      `loadDesign(design, options?: { presetId?: string })` define o campo (e o limpa quando
      `options.presetId` não vem); `clearCanvas` também o limpa; verificar o `partialize` do zundo e do
      `persist` para que desfazer volte ao par (design, `loadedPresetId`) anterior e o campo sobreviva
      a um reload junto do design
- [ ] T008 [P] [US1] Criar `apps/web/src/components/canvas/reference-architectures-menu.tsx` —
      dropdown "Arquiteturas" no padrão de Templates/Calculadora: lista os presets com resumo e as
      fontes (título, publicador, link externo `rel="noopener noreferrer"`); prop `disabled` com a dica
      "saia do desafio para explorar" (FR-009); `onSelect(presetId)`
- [ ] T009 [US1] Em `apps/web/src/components/canvas/challenge-topbar.tsx`: montar o menu ao lado de
      Templates, passando `disabled={activeChallengeId !== null}` e `onSelect`
- [ ] T010 [US1] Em `apps/web/src/components/canvas/canvas-workspace.tsx`: `handleLoadPreset(presetId)`
      — mesma confirmação destrutiva de `handleApplyTemplate`, depois
      `loadDesign(designToCanvas(toDesign(preset)), { presetId })`
- [ ] T011 [US1] Verificação manual — quickstart.md §US1 (carregar, confirmação destrutiva, desfazer,
      Simular com as 7 dimensões, menu desabilitado dentro de um desafio)

## Phase 4: US2 — Entender por que cada componente está ali (P2)

**Goal**: selecionar um nó de um preset mostra a explicação com a fonte.
**Independent Test**: quickstart.md §US2.

- [ ] T012 [US2] Em `apps/web/src/components/canvas/config-panel.tsx` (painel do nó selecionado):
      quando `loadedPresetId` está definido e o id do nó existe no preset, mostrar "Por que está aqui"
      com `explanation.text` e as fontes resolvidas (título + publicador + link); nó adicionado pelo
      usuário (id fora do preset) não mostra nada
- [ ] T013 [US2] Verificação manual — quickstart.md §US2 (todos os nós explicados; apagar/adicionar nó;
      rede desligada — as explicações continuam aparecendo)

## Phase 5: US3 — Saber o que é real e o que é ilustrativo (P3)

**Goal**: limitações e parâmetros ilustrativos visíveis, e o aviso acompanha a simulação.
**Independent Test**: quickstart.md §US3.

- [ ] T014 [US3] Em `reference-architectures-menu.tsx`: seção "O que a simulação não modela" com
      `limitations` do preset, antes de confirmar o carregamento
- [ ] T015 [US3] Em `config-panel.tsx`: rotular "réplicas ilustrativas" no nó do preset quando
      `replicasIllustrative` (e a fonte quando não for)
- [ ] T016 [US3] Em `apps/web/src/components/canvas/result-panel.tsx`: quando `loadedPresetId` está
      definido, exibir o aviso "valores ilustrativos — não são os da empresa" junto do resultado
      (texto apenas; nunca agrega as 7 dimensões — Constitution V)
- [ ] T017 [US3] Verificação manual — quickstart.md §US3 (limitações, aviso ao simular, aviso some ao
      carregar outro design ou apagar o canvas)

## Phase 6: US4 — As outras empresas (P4)

Cada preset é um incremento **independente**, com o seu gate. Ordem sugerida pela solidez das fontes.

- [ ] T018 [P] [US4] **Discord** — a fonte já foi lida (`research.md` §1). Conferir os números do
      cluster do ScyllaDB (só apareciam em resumo de terceiros), redigir `content-draft` do preset
      (monolito de API → data services → ScyllaDB; request coalescing e hash consistente em
      limitações) e **submeter ao autor**
- [ ] T019 [US4] Após aprovação: criar `packages/knowledge/src/presets/discord.ts` e registrar
- [ ] T020 [P] [US4] **iFood** — **ler** as 4 fontes "abertas, não lidas"; se sustentarem os
      componentes, redigir e submeter ao autor; senão, registrar em `research.md` que o preset fica de
      fora
- [ ] T021 [US4] Após aprovação: criar `packages/knowledge/src/presets/ifood.ts` e registrar
- [ ] T022 [P] [US4] **Nubank** — **ler** `building.nubank.com/engineering-lessons-...`; mesmo critério
      (Medium e Datomic estão inacessíveis — não contam)
- [ ] T023 [US4] Após aprovação: criar `packages/knowledge/src/presets/nubank.ts` e registrar
- [ ] T024 [P] [US4] **Netflix (fino)** — só o que Open Connect, Zuul, EVCache, Eureka e Priam
      afirmam (`research.md` §1); redigir e submeter ao autor
- [ ] T025 [US4] Após aprovação: criar `packages/knowledge/src/presets/netflix.ts` e registrar
- [ ] T026 [US4] Para cada preset registrado: `pnpm -r test` (T004/T005 rodam sobre ele
      automaticamente) e verificação manual do quickstart.md §US1–US3

## Phase 7: Polish

- [ ] T027 `pnpm -r test`, `pnpm -r exec tsc --noEmit` e `pnpm --filter web build` limpos; confirmar
      que `packages/engine`, `packages/narrator`, `apps/web/src/app/api/narrator` e
      `NARRATOR_PROMPT_VERSION` não aparecem no diff (FR-010, SC-005)
- [ ] T028 Atualizar `docs/product-context.md` §10 (status real do M2.5: quais presets entraram) e
      `CLAUDE.md` "Plano ativo"
- [ ] T029 Promover `**Status**` de `spec.md` para `Done` **só** depois da verificação manual do
      critério de saída (≥ 1 preset carregável com todos os componentes explicados)

## Dependências

- T001 → Foundational (T002–T005) → tudo
- T002 → T003 → T004; T005 depende de T002 (e de T006 para rodar sobre dado real)
- **T006 depende do gate de conteúdo do GitHub**; US1–US3 dependem de T006 para ter o que exibir, mas
  T007–T010 (store, menu, wiring) podem ser escritos antes, com um preset de fixture em desenvolvimento
  — a fixture **não** é commitada
- US2 e US3 dependem de T007; independentes entre si
- US4: cada par (redigir/submeter → criar) é independente dos demais

## Exemplo paralelo

```text
Depois do T002:  T004 (knowledge/test) + T005 (web/test) + T007 (store) + T008 (menu)  — arquivos distintos
Preset adicional: T018, T020, T022, T024 podem ser pesquisados/redigidos em paralelo; a aprovação é
sequencial pelo autor
```

## Estratégia

**MVP = T001–T011** (GitHub carregável, com fontes visíveis). T012–T017 completam o critério de saída
(explicações + honestidade). US4 amplia o catálogo sem bloquear nada — o marco já cumpre o critério com
um preset. O Netflix é o preset mais arriscado: só entra se as fontes alcançáveis bastarem.
