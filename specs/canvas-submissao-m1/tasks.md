# Tasks: M1 — Canvas e submissão

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/canvas-engine-boundary.md](contracts/canvas-engine-boundary.md), [quickstart.md](quickstart.md)

**Tests**: incluídas para os dois módulos de lógica pura (`packages/problems` catálogo,
`apps/web/src/lib/canvas-to-design.ts`) — escopo de cobertura decidido em research.md §8 (mesmo
padrão de M0/M0.5: não perseguir cobertura de componentes React/interação do React Flow, que é
verificada manualmente via quickstart.md).

**Organização**: por user story (US1 P1, US2 P2, US3 P3, conforme spec.md). Setup → Foundational →
US1 → US2 → US3 → Polish. US1 é o loop de valor completo e, sozinha, já cumpre o critério de saída
do marco (spec.md, Success Criteria) — US2/US3 são incrementos de qualidade sobre ela, cada um
independentemente testável por cima do que já existe.

## Phase 1: Setup

- [X] T001 Instalar dependências novas em `apps/web`: `@xyflow/react` `^12.11.3`, `zustand` `^5`,
      `immer`, `zundo` `^2.3.0` (`pnpm --filter web add @xyflow/react zustand immer zundo`,
      research.md §2/§3)
- [X] T002 [P] Criar `packages/problems/package.json` — `@sdp/problems`, `workspace:*`, sem build
      step (`main`/`types` apontando para `src/index.ts`, mesmo padrão de
      `packages/engine/package.json`); devDependencies: `vitest`, `@vitest/coverage-v8`,
      `typescript`, `@types/node`
- [X] T003 [P] Criar `packages/problems/tsconfig.json` — mesmo strict mode de
      `packages/engine/tsconfig.json`
- [X] T004 [P] Criar `packages/problems/vitest.config.ts` — mesmo padrão de
      `packages/engine/vitest.config.ts`
- [X] T005 [P] Adicionar `"@sdp/problems": "workspace:*"` em `apps/web/package.json`
      (`dependencies`)
- [X] T006 Rodar `pnpm install` na raiz do monorepo — linka `@sdp/problems` em
      `apps/web/node_modules/@sdp/problems` (mesmo padrão confirmado nesta sessão para
      `@sdp/engine`). `next.config.ts`: `@sdp/problems` adicionado a `transpilePackages`.

**Checkpoint**: `pnpm install` limpo; `pnpm --filter web typecheck` e `pnpm --filter problems
typecheck` rodam sem erro (pacotes ainda vazios). `next.config.ts` (`transpilePackages` +
`webpack.resolve.extensionAlias`) já está pronto de uma sessão anterior a este `/speckit-tasks` —
nenhuma task nova necessária para isso.

## Phase 2: Foundational (bloqueia todas as user stories)

- [X] T007 [P] Criar `packages/problems/src/types.ts` — tipo `Problem` (data-model.md)
- [X] T008 Criar `packages/problems/src/catalog/url-shortener.ts` — problema "Encurtador de URL"
      completo (enunciado, requisitos funcionais, requisitos não-funcionais, escala). Ler
      `docs/foundational-doc.md` §2.1 (partes 1/3/4/5 — não as partes 2/6/7, que são M2) e §2.2
      (linha "Encurtador de URL — Hashing, cache read-heavy, geração de ID") **integralmente antes
      de escrever**, não parafrasear de memória — mesmo princípio de T012 de M0.5, texto vai ao ar
      como conteúdo real do produto
- [X] T009 Criar `packages/problems/src/index.ts` — `getProblem(id): Problem | undefined`,
      `ALL_PROBLEM_IDS: readonly string[]` (contracts/canvas-engine-boundary.md)
- [X] T010 [P] Escrever `packages/problems/test/catalog.spec.ts` — `getProblem` retorna o registro
      certo para `"url-shortener"`; retorna `undefined` para id inexistente; `scale`/FRs/NFRs
      presentes e não-vazios; `ALL_PROBLEM_IDS` contém exatamente 1 item
