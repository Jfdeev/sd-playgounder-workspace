# Implementation Plan: M1 — Canvas e submissão

**Branch**: `feature/001-canvas-submission` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/canvas-submissao-m1/spec.md`

## Summary

Primeira UI real do engine (M0): um canvas drag-and-drop (React Flow) onde o usuário monta um
design para o problema "Encurtador de URL" — arrasta componentes da paleta (os 11 tipos já
computáveis pelo engine, mais um nó "Cliente" puramente visual para marcar entrada de carga),
conecta com arestas tipadas e com peso, configura réplicas/cache por nó, e submete. A submissão
roda `simulate()` do `@sdp/engine` inteiramente no browser (sem round-trip a servidor — nenhum
efeito é persistido neste marco) e o resultado (utilização, gargalo, latência, custo, violações) é
renderizado de volta no canvas e num painel de resultado. Estado do canvas vive em Zustand (com
Immer + `zundo` para undo/redo) e é salvo automaticamente em `localStorage` (autosave local, sem
servidor). O problema "Encurtador de URL" passa a existir como dado versionado em um novo pacote
`packages/problems`.

## Technical Context

**Language/Version**: TypeScript 5.7 (mesma versão de `packages/engine` e `apps/web`, já fixada em M0/M0.5)

**Primary Dependencies**: `@xyflow/react` 12.x (canvas — ADR-002), `zustand` 5.x + `immer` (estado — ADR-004), `zundo` 2.x (middleware de undo/redo sobre Zustand, <1kB, oficialmente listado nas integrações de terceiros do Zustand)

**Storage**: `localStorage` do navegador (autosave local, FR-011) — nenhuma tabela nova no Postgres/Neon neste marco (ADR-005 só se aplica a partir de M4, quando designs passam a ter histórico de versões em servidor)

**Testing**: Vitest — mesmo padrão de M0/M0.5: cobertura forte só em módulos puros (`canvas → Design/Workload` mapper, catálogo de `packages/problems`); interação do React Flow (drag/drop/render) verificada manualmente no browser, não por unit test

**Target Platform**: Web (Next.js App Router, `apps/web`), mesmo app de M0.5

**Project Type**: Web application (monorepo já existente — `apps/web` consome `packages/engine` e, a partir deste marco, também `packages/problems`)

**Performance Goals**: RNF-2 (<100ms preview ao editar), RNF-7 (60fps até 50 nós), RNF-1 (herdado do engine: simulação de 30 nós em <50ms) — `docs/product-context.md` §11

**Constraints**: cálculo 100% client-side neste marco (sem endpoint novo); `packages/engine` não muda (Constitution II — engine puro); nenhuma dependência de LLM (Constitution I seria violada por qualquer "nota" inventada na UI — FR-013 já resolve isso)

**Scale/Scope**: 1 problema completo (Encurtador de URL), 11 tipos de componente + 1 nó visual (Cliente, 3 variantes: mobile/web/desktop), 4 tipos de aresta

## Constitution Check

*GATE: verificado antes da Fase 0 e re-checado após a Fase 1.*

| Princípio | Como este marco cumpre | Risco de violação |
|---|---|---|
| I — Engine é a fonte da verdade | Todo número exibido (utilização, latência, custo, gargalo) vem direto de `SimulationResult` retornado por `simulate()`. Nenhum "veredito"/nota é inventado na UI (FR-013). | Baixo — nenhuma lógica de cálculo nova em `apps/web`. |
| II — Engine puro | `packages/engine` **não é modificado** neste marco. O nó Cliente é um conceito só de `apps/web` (React Flow), nunca vira parte de `Design.nodes`. | Baixo — verificado por FR-006/FR-001 do spec. |
| III — Determinismo | Sem RNG em qualquer cálculo — `simulate()` é a mesma função pura de M0; carga fixada pelo problema (FR-007), então a mesma submissão sempre produz o mesmo resultado. | Nenhum. |
| IV — Só pontua o caminho da requisição | Já garantido pelo engine (`computeReachableNodeIds`, M0) — este marco só precisa mapear corretamente `entryNodeIds` (nós conectados a um Cliente) para o engine aplicar essa regra. | Médio — bug no mapper canvas→Design (`entryNodeIds` errado) quebraria essa garantia silenciosamente. Mitigação: FR-005 de `packages/problems`/mapper com testes unitários fortes (ver Testing acima). |
| V — Score multidimensional, nunca nota única | `SimulationResult.scores` é placeholder (M0, FR-020) — este marco explicitamente **não exibe nenhuma nota**, única ou multidimensional (FR-013). | Nenhum — a spec já resolveu essa tensão removendo "nota" do critério de saída. |
| VI — Modelo matemático é especificação | Nenhuma fórmula nova — só consumo de `simulate()` já existente. | Nenhum. |
| VII — Fronteira de camadas | `apps/web` só chama `simulate()` (import de `@sdp/engine`), nunca recalcula métrica por conta própria. `packages/narrator` não existe/não é tocado neste marco (LLM fora de escopo até M2). | Baixo. |

**Resultado**: nenhuma violação. Nenhuma entrada em Complexity Tracking necessária.

## Project Structure

### Documentation (this feature)

```text
specs/canvas-submissao-m1/
├── plan.md              # Este arquivo
├── research.md           # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/            # Fase 1 — contrato do mapper canvas↔engine (não há API REST nova)
└── tasks.md               # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

