/**
 * API pública do engine — packages/engine/src/index.ts
 *
 * simulate(design, workload) → SimulationResult. Função pura, determinística, sem side effects
 * (constitution II, III). Nunca lança exceção (FR-019) — entrada malformada vira Violation.
 *
 * Ver specs/engine-puro-m0/contracts/engine-api.md para o contrato comportamental completo.
 */

import { getComponentSpec } from './catalog/components.js';
import { calculateCost } from './cost/calculate.js';
import { findCriticalPath } from './graph/critical-path.js';
import { propagateLoad } from './graph/propagate.js';
import { computeReachableNodeIds } from './graph/reachability.js';
import { detectCycle, detectOrphanNodes, detectSpof } from './graph/static-analysis.js';
import { validateStructure } from './graph/validate.js';
import { calculatePathLatency } from './metrics/latency.js';
import { calculateQueueWaitMs } from './metrics/queue.js';
import { calculateThroughput } from './metrics/throughput.js';
import { calculateUtilization } from './metrics/utilization.js';
import { calculateScores } from './scores/calculate.js';
import { ALL_DIMENSIONS } from './types.js';
import type { Design, NodeId, NodeResult, NodeStatus, SimulationResult, Workload } from './types.js';

export { ALL_DIMENSIONS };

/** ρ abaixo deste limiar é 'healthy'; entre este e 1 é 'warning'; ρ ≥ 1 é 'saturated'. */
const WARNING_UTILIZATION_THRESHOLD = 0.7;

/**
 * `scoreContext` (M2) — dados que só a camada de aplicação sabe (limiar de latência e custo de
 * referência vêm da rubrica/`referenceSolution` de um `Problem`, um conceito que `packages/engine`
 * não conhece — Constitution II). `simulate()` continua puro: recebe os dois números já resolvidos,
 * nunca busca um `Problem` sozinho. `null`/omitido = fora de um desafio (sandbox/"Simular") — as
 * dimensões Latência/Custo retornam 0 nesse caso (`scores/calculate.ts`).
 */
export function simulate(
  design: Design,
  workload: Workload,
  scoreContext?: { latencyBudgetMs?: number | null; referenceCostUsd?: number | null },
): SimulationResult {
  const reachable = computeReachableNodeIds(design);

  // FR-019: validação estrutural nunca lança; FR-009/FR-010/FR-011: análises estáticas rodam
  // sobre a estrutura, sem depender da carga simulada.
  const violations = [
    ...validateStructure(design),
    ...detectSpof(design, reachable),
    ...detectOrphanNodes(design, reachable),
    ...detectCycle(design, reachable),
  ];

  const nodeById = new Map(design.nodes.map((node) => [node.id, node]));
  const offeredLoadByNode = propagateLoad(design, workload.rps);

  const nodes: Record<NodeId, NodeResult> = {};
  for (const node of design.nodes) {
    const spec = getComponentSpec(node.type);
    const offeredLoad = offeredLoadByNode[node.id] ?? 0;
    const capacity = node.replicas * spec.maxThroughputRps;
    const utilization = calculateUtilization(offeredLoad, node.replicas, spec.maxThroughputRps);
    const queueLatencyMs = calculateQueueWaitMs(offeredLoad, capacity);

    nodes[node.id] = {
      offeredLoad,
      capacity,
      utilization,
      queueLatencyMs,
      status: statusFromUtilization(utilization),
    };
  }

  // FR-005: "o caminho" é o caminho crítico (maior latência acumulada) a partir da entrada —
  // evita somar ramos paralelos de um fan-out como se fossem sequenciais. Um nó saturado
  // (queueLatencyMs = Infinity) propaga Infinity aqui de propósito: isso garante que a DP sempre
  // escolhe um caminho que passa por um nó saturado como "o" caminho crítico quando um existir —
  // Infinity soma e compara corretamente em JS (nunca produz NaN neste fluxo, que só soma e
  // compara, nunca subtrai/divide Infinity).
  const nodeLatencyWeight = (nodeId: NodeId): number => {
    const result = nodes[nodeId];
    const node = nodeById.get(nodeId);
    if (!result || !node) return 0;
    const baseLatencyP50 = getComponentSpec(node.type).baseLatencyMs.p50;
    return baseLatencyP50 + result.queueLatencyMs;
  };
  const criticalPath = findCriticalPath(design, nodeLatencyWeight);

  // FR-012: aresta assíncrona sai do cálculo de latência do usuário. O caminho da latência é
  // escolhido num grafo SEM as arestas 'async' — escolher no grafo inteiro e cortar depois
  // deixava um ramo async pesado (fila → worker) vencer a DP e descartar o ramo síncrono real.
  const syncDesign: Design = { ...design, edges: design.edges.filter((edge) => edge.kind !== 'async') };
  const syncPath = findCriticalPath(syncDesign, nodeLatencyWeight);

  // FR-008: probabilidade de a requisição realmente passar por este nó. Cai para (1−h) em tudo
  // que vem depois de um cache com hit rate h; metrics/latency.ts decide, por percentil, se o nó
  // conta (limiar de cauda).
  let carriedProbability = 1;
  const latencyInputs = syncPath.map((nodeId) => {
    const reachProbability = carriedProbability;
    const designNode = nodeById.get(nodeId)!;
    if (designNode.type === 'cache' && designNode.cacheHitRate !== undefined) {
      carriedProbability *= 1 - designNode.cacheHitRate;
    }
    return {
      baseLatencyMs: getComponentSpec(designNode.type).baseLatencyMs,
      queueWaitMs: nodes[nodeId]!.queueLatencyMs,
      reachProbability,
    };
  });

  const latency = calculatePathLatency(latencyInputs);

  // FR-006/FR-007: capacidade é avaliada sobre todo nó alcançável (inclusive atrás de aresta
  // async — um worker saturado ainda limita o sistema), não só sobre o caminho crítico.
  const { throughputRps, bottleneckId } = calculateThroughput(
    workload.rps,
    [...reachable].map((nodeId) => ({ nodeId, utilization: nodes[nodeId]!.utilization })),
  );

  const cost = calculateCost(design, reachable);

  return {
    nodes,
    path: { throughputRps, bottleneckId, latency },
    violations,
    cost,
    scores: calculateScores({
      design,
      pathNodeIds: criticalPath,
      nodes,
      violations,
      cost,
      latencyP99Ms: latency.p99,
      latencyBudgetMs: scoreContext?.latencyBudgetMs ?? null,
      referenceCostUsd: scoreContext?.referenceCostUsd ?? null,
    }),
  };
}

function statusFromUtilization(utilization: number): NodeStatus {
  if (utilization >= 1) return 'saturated';
  if (utilization >= WARNING_UTILIZATION_THRESHOLD) return 'warning';
  return 'healthy';
}

export type {
  ComponentType,
  Design,
  DesignEdge,
  DesignNode,
  Dimension,
  EdgeKind,
  NodeId,
  NodeResult,
  NodeStatus,
  PathResult,
  SimulationResult,
  Violation,
  ViolationType,
  Workload,
} from './types.js';
