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
import { ALL_DIMENSIONS } from './types.js';
import type { Design, Dimension, NodeId, NodeResult, NodeStatus, SimulationResult, Workload } from './types.js';

/** ρ abaixo deste limiar é 'healthy'; entre este e 1 é 'warning'; ρ ≥ 1 é 'saturated'. */
const WARNING_UTILIZATION_THRESHOLD = 0.7;

export function simulate(design: Design, workload: Workload): SimulationResult {
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

  // FR-005/FR-006/FR-007: "o caminho" é o caminho crítico (maior latência acumulada) a partir da
  // entrada — evita somar ramos paralelos de um fan-out como se fossem sequenciais. Um nó
  // saturado (queueLatencyMs = Infinity) propaga Infinity aqui de propósito: isso garante que a
  // DP sempre escolhe um caminho que passa por um nó saturado como "o" caminho crítico quando um
  // existir — Infinity soma e compara corretamente em JS (nunca produz NaN neste fluxo, que só
  // soma e compara, nunca subtrai/divide Infinity).
  const criticalPath = findCriticalPath(design, (nodeId) => {
    const result = nodes[nodeId];
    const node = nodeById.get(nodeId);
    if (!result || !node) return 0;
    const baseLatencyP50 = getComponentSpec(node.type).baseLatencyMs.p50;
    return baseLatencyP50 + result.queueLatencyMs;
  });

  const pathNodeResults = criticalPath.map((nodeId) => ({
    nodeId,
    node: nodes[nodeId]!,
    baseLatencyMs: getComponentSpec(nodeById.get(nodeId)!.type).baseLatencyMs,
  }));

  // FR-012: aresta assíncrona sai do cálculo de latência do usuário — tudo a jusante de uma
  // aresta 'async' no caminho não bloqueia a resposta ao usuário, então não soma na latência
  // (mas ainda conta para throughput/gargalo abaixo, que é uma preocupação de capacidade, não de
  // latência percebida).
  const syncPathLength = truncateAtFirstAsyncEdge(design, criticalPath).length;
  const syncPath = pathNodeResults.slice(0, syncPathLength);

  // FR-008: peso = probabilidade de a requisição realmente passar por este nó. Cai para
  // (1−h) em tudo que vem depois de um cache com hit rate h — generaliza
  // latência_efetiva = h·L_cache + (1−h)·(L_cache+L_db) para o caminho inteiro (metrics/latency.ts).
  let carriedWeight = 1;
  const latencyInputs = syncPath.map(({ nodeId, node, baseLatencyMs }) => {
    const weight = carriedWeight;
    const designNode = nodeById.get(nodeId);
    if (designNode?.type === 'cache' && designNode.cacheHitRate !== undefined) {
      carriedWeight *= 1 - designNode.cacheHitRate;
    }
    return { baseLatencyMs, queueWaitMs: node.queueLatencyMs, weight };
  });

  const latency = calculatePathLatency(latencyInputs);

  const { throughputRps, bottleneckId } = calculateThroughput(
    workload.rps,
    pathNodeResults.map(({ nodeId, node }) => ({ nodeId, capacityRps: node.capacity })),
  );

  return {
    nodes,
    path: { throughputRps, bottleneckId, latency },
    violations,
    cost: calculateCost(design, reachable),
    scores: placeholderScores(),
  };
}

/**
 * FR-012: retorna o prefixo de `path` até (e incluindo) o nó imediatamente antes da primeira
 * aresta marcada como assíncrona — o restante do caminho não conta para a latência do usuário.
 * Se não houver aresta assíncrona no caminho, retorna o caminho inteiro.
 */
function truncateAtFirstAsyncEdge(design: Design, path: readonly NodeId[]): NodeId[] {
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]!;
    const to = path[i + 1]!;
    const isAsync = design.edges.some((edge) => edge.from === from && edge.to === to && edge.kind === 'async');
    if (isAsync) {
      return path.slice(0, i + 1);
    }
  }
  return [...path];
}

function statusFromUtilization(utilization: number): NodeStatus {
  if (utilization >= 1) return 'saturated';
  if (utilization >= WARNING_UTILIZATION_THRESHOLD) return 'warning';
  return 'healthy';
}

/** FR-020: placeholder — cálculo real de score por dimensão é escopo do M2. */
function placeholderScores(): Record<Dimension, number> {
  return Object.fromEntries(ALL_DIMENSIONS.map((dimension) => [dimension, 0])) as Record<
    Dimension,
    number
  >;
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
