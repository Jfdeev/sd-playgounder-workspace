/**
 * Custo mensal — packages/engine/src/cost/calculate.ts
 *
 * FR-013: custo por nó (réplicas × custo unitário do catálogo) e total. Nó órfão (FR-010) é
 * excluído — não entra em `byNode` nem no total, "vale zero".
 */

import { getComponentSpec } from '../catalog/components.js';
import type { Design, NodeId } from '../types.js';

export function calculateCost(
  design: Design,
  reachable: ReadonlySet<NodeId>,
): { monthlyTotal: number; byNode: Record<NodeId, number> } {
  const byNode: Record<NodeId, number> = {};
  let monthlyTotal = 0;

  for (const node of design.nodes) {
    if (!reachable.has(node.id)) continue; // FR-010: nó órfão não pontua

    const spec = getComponentSpec(node.type);
    const nodeCost = node.replicas * spec.monthlyCostUsd;
    byNode[node.id] = nodeCost;
    monthlyTotal += nodeCost;
  }

  return { monthlyTotal, byNode };
}
