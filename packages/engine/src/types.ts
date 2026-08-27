/**
 * Tipos centrais do engine — packages/engine/src/types.ts
 *
 * Fonte: specs/engine-puro-m0/data-model.md, docs/product-context.md §6.
 * Pacote puro: nenhum tipo aqui depende de React, DOM ou Node.
 */

export type NodeId = string;

export type ComponentType =
  // 11 originais (M0/M1)
  | 'load_balancer'
  | 'api_gateway'
  | 'app_server'
  | 'worker'
  | 'cache'
  | 'sql_primary'
  | 'sql_replica'
  | 'nosql_kv'
  | 'queue'
  | 'object_storage'
  | 'cdn'
  // Traffic & Edge — M1.5 US2
  | 'dns'
  | 'waf'
  | 'ingress'
  | 'rate_limiter'
  // Compute — M1.5 US2
  | 'serverless'
  | 'auth_service'
  | 'search'
  | 'scheduler'
  | 'notifications'
  | 'analytics'
  // Storage — M1.5 US2
  | 'data_warehouse'
  | 'vector_db'
  // Messaging — M1.5 US2
  | 'pubsub'
  | 'event_stream'
  | 'kafka'
  // AI & Agents — M1.5 US2
  | 'llm_gateway'
  | 'orchestrator'
  | 'tool_registry'
  | 'memory_fabric'
  | 'safety_mesh'
  // External — M1.5 US2
  | 'third_party_api'
  | 'payment'
  | 'email'
  // Observability — M1.5 US3
  | 'metrics'
  | 'logs'
  | 'tracing'
  | 'alerting'
  | 'health_check'
  // Network — M1.5 US3
  | 'vpc'
  | 'subnet'
  | 'nat_gateway'
  | 'vpn'
  | 'service_mesh';

export type DesignNode = {
  id: NodeId;
  type: ComponentType;
  /** c — número de instâncias/réplicas. c ≥ 2 ⇒ não-SPOF (FR-009). */
  replicas: number;
  /** 0..1, só relevante para type === 'cache' (FR-008). */
  cacheHitRate?: number;
};

export type EdgeKind = 'read' | 'write' | 'async' | 'replication';

export type DesignEdge = {
  id: string;
  from: NodeId;
  to: NodeId;
  kind: EdgeKind;
  /** Peso de split de tráfego — normalizado se a soma das arestas de um nó ≠ 100% (FR-018). */
  weight: number;
};

export type Design = {
  nodes: DesignNode[];
  edges: DesignEdge[];
  /** Nó(s) por onde a carga externa entra no grafo. */
  entryNodeIds: NodeId[];
};

export type Workload = {
  /** λ — carga oferecida (rps). */
  rps: number;
  /** 0..1, fração de leitura. */
  readWriteRatio: number;
  payloadBytes: number;
  peakMultiplier: number;
};

export type NodeStatus = 'healthy' | 'warning' | 'saturated';

export type NodeResult = {
  /** λ que chega no nó, após propagação (FR-002) e efeito de cache (FR-008). */
  offeredLoad: number;
  /** c · μ */
  capacity: number;
  /** ρ = λ / (c·μ) — FR-003. */
  utilization: number;
  /** W do M/M/1 — FR-004. Valor sentinela quando ρ ≥ 1 (ver metrics/queue.ts). */
  queueLatencyMs: number;
  status: NodeStatus;
};

export type PathResult = {
  /** min(capacidade de cada nó no caminho), nunca > rps ofertado — FR-006. */
  throughputRps: number;
  bottleneckId: NodeId | null;
  latency: { p50: number; p95: number; p99: number };
};

export type ViolationType =
  | 'spof'
  | 'orphan-node'
  | 'cycle'
  | 'broken-edge-reference'
  | 'duplicate-node-id'
  | 'invalid-replica-count';

export type Violation = {
  type: ViolationType;
  nodeIds: NodeId[];
  edgeIds?: string[];
  /** Explicação legível, gerada pelo engine — nunca por LLM (constitution I). */
  message: string;
};

export type Dimension =
  | 'escalabilidade'
  | 'disponibilidade'
  | 'latencia'
  | 'consistencia'
  | 'custo'
  | 'complexidade_operacional'
  | 'seguranca';

export type SimulationResult = {
  nodes: Record<NodeId, NodeResult>;
  path: PathResult;
  violations: Violation[];
  cost: { monthlyTotal: number; byNode: Record<NodeId, number> };
  /**
   * PLACEHOLDER no M0 (FR-020): todas as 7 dimensões retornam 0.
   * Cálculo real de score por dimensão é escopo do M2 (docs/product-context.md §10).
   */
  scores: Record<Dimension, number>;
};

export const ALL_DIMENSIONS: readonly Dimension[] = [
  'escalabilidade',
  'disponibilidade',
  'latencia',
  'consistencia',
  'custo',
  'complexidade_operacional',
  'seguranca',
];
