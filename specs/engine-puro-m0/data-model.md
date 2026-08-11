# Data Model: M0 — Engine de Simulação Puro

**Input**: [spec.md](spec.md) Key Entities, `docs/product-context.md` §6 (contrato) e §7 (modelo
matemático), [research.md](research.md)

Todos os tipos abaixo vivem em `packages/engine/src/types.ts`, sem nenhuma dependência externa.

## Design

```ts
type NodeId = string;

type ComponentType =
  | 'load_balancer' | 'app_server' | 'cache' | 'sql_primary' | 'sql_replica'
  | 'nosql_kv' | 'queue' | 'object_storage' | 'cdn' | 'api_gateway' | 'worker';

type DesignNode = {
  id: NodeId;
  type: ComponentType;
  replicas: number;          // c — FR-003, FR-009 (c ≥ 2 ⇒ não-SPOF, ver Clarifications)
  cacheHitRate?: number;     // 0..1, só relevante para type === 'cache' — FR-008
};

type EdgeKind = 'read' | 'write' | 'async' | 'replication'; // FR-012

type DesignEdge = {
  id: string;
  from: NodeId;
  to: NodeId;
  kind: EdgeKind;
  weight: number;            // split de tráfego — normalizado se a soma ≠ 100% (FR-018)
};

type Design = {
  nodes: DesignNode[];
  edges: DesignEdge[];
  entryNodeIds: NodeId[];    // por onde a carga externa entra no grafo
};
```

**Validação estrutural (FR-019 — nunca lança, sempre produz Violation)**:

| Condição inválida | Violation.type |
|---|---|
| Aresta referencia `from`/`to` inexistente | `'broken-edge-reference'` |
| Dois nós com o mesmo `id` | `'duplicate-node-id'` |
| `replicas < 1` ou `replicas` não-inteiro | `'invalid-replica-count'` |
| Nó fora de qualquer caminho a partir de `entryNodeIds` | `'orphan-node'` (FR-010) |
| Nó membro de um ciclo | `'cycle'` (FR-011) |
| Nó sem redundância (`replicas < 2`) no caminho crítico | `'spof'` (FR-009) |

## Workload

```ts
type Workload = {
  rps: number;                // λ — carga oferecida, FR-002
  readWriteRatio: number;     // 0..1, fração de leitura
  payloadBytes: number;
  peakMultiplier: number;     // aplicado sobre rps para cenário de pico
};
```

## SimulationResult

```ts
type NodeStatus = 'healthy' | 'warning' | 'saturated'; // saturated ⇔ ρ ≥ 1 (Edge Cases)

type NodeResult = {
  offeredLoad: number;        // λ que chega no nó, após propagação (FR-002) e efeito de cache (FR-008)
  capacity: number;           // c · μ
  utilization: number;        // ρ = λ / (c·μ) — FR-003
  queueLatencyMs: number;     // W do M/M/1 — FR-004; valor sentinela definido se ρ ≥ 1 (Edge Cases)
  status: NodeStatus;
};

type PathResult = {
  throughputRps: number;      // min(capacidade de cada nó no caminho), nunca > rps ofertado — FR-006
  bottleneckId: NodeId | null; // FR-007
  latency: { p50: number; p95: number; p99: number }; // FR-005, ver research.md §3
};

type Violation = {
  type: 'spof' | 'orphan-node' | 'cycle' | 'broken-edge-reference'
      | 'duplicate-node-id' | 'invalid-replica-count';
  nodeIds: NodeId[];
  edgeIds?: string[];
  message: string;            // explicação legível, não gerada por LLM (constitution I)
};

type Dimension =
  | 'escalabilidade' | 'disponibilidade' | 'latencia' | 'consistencia'
  | 'custo' | 'complexidade_operacional' | 'seguranca'; // §9

type SimulationResult = {
  nodes: Record<NodeId, NodeResult>;
  path: PathResult;
  violations: Violation[];
  cost: { monthlyTotal: number; byNode: Record<NodeId, number> }; // FR-013
  scores: Record<Dimension, number>; // 0..10 cada — score multidimensional, nunca nota única (§9)
};
```

## Catálogo de componentes (FR-014)

Dado versionado em `packages/engine/src/catalog/components.ts`. Valores **ilustrativos**
(D5 — tabela fixa, não preço real de cloud; ver research.md §5) — plausíveis e redondos, não
benchmarks reais (`docs/product-context.md` §4: "não é simulador de produção").

| `ComponentType` | Throughput máx./instância (rps) | Latência base p50/p99 (ms) | Custo mensal/instância (US$) |
|---|---:|---:|---:|
| `load_balancer` | 10 000 | 1 / 3 | 50 |
| `api_gateway` | 5 000 | 2 / 6 | 40 |
| `app_server` | 500 | 20 / 80 | 30 |
| `worker` | 200 | 50 / 200 | 25 |
| `cache` | 50 000 | 0.5 / 2 | 60 |
| `sql_primary` | 1 000 | 5 / 25 | 120 |
| `sql_replica` | 1 000 | 5 / 25 | 100 |
| `nosql_kv` | 8 000 | 2 / 8 | 80 |
| `queue` | 3 000 | 3 / 10 | 45 |
| `object_storage` | 2 000 | 15 / 60 | 20 |
| `cdn` | 100 000 | 0.2 / 1 | 70 |

Cada linha corresponde a `μ` (capacidade de serviço por instância) e à latência base usada em
`latência_efetiva = h·L_cache + (1−h)·(L_cache + L_db)` (FR-008) e na soma de latência do caminho.

## Relações

```
Design 1───* DesignNode
Design 1───* DesignEdge (from/to → DesignNode.id)
DesignNode *───1 ComponentType (catálogo, FR-014)
(Design, Workload) ──simulate()──> SimulationResult
SimulationResult 1───* NodeResult (por DesignNode)
SimulationResult 1───* Violation
```

Não há transições de estado — `Design` e `Workload` são entradas imutáveis de uma função pura
(constitution II); não há entidade com ciclo de vida próprio dentro do engine.