- [X] T011 Coverage pass: `packages/problems` catálogo — 100% statements/branches/functions/lines
      confirmado via `pnpm --filter @sdp/problems test:coverage`; `getProblem` não tem branch
      explícito além do lookup (found/not-found), já coberto pelos 2 casos de T010

- [X] T012 [P] Criar `apps/web/src/lib/canvas-types.ts` — `ComputableFlowNode`, `ClientFlowNode`,
      `FlowNode`, `FlowEdge` (data-model.md), mais `FlowNodeData`/`FlowEdgeData`/`toFlowNode`/
      `toFlowEdge` (payload de `data` dos nós/arestas nativos do React Flow — refinamento
      necessário para não duplicar `id`/`position` entre o nó do React Flow e o `data`, achado ao
      integrar com a store em T016)
- [X] T013 Criar `apps/web/src/lib/canvas-to-design.ts` — `toDesign(nodes, edges): Design`,
      `toWorkload(problem): Workload` (contracts/canvas-engine-boundary.md, research.md §4/§5) —
      importa `Design`/`Workload`/`ComponentType`/`EdgeKind` de `@sdp/engine`, nunca redefine esses
      tipos
- [X] T014 Escrever `apps/web/test/canvas-to-design.spec.ts` — 17 testes cobrindo as regras 1-6 do
      contrato: nó Cliente sem conexão ignorado; múltiplos Clientes → 1 `entryNodeId` sem
      duplicata / 2 `entryNodeIds` para componentes diferentes; nós/arestas Cliente nunca em
      `Design.nodes`/`Design.edges`; peso bruto repassado sem normalização própria; entrada
      malformada nunca lança exceção; `toWorkload` determinística
- [X] T015 Coverage pass: `canvas-to-design.ts` — 100% statements/branches/functions/lines
      (`pnpm --filter web test:coverage`)

- [X] T016 Criar `apps/web/src/stores/canvas-store.ts` — store Zustand + Immer: `nodes`/`edges`
      tipados como `Node<FlowNodeData>`/`Edge<FlowEdgeData>` nativos do React Flow (research.md
      §2 — position/seleção ficam no próprio React Flow, nunca duplicados em `data`),
      `selectedNodeId`, `lastResult: SimulationResult | null`; ações `onNodesChange`,
      `onEdgesChange`, `onConnect`, `addNode`, `updateNodeConfig`, `selectNode`,
      `applySimulationResult`. Sem `zundo` (undo/redo) nem `persist` (autosave) ainda —
      adicionados em US2 (T030) e US3 (T032)

**Checkpoint**: `packages/problems` e o mapper (`canvas-to-design.ts`) compilam e passam em todos
os testes (`pnpm --filter problems test`, `pnpm --filter web test`). Nenhuma user story ainda é
utilizável — sem UI de canvas.

## Phase 3: User Story 1 — Montar e simular o desafio do encurtador de URL, do zero (P1)

**Goal**: loop completo — ler o problema, arrastar/conectar/configurar componentes, submeter, ver o
resultado do engine com o gargalo destacado — sem ajuda externa (spec.md, critério de saída).

**Independent Test**: com uma conta autenticada e nenhum design em andamento, abrir o problema,
montar Cliente → API Gateway → App Server, configurar réplicas do App Server, submeter, e confirmar
que o resultado reflete a topologia (mudar réplicas muda a capacidade exibida na submissão seguinte).

- [X] T017 [US1] Criar `apps/web/src/app/app/[problemId]/page.tsx` — Server Component: `auth()`
      (redirect para `/entrar` se sem sessão, mesmo padrão do placeholder de M0.5),
      `getProblem(problemId)` de `@sdp/problems` (`notFound()` do Next se `undefined`), renderiza
      `<ProblemBrief problem={problem} />` (T020) + `<Canvas problem={problem} />` (T025, Client
      Component)
