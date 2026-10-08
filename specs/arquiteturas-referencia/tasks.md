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

- [x] T001 Confirmar a base: `pnpm -r test` e `pnpm -r exec tsc --noEmit` verdes na branch antes de
      começar (baseline para provar FR-010 — engine/narrador/prompt v3 intocados)

## Phase 2: Foundational (bloqueia todas as user stories)

- [x] T002 Criar `packages/knowledge/src/reference-architectures.ts` — tipos `WebSource`,
      `PresetNode`, `PresetEdge`, `ReferenceArchitecture` (data-model.md), `REFERENCE_ARCHITECTURES`
      (lista vazia por ora), `getReferenceArchitecture(id)` e `toDesign(preset): Design`; reexportar
      em `packages/knowledge/src/index.ts`
- [x] T003 Em `packages/knowledge/src/reference-architectures.ts`, adicionar
      `validateReferenceArchitecture(preset): string[]` (pura; devolve a lista de violações dos 7
      invariantes de data-model.md: ids únicos, fontes existentes, explicação em todo nó, `basis` em
      toda aresta, `afirmada` ⇒ fonte, `inferida` ⇒ `note` e citada em `limitations`,
      `limitations` não vazio, `replicasIllustrative:false` ⇒ `replicasSourceId`, URL https e data
      ISO)
- [x] T004 [P] Escrever `packages/knowledge/test/reference-architectures.spec.ts` — (a) **fixtures
      inline inválidas**, uma por invariante, provando que `validateReferenceArchitecture` de fato
      acusa cada violação (senão o teste passa no vácuo); (b) `it.each(REFERENCE_ARCHITECTURES)`
      devolve `[]`; (c) `toDesign` descarta explicação/fonte/`basis` e preserva ids, tipos, réplicas,
      arestas e `entryNodeIds`
- [x] T005 [P] Escrever `apps/web/test/reference-architectures.spec.ts` — para cada preset: toda
      aresta passa em `isValidCanvasConnection` (usando o tipo do nó de origem/destino), e
      `simulate(toDesign(preset), workloadIlustrativa)` devolve **zero** violações (FR-002, SC-003;
      mesmo padrão de `canvas-templates.spec.ts`). Inclui uma fixture inválida (aresta proibida)
      provando que o teste acusa

## Phase 3: US1 — Carregar o preset de uma empresa (P1) 🎯 MVP

**Goal**: o usuário escolhe uma empresa e o design aparece no canvas, com resumo e fontes visíveis
antes de confirmar. **Independent Test**: quickstart.md §US1.

- [x] T006 [US1] ⚠️ **Só após a aprovação do autor.** Criar `packages/knowledge/src/presets/github.ts`
      com o conteúdo **literal** de `content-draft.md` (6 componentes, 6 conexões, fontes, resumo,
      limitações, réplicas ilustrativas) e registrá-lo em `REFERENCE_ARCHITECTURES`; T004/T005 passam
      a rodar sobre dado real
- [x] T007 [US1] Em `apps/web/src/stores/canvas-store.tsx`: campo `loadedPresetId: string | null`;
      `loadDesign(design, options?: { presetId?: string })` define o campo (e o limpa quando
      `options.presetId` não vem); `clearCanvas` também o limpa; verificar o `partialize` do zundo e do
      `persist` para que desfazer volte ao par (design, `loadedPresetId`) anterior e o campo sobreviva
      a um reload junto do design
- [x] T008 [P] [US1] Criar `apps/web/src/components/canvas/reference-architectures-menu.tsx` —
      dropdown "Arquiteturas" no padrão de Templates/Calculadora: lista os presets com resumo e as
      fontes (título, publicador, link externo `rel="noopener noreferrer"`); prop `disabled` com a dica
      "saia do desafio para explorar" (FR-009); `onSelect(presetId)`
- [x] T009 [US1] Em `apps/web/src/components/canvas/challenge-topbar.tsx`: montar o menu ao lado de
      Templates, passando `disabled={activeChallengeId !== null}` e `onSelect`