Monorepo já existente (`docs/product-context.md` §8) — este marco adiciona um pacote novo
(`packages/problems`) e estende `apps/web`, sem tocar em `packages/engine`:

```text
packages/
├── engine/                      # inalterado neste marco
└── problems/                    # NOVO — catálogo de problemas como dado versionado
    ├── package.json             # @sdp/problems, workspace:*
    ├── src/
    │   ├── index.ts             # API pública: getProblem(id), ALL_PROBLEM_IDS
    │   ├── types.ts             # tipo Problem (enunciado, FR, NFR, escala)
    │   └── catalog/
    │       └── url-shortener.ts # o único problema deste marco
    └── test/
        └── catalog.spec.ts

apps/web/
├── package.json                  # + @sdp/problems, @xyflow/react, zustand, immer, zundo
└── src/
    ├── app/
    │   └── app/
    │       ├── page.tsx          # redireciona para /app/encurtador-de-url (1 problema neste marco)
    │       └── [problemId]/
    │           └── page.tsx      # a tela do canvas em si (Server Component: auth() + carrega Problem; renderiza o Client Component do canvas)
    ├── components/
    │   └── canvas/
    │       ├── canvas.tsx          # Client Component: <ReactFlow>, wiring com a store
    │       ├── palette.tsx         # paleta lateral (11 tipos + Cliente mobile/web/desktop), drag source
    │       ├── nodes/               # nó customizado por tipo (ou 1 componente parametrizado por ComponentType)
    │       ├── edges/               # aresta customizada tipada (leitura/escrita/async/replicação)
    │       ├── config-panel.tsx    # painel de configuração do nó selecionado (réplicas, cacheHitRate)
    │       ├── result-panel.tsx    # painel de resultado pós-submissão
    │       └── problem-brief.tsx   # enunciado/FR/NFR/escala do problema (FR-012)
    ├── stores/
    │   └── canvas-store.ts        # Zustand + Immer + zundo (undo/redo) + persist (localStorage, FR-011)
    └── lib/
        └── canvas-to-design.ts     # função PURA: (nodes, edges) do React Flow → Design + Workload do engine — testada em test/canvas-to-design.spec.ts
```

**Structure Decision**: reaproveita a estrutura de monorepo já estabelecida em M0/M0.5
(`docs/product-context.md` §8). `packages/problems` nasce neste marco porque é a primeira vez que o
produto precisa de um problema real (FR-012) — decisão já antecipada pela estrutura documentada.
Dentro de `apps/web`, `components/canvas/` e `stores/` são novos diretórios de topo (M0.5 só tinha
`app/`, `db/`, `lib/`) — introduzidos porque o canvas é stateful e complexo o bastante para não
caber dentro de `app/_components/` (convenção usada só para a landing page, que é majoritariamente
apresentacional). A rota é `/app/[problemId]` em vez de `/app` fixo: com 1 problema só neste marco,
`/app` redireciona para o único `problemId` existente — mas a forma da rota já fica pronta para a
biblioteca de 12 problemas de M4, sem exigir uma reescrita de rota depois (não é escopo novo, é só
a forma da URL).

## Complexity Tracking

*Sem violações da Constitution Check acima — seção não aplicável.*
