# Data Model: M1 — Canvas e submissão

**Input**: [spec.md](spec.md) Key Entities, [research.md](research.md).

Três camadas de tipo, deliberadamente separadas (Constitution VII — fronteira de camadas):
`packages/engine` (inalterado), `packages/problems` (novo), `apps/web` (canvas/estado, novo).
Nenhum tipo do engine é redefinido aqui — só consumido.

## `packages/problems` — Problema

```ts
export type Problem = {
  id: string;                          // ex.: "url-shortener"
  title: string;                       // "Encurtador de URL"
  statement: string;                   // anatomia §2.1 parte 1
  functionalRequirements: string[];    // parte 3
  nonFunctionalRequirements: string[]; // parte 4 (SLA de latência, disponibilidade, budget)
  scale: {                             // parte 5
    dau: number;
    requestsPerUserPerDay: number;     // base para a conversão DAU → RPS (research.md §5)
    readWriteRatio: number;            // 0..1, fração de leitura — mesmo shape de Workload
    avgPayloadBytes: number;
    peakMultiplier: number;
  };
};
```

**Validação/regras**:
- `id` é único no catálogo (`ALL_PROBLEM_IDS`) — chave usada na rota `/app/[problemId]`.
- Nenhum campo de rubrica, solução de referência ou fase de clarificação existe neste marco
  (FR-012 — essas partes da anatomia completa são M2).

## `apps/web` — Canvas (React Flow + engine, tipos de fronteira)

### Nó do canvas (`FlowNode`)

Dois tipos de nó coexistem no mesmo canvas, diferenciados por `kind`:

```ts
type ComputableFlowNode = {
  id: string;
  kind: 'component';
  componentType: ComponentType;  // de @sdp/engine — os 11 tipos de M0
  position: { x: number; y: number };
  replicas: number;
  cacheHitRate?: number;         // só relevante quando componentType === 'cache'
};

type ClientFlowNode = {
  id: string;
  kind: 'client';
  variant: 'mobile' | 'web' | 'desktop';
  position: { x: number; y: number };
  // sem replicas, sem cacheHitRate — não é computável (FR-006)
};

type FlowNode = ComputableFlowNode | ClientFlowNode;
```

### Aresta do canvas (`FlowEdge`)

```ts
type FlowEdge = {
  id: string;
  source: string;   // id de um FlowNode (component ou client)
  target: string;    // id de um ComputableFlowNode — um Cliente nunca é destino
  kind: EdgeKind;     // de @sdp/engine — 'read' | 'write' | 'async' | 'replication'
  weight?: number;    // peso bruto digitado pelo usuário; ausente = peso implícito igual entre irmãs
};
```

**Regra**: uma aresta saindo de um `ClientFlowNode` não representa tráfego real entre componentes
— é só o sinal de que o `target` é um ponto de entrada (FR-006). O mapper (`canvas-to-design.ts`,
research.md §4) usa essas arestas só para calcular `entryNodeIds`, nunca as inclui em `Design.edges`.

### Estado da store (`CanvasState`, Zustand)

```ts
type CanvasState = {
  problemId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  // ações: onNodesChange, onEdgesChange, onConnect, addNode, updateNodeConfig, selectNode,
  // undo/redo vêm do middleware zundo (research.md §3), não são campos do state em si
};
```

**Persistência**: `nodes` e `edges` são persistidos em `localStorage`, chaveados por `problemId`
(FR-011) — `selectedNodeId` e o histórico de undo/redo **não** são persistidos (não fazem parte do
"design" propriamente dito).

## Mapeamento para os tipos do engine (fronteira crítica, research.md §4)

```
toDesign(nodes: FlowNode[], edges: FlowEdge[]): Design
  Design.nodes      = nodes.filter(kind === 'component').map(→ DesignNode)
  Design.edges       = edges.filter(source é um ComputableFlowNode).map(→ DesignEdge)
  Design.entryNodeIds = { target de toda aresta cujo source é um ClientFlowNode }  (sem duplicata)

toWorkload(problem: Problem): Workload
  Workload.rps              = (problem.scale.dau · problem.scale.requestsPerUserPerDay) / 86400
                               · problem.scale.peakMultiplier
  Workload.readWriteRatio   = problem.scale.readWriteRatio
  Workload.payloadBytes     = problem.scale.avgPayloadBytes
  Workload.peakMultiplier   = problem.scale.peakMultiplier
```

Ambas as funções são puras (sem side effect, sem acesso a estado global) — só dependem dos
argumentos recebidos. `Design` e `Workload` resultantes são exatamente os tipos já definidos em
`packages/engine/src/types.ts` (nenhum tipo novo é introduzido lá).

## Máquina de estados — nenhuma neste marco

Ao contrário de M0.5 (estado de confirmação de email), este marco não tem transição de estado
persistente relevante — o design em edição não tem "status" (rascunho/enviado/etc.), é só editado e
re-submetido livremente, quantas vezes o usuário quiser, sempre no cliente.