- [x] T010 [US1] Em `apps/web/src/components/canvas/canvas-workspace.tsx`: `handleLoadPreset(presetId)`
      — mesma confirmação destrutiva de `handleApplyTemplate`, depois
      `loadDesign(designToCanvas(toDesign(preset)), { presetId })`
- [x] T011 [US1] Verificação manual — quickstart.md §US1 (carregar, confirmação destrutiva, desfazer,
      Simular com as 7 dimensões, menu desabilitado dentro de um desafio). **Confirmado no browser (2026-10-07)**: carregar pede a confirmação destrutiva com o canvas
      não vazio; 6 nós + Cliente; desfazer volta ao design anterior e limpa `loadedPresetId`; Simular
      sem violação, com as 7 dimensões; dentro de um desafio o menu fica desabilitado e só mostra a dica

## Phase 4: US2 — Entender por que cada componente está ali (P2)

**Goal**: selecionar um nó de um preset mostra a explicação com a fonte.
**Independent Test**: quickstart.md §US2.

- [x] T012 [US2] Em `apps/web/src/components/canvas/config-panel.tsx` (painel do nó selecionado):
      quando `loadedPresetId` está definido e o id do nó existe no preset, mostrar "Por que está aqui"
      com `explanation.text` e as fontes resolvidas (título + publicador + link); nó adicionado pelo
      usuário (id fora do preset) não mostra nada
- [x] T013 [US2] Verificação manual — quickstart.md §US2 (todos os nós explicados; apagar/adicionar nó;
      rede desligada — as explicações continuam aparecendo). **Confirmado no browser (2026-10-07)**: os 6 nós explicados; apagar um nó leva só a explicação
      dele; um Cache adicionado não mostra explicação; após reload o preset e as explicações continuam
      (o texto é dado do bundle — sem rede)

## Phase 5: US3 — Saber o que é real e o que é ilustrativo (P3)

**Goal**: limitações e parâmetros ilustrativos visíveis, e o aviso acompanha a simulação.
**Independent Test**: quickstart.md §US3.

- [x] T014 [US3] Em `reference-architectures-menu.tsx`: seção "O que a simulação não modela" com
      `limitations` do preset, antes de confirmar o carregamento
- [x] T015 [US3] Em `config-panel.tsx`: rotular "réplicas ilustrativas" no nó do preset quando
      `replicasIllustrative` (e a fonte quando não for)
- [x] T016 [US3] Em `apps/web/src/components/canvas/result-panel.tsx`: quando `loadedPresetId` está
      definido, exibir o aviso "valores ilustrativos — não são os da empresa" junto do resultado
      (texto apenas; nunca agrega as 7 dimensões — Constitution V)
- [x] T017 [US3] Verificação manual — quickstart.md §US3 (limitações, aviso ao simular, aviso some ao
      carregar outro design ou apagar o canvas). **Confirmado no browser (2026-10-07)**: limitações e conexões inferidas antes de carregar;
      aviso no resultado (e na pill fechada); some ao apagar o canvas ou carregar outro design

## Phase 6: US4 — As outras empresas (P4)

Cada preset é um incremento **independente**, com o seu gate. Ordem sugerida pela solidez das fontes.

- [x] T018 [P] [US4] **Discord** — a fonte já foi lida (`research.md` §1). Conferir os números do
      cluster do ScyllaDB (só apareciam em resumo de terceiros), redigir `content-draft` do preset
      (monolito de API → data services → ScyllaDB; request coalescing e hash consistente em
      limitações) e **submeter ao autor** **Redigido e submetido (2026-10-07)**: `content-draft-discord.md`.
- [x] T019 [US4] Após aprovação: criar `packages/knowledge/src/presets/discord.ts` e registrar
- [x] T020 [P] [US4] **iFood** — **ler** as 4 fontes "abertas, não lidas"; se sustentarem os
      componentes, redigir e submeter ao autor; senão, registrar em `research.md` que o preset fica de
      fora **Redigido e submetido (2026-10-07)**: `content-draft-ifood-search.md`.
