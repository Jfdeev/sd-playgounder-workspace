/**
 * Alcançabilidade a partir dos nós de entrada — packages/engine/src/graph/reachability.ts
 *
 * BFS iterativo, O(V+E). Usado por graph/critical-path.ts (para não incluir nó órfão no
 * caminho crítico) e por graph/static-analysis.ts (FR-010, nó órfão).
 */

import type { Design, NodeId } from '../types.js';
import { filterValidEdges, groupOutgoingNodeIds } from './adjacency.js';

export function computeReachableNodeIds(design: Design): Set<NodeId> {
  const nodeIds = new Set(design.nodes.map((node) => node.id));
  const validEdges = filterValidEdges(design.edges, nodeIds);
  const outgoing = groupOutgoingNodeIds(validEdges);

  const reachable = new Set<NodeId>();
  const queue: NodeId[] = design.entryNodeIds.filter((id) => nodeIds.has(id));
  for (const id of queue) reachable.add(id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of outgoing.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  return reachable;
}
