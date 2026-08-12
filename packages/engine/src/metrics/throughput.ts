/**
 * Throughput real do caminho e gargalo — packages/engine/src/metrics/throughput.ts
 *
 * FR-006: throughput = min(carga ofertada, capacidade de cada nó no caminho) — nunca reportar
 * acima da carga ofertada.
 * FR-007: identifica o nó gargalo quando existir.
 */

import type { NodeId } from '../types.js';

export type NodeCapacity = { nodeId: NodeId; capacityRps: number };

export function calculateThroughput(
  offeredRps: number,
  pathNodeCapacities: readonly NodeCapacity[],
): { throughputRps: number; bottleneckId: NodeId | null } {
  if (pathNodeCapacities.length === 0) {
    return { throughputRps: offeredRps, bottleneckId: null };
  }

  let minCapacity = Infinity;
  let bottleneckId: NodeId | null = null;
  for (const { nodeId, capacityRps } of pathNodeCapacities) {
    if (capacityRps < minCapacity) {
      minCapacity = capacityRps;
      bottleneckId = nodeId;
    }
  }

  const throughputRps = Math.min(offeredRps, minCapacity);
  // Só há gargalo real quando algum nó limita abaixo da carga ofertada.
  const hasBottleneck = minCapacity < offeredRps;

  return { throughputRps, bottleneckId: hasBottleneck ? bottleneckId : null };
}