- [x] T021 [US4] Após aprovação: criar `packages/knowledge/src/presets/ifood.ts` e registrar
- [x] T022 [P] [US4] **Nubank** — **ler** `building.nubank.com/engineering-lessons-...`; mesmo critério
      (Medium e Datomic estão inacessíveis — não contam) **Redigido e submetido (2026-10-07)**: `content-draft-nubank-defense.md`.
- [x] T023 [US4] Após aprovação: criar `packages/knowledge/src/presets/nubank.ts` e registrar
- [x] T024 [P] [US4] **Netflix (fino)** — só o que Open Connect, Zuul, EVCache, Eureka e Priam
      afirmam (`research.md` §1); redigir e submeter ao autor **Redigido e submetido (2026-10-07)**: `content-draft-netflix.md`.
- [x] T025 [US4] Após aprovação: criar `packages/knowledge/src/presets/netflix.ts` e registrar
- [x] T026 [US4] Para cada preset registrado: `pnpm -r test` (T004/T005 rodam sobre ele
      automaticamente) e verificação manual do quickstart.md §US1–US3. **Confirmado no browser (2026-10-08)**: os 5 presets carregam pelo menu, todos os nós têm "Por
      que está aqui", Simular sem violação e sem nó saturado em 1.000 rps

## Phase 7: Polish

- [x] T027 `pnpm -r test`, `pnpm -r exec tsc --noEmit` e `pnpm --filter web build` limpos; confirmar
      que `packages/engine`, `packages/narrator`, `apps/web/src/app/api/narrator` e
      `NARRATOR_PROMPT_VERSION` não aparecem no diff (FR-010, SC-005)
- [x] T028 Atualizar `docs/product-context.md` §10 (status real do M2.5: quais presets entraram) e
      `CLAUDE.md` "Plano ativo"
- [x] T029 Promover `**Status**` de `spec.md` para `Done` **só** depois da verificação manual do
      critério de saída (≥ 1 preset carregável com todos os componentes explicados)

**Achados da verificação manual (2026-10-07)**:
- *Refazer* depois de desfazer o carregamento de um design não restaura o design — o mesmo acontece
  com Templates (testado na mesma branch, não na `main`); fica registrado como tarefa à parte. *Desfazer* funciona e volta ao par (design, `loadedPresetId`) anterior.
- Conteúdo: a limitação "As arestas e3, e4 e e6 são inferidas (ver tabela)" do rascunho virou "(ver as
  conexões inferidas)", porque o menu lista essas conexões (origem → destino + nota) logo abaixo; e os
  nós ganharam um rótulo curto (ex. "Monolito Rails") para o painel — único texto que não estava no
  rascunho.
- Login via conta de teste throwaway (`m25-verificacao-qa@example.com`), apagada do banco ao final.

**Achados da verificação dos 4 presets adicionais (2026-10-08)**:
- iFood e Nubank nasciam **saturados** na carga padrão do canvas livre (1.000 rps): o 3rd Party API do
  catálogo aguenta 100 rps por réplica, e as 2 réplicas ilustrativas davam ρ=1,67 (latência infinita) —
  o preset sugeria um gargalo da empresa que nenhuma fonte afirma. Réplicas ilustrativas ajustadas
  (enriquecimento do iFood e provedores do Nubank 2→6, ETL do Nubank 2→3) e teste novo em
  `apps/web/test/reference-architectures.spec.ts`: nenhum preset com nó saturado em 1.000 rps.
- Carregar um design com o painel de Simular já aberto não roda a simulação até mexer no slider (o
  efeito só reage a abrir o painel ou mudar o rps) — também acontece com Templates; fora do M2.5.
- Login via conta de teste throwaway (`m25b-verificacao-qa@example.com`), apagada do banco ao final.

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
