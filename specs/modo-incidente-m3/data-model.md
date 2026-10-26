# Data Model: M3 — Modo Incidente

## `packages/problems/src/incidents/`

```ts
type FaultType = 'node-down' | 'zone-down' | 'partition' | 'cache-cold' | 'pool-exhausted';

type Fault =
  | { type: 'node-down'; target: NodeId; lostInstances: number }      // ≥ réplicas do alvo ⇒ nó removido com suas arestas
  | { type: 'zone-down'; target: NodeId; zone: 0 | 1 | 2 }            // target = componente que o diagnóstico deve apontar
  | { type: 'partition'; target: NodeId; cutFrom: NodeId }            // remove as arestas cutFrom ↔ target
  | { type: 'cache-cold'; target: NodeId }                            // cacheHitRate → 0
  | { type: 'pool-exhausted'; target: NodeId; capacityFactor: number }; // só se o gate 3 aprovar

function applyFault(design: Design, fault: Fault): Design;   // pura, relativa, nunca replicas: 0

// Público — pode ir pro navegador
type IncidentPublic = {
  id: string;
  title: string;            // nunca revela a causa
  alert: string;            // descreve só o sintoma visível nas métricas "durante"
  design: Design;           // a arquitetura pronta (estado normal)
  workload: Workload;
};

// Secreto — só servidor
type IncidentSecret = {
  id: string;
  fault: Fault;                       // a causa plantada (diagnóstico certo = { fault.target, fault.type })
  fixCriterion: {
    maxP99Ms: number;
    minThroughputRps: number;         // normalmente = workload.rps
    noSaturatedNodes: true;
    targetMustRemainReachable: true;
    noNewOrphans: true;
  };
  referenceFix: Design;               // prova que existe fix (SC-005)
};
```

`zone-down`: o diagnóstico aponta o componente declarado em `target` (o mais afetado), com tipo
`zone-down`; a transformação vale para todos os nós (regra de zonas, research §2).

## `apps/web/src/lib/incidents/`

```ts
type IncidentSnapshot = {           // estado "durante", lista branca (gate 4)
  nodes: Record<NodeId, { utilization: number; status: NodeStatus | 'no-traffic'; offeredLoad: number }>;
  path: { latency: { p50: number; p95: number; p99: number }; throughputRps: number };
  violations: { type: ViolationType; nodeIds: NodeId[] }[];
};

type DiagnosisVerdict = 'correct' | 'right-component' | 'wrong';
```

Nós do design original removidos pela falha aparecem com `offeredLoad: 0` e status `'no-traffic'`.

## Banco — sem tabela nova

`scoringEvents` (M2.8), tipos novos só no TypeScript (a coluna é `text`):

| eventKey | type | xp | significado |
|---|---|---|---|
| `incident-diagnosis:<id>` | `incident-diagnosis` | 0 | diagnóstico acertado (destrava o fix — FR-008) |
| `incident:<id>` | `incident` | 100 | incidente resolvido (FR-009) |

Mesma restrição única `(userId, eventKey)` → idempotente com duas abas. `activityDays` registra o dia
em todo diagnóstico/fix conferido (ofensiva). `submissionRateLimits` é a mesma quota.

## Engine — condicional ao gate 3

`DesignNode.capacityFactor?: number` (padrão 1): `capacity = replicas × maxThroughputRps ×
capacityFactor`. Ausente ⇒ resultado idêntico ao atual (SC-006).