- [X] T018 [US1] Reescrever `apps/web/src/app/app/page.tsx` — Server Component que faz
      `redirect(`/app/${ALL_PROBLEM_IDS[0]}`)` (1 problema neste marco; remove o placeholder "Você
      está dentro do..." de M0.5, que cumpriu seu propósito)
- [X] T019 [P] [US1] Criar `apps/web/src/app/app/layout.tsx` — header mínimo com o email da sessão
      + `<SignOutButton />` (reaproveita `apps/web/src/app/app/_sign-out-button.tsx`, já existente
      de M0.5, movido de `page.tsx` para o layout)
- [X] T020 [P] [US1] Criar `apps/web/src/components/canvas/problem-brief.tsx` — enunciado,
      requisitos funcionais, requisitos não-funcionais e escala do `Problem` (FR-012), exibido
      antes/acima do canvas
- [X] T021 [P] [US1] Criar `apps/web/src/components/canvas/nodes/component-node.tsx` — nó
      customizado do React Flow parametrizado por `ComponentType` (ícone lucide-react + nome +
      badge de status/gargalo vindo de `data.result` quando existir — destaque vermelho quando
      `data.result.isBottleneck`, FR-009)
- [X] T022 [P] [US1] Criar `apps/web/src/components/canvas/nodes/client-node.tsx` — nó customizado
      para o Cliente (variantes mobile/web/desktop), sem badge de status nem configuração (FR-006)
- [X] T023 [P] [US1] Criar `apps/web/src/components/canvas/edges/typed-edge.tsx` — aresta
      customizada por `EdgeKind` (cor/traço distinto para leitura/escrita/assíncrona/replicação),
      marcador de seta (`MarkerType.ArrowClosed`)
- [X] T024 [P] [US1] Criar `apps/web/src/components/canvas/palette.tsx` — lista os 11
      `ComponentType` + Cliente (mobile/web/desktop); `onDragStart` marca o tipo arrastado via
      `event.dataTransfer.setData` (research.md §2)
- [X] T025 [US1] Criar `apps/web/src/components/canvas/canvas.tsx` — Client Component: `<ReactFlow>`
      ligado à store (T016) via `useStore`, `nodeTypes`/`edgeTypes` (T021-T023), `onDragOver`/
      `onDrop` criando o nó via `screenToFlowPosition` (research.md §2), seleção de nó atualiza
      `selectedNodeId`
- [X] T026 [US1] Criar `apps/web/src/components/canvas/config-panel.tsx` — painel do nó
      selecionado: campo de réplicas com validação de entrada (FR-014 — impede confirmar valor < 1
      ou não-numérico diretamente no campo) e, quando o nó for `cache`, campo de taxa de acerto;
      nada exibido quando o nó selecionado é um Cliente (FR-006)
- [X] T027 [US1] Criar `apps/web/src/components/canvas/result-panel.tsx` — renderiza
      `SimulationResult`: utilização/status por nó, latência p50/p95/p99 do caminho crítico,
      throughput, custo por nó e total, violações com a mensagem já produzida pelo engine;
      **explicitamente sem nenhum campo de nota/score/veredito** (FR-013)
- [X] T028 [US1] Adicionar submissão em `canvas.tsx`/`canvas-store.ts` — botão "submeter" chama
      `toDesign`/`toWorkload` (T013) e `simulate()` de `@sdp/engine`, guarda o `SimulationResult` em
      `lastResult` (T016) via `applySimulationResult`, propaga o status/gargalo por nó para
      `data.result` de cada `component-node` (T021), abre o `result-panel` (T027)
- [X] T029 [US1] Tratar submissão de canvas vazio em `canvas-store.ts`/`result-panel.tsx` —
      mensagem clara ("adicione componentes antes de submeter") em vez de chamar o engine com um
      `Design` vazio sem feedback (Edge Case do spec)

**Checkpoint**: quickstart.md "Verificar o loop principal (US1)" passa de ponta a ponta —
inclusive o caso de violação (`orphan-node`) exibindo mensagem legível, nunca um erro técnico cru
(FR-016).

## Phase 4: User Story 2 — Corrigir o design sem perder o trabalho (P2)

**Goal**: desfazer/refazer edições do canvas, em ordem, histórico linear.

**Independent Test**: sequência de edições → desfazer N vezes → canvas idêntico ao estado anterior a
cada uma; refazer restaura; uma edição nova após um undo descarta o redo pendente.

- [X] T030 [US2] Envolver `canvas-store.ts` (T016) com o middleware `temporal` do `zundo` — histórico
      de `nodes`/`edges` (research.md §3); `selectedNodeId`/`lastResult` ficam fora do histórico
      (não fazem parte do "design" em si). Achado durante a implementação: sem um `handleSet`
      debounced, `onNodesChange` durante um drag geraria um passo de histórico por pixel — resolvido
      com um debounce mínimo de 300ms (padrão documentado pelo próprio zundo), sem dependência nova
- [X] T031 [P] [US2] Adicionar botões de desfazer/refazer + atalhos de teclado
      (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) em `apps/web/src/components/canvas/canvas.tsx`, chamando
      `useCanvasStore.temporal.getState().undo()`/`redo()`

**Checkpoint**: quickstart.md "Verificar undo/redo (US2)" passa de ponta a ponta.

## Phase 5: User Story 3 — Retomar um design depois de fechar o navegador (P3)

**Goal**: autosave local via `localStorage`, chaveado por `problemId`, restaurado automaticamente.

**Independent Test**: montar design parcial → fechar/reabrir a aba no mesmo navegador → design
restaurado idêntico; problema nunca aberto neste navegador → canvas vazio.

- [X] T032 [US3] Adicionar middleware `persist` (`zustand/middleware`) a `canvas-store.ts` (T016) —
      persiste só `nodes`/`edges` (não `selectedNodeId`/`lastResult`/histórico de undo); chave
      literal `sdp-canvas-url-shortener` (FR-011 pede "derivada de problemId" — como M1 só tem 1
      problema, a chave já É essa derivação, sem precisar virar store-factory ainda; comentário no
      arquivo aponta revisitar em M4); `storage` com fallback silencioso se `localStorage`
      indisponível/cheio (try/catch — Edge Case do spec). Achado durante a implementação: o TS não
      infere o tipo persistido de `persist` quando composto com `temporal`/`immer` — resolvido
      tipando `persistOptions` explicitamente como `PersistOptions<CanvasState,
      PersistedCanvasState>` em vez de especificar os 4 parâmetros de `persist<...>` (o que apagaria
      a inferência de `useCanvasStore.temporal`)
- [X] T033 [US3] Hidratar a store a partir do `localStorage` — automático pelo próprio middleware
      `persist` do Zustand ao montar (sem `skipHydration`); nenhum código adicional necessário em
      `canvas.tsx`

**Checkpoint**: quickstart.md "Verificar autosave (US3)" passa de ponta a ponta.

## Phase 6: Polish & Cross-Cutting

- [X] T034 [P] Navegação por teclado no canvas — RNF-8/FR-015. Confirmado via documentação oficial
      do React Flow (`nodesFocusable`/`edgesFocusable` são `true` por padrão, `disableKeyboardA11y`
      é `false` por padrão — nenhuma dessas props foi desativada em `canvas.tsx`): Tab foca nós,
      Enter/Espaço seleciona (aciona o mesmo `onNodeClick` usado por clique de mouse), setas movem
      o nó selecionado, Delete remove. Paleta (T024) e painel de configuração (T026) já são
      `<button>`/`<input>` nativos, então já são operáveis por Tab/Enter sem código extra. Undo/redo
      (T031) tem atalho de teclado dedicado. **Lacuna conhecida, não resolvida neste marco**: criar
      uma *conexão* entre dois nós exige arrastar entre handles (gesto de ponteiro) — o React Flow
      não oferece um fluxo nativo de conexão 100% por teclado, e implementar um (ex.: "selecionar
      nó de origem → tecla → selecionar destino → confirmar") seria uma feature própria, fora do
      escopo de tempo deste marco. Registrado aqui em vez de reivindicado como resolvido.
- [X] T035 Rodar `quickstart.md` manualmente (US1+US2+US3) — feito ao longo da implementação, com
      uma conta real criada nesta sessão (signup → login → canvas → paleta → submissão →
      undo/redo → autosave), não como uma passada separada ao final. Único passo do quickstart.md
      não verificado desta forma: a conexão entre dois nós via drag-and-drop entre handles (o
      ambiente de browser desta sessão não suporta simulação de arrastar sem uma captura de tela
      prévia) — fica para o autor confirmar manualmente.
- [X] T036 `pnpm --filter problems typecheck && pnpm --filter problems test && pnpm --filter web
      typecheck && pnpm --filter web test && pnpm --filter web build` — ver resultado no relatório
      final do `/speckit-implement`
- [X] T037 Revisar `specs/canvas-submissao-m1/spec.md` — status permanece `Ready` (não `Done`),
      mesmo padrão de T041 de M0.5: **SC-002** (identificar o gargalo em <10s olhando o canvas) e
      **SC-006** (60fps até 50 nós) exigem verificação visual/de performance com um navegador real
      que este ambiente de implementação não tinha disponível (sem `screenshot`/drag, sem
      profiling) — o destaque vermelho de gargalo foi implementado e o dado que o alimenta
      (`isBottleneck`) foi exercitado indiretamente (violação `orphan-node` confirmada na tela),
      mas nenhum design real chegou a saturar um nó durante a verificação desta sessão. Autor
      MUST confirmar manualmente antes de promover para `Done`.

## Dependencies

- **Setup (T001-T006)** → bloqueia tudo.
- **Foundational (T007-T016)** → bloqueia US1/US2/US3 (catálogo de problemas, mapper canvas→engine,
  store base).
- **US1 (T017-T029)** → depende só do Foundational; é o loop de valor completo e, sozinha, já
  cumpre o critério de saída do marco.
- **US2 (T030-T031)** → depende de US1 (envolve a store que US1 já usa; sem canvas funcional não há
  o que desfazer).
- **US3 (T032-T033)** → depende de US1 (mesmo motivo); independente de US2 no sentido de que
  `persist` e `temporal` são middlewares Zustand que compõem sem interferir um no outro, mas os
  dois modificam `canvas-store.ts` — fazer US2 antes de US3 evita editar o mesmo arquivo fora de
  ordem.
- **Polish (T034-T036)** → depende de US1+US2+US3 completos.

## Parallel Example

Dentro do Foundational: T007 (`types.ts`) e T012 (`canvas-types.ts`) são paralelas entre si
(pacotes diferentes); depois de T013 (`canvas-to-design.ts`) existir, T014 e T015 dependem dela mas
são sequenciais entre si (T015 precisa saber o que T014 já cobriu). Dentro de US1: T019-T024 (seis
componentes independentes — layout, problem-brief, os dois tipos de nó, a aresta, a paleta) são
paralelas entre si, convergindo em T025 (`canvas.tsx`, que os importa todos).

## Implementation Strategy

**MVP scope**: **Setup + Foundational + US1** — sozinha, US1 já cumpre o critério de saída do marco
(spec.md: "uma pessoa que nunca viu o produto resolve o problema do encurtador do zero, sem ajuda,
e entende por que o resultado foi aquele"). US2 (undo/redo) e US3 (autosave) são P0 no
`docs/product-context.md` §10 — não são opcionais para o marco terminar — mas são incrementos de
qualidade que não bloqueiam a demonstração do loop de valor central.

**Incremental delivery**: implementar e commitar por fase (Setup → Foundational → US1 → US2 → US3 →
Polish), na ordem deste documento — cada checkpoint é um ponto seguro para parar/retomar. Dentro do
Foundational, os dois módulos puros com teste (T007-T015: catálogo de problemas, mapper
canvas-to-design) são a parte mais fácil de verificar sem depender de nenhuma interação manual no
browser — fazer e commitar primeiro, antes de qualquer componente React.
