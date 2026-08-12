/**
 * Ordenação topológica compartilhada — packages/engine/src/graph/topology.ts
 *
 * Algoritmo de Kahn, iterativo, O(V+E) (research.md §4). Usado por graph/propagate.ts e
 * graph/critical-path.ts — extraído aqui para não duplicar a lógica (DRY).
 *
 * Nós que fazem parte de um ciclo não recebem uma posição topológica bem definida; são
 * anexados ao final, na ordem original, para que os módulos que consomem esta função ainda
 * processem todos os nós (ciclo em si é sinalizado como Violation por static-analysis.ts).
 */

import type { DesignEdge, NodeId } from '../types.js';

export function topologicalOrder(nodeIds: readonly NodeId[], edges: readonly DesignEdge[]): NodeId[] {
  const inDegree = new Map<NodeId, number>(nodeIds.map((id) => [id, 0]));
  const outgoing = new Map<NodeId, NodeId[]>();

  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  }

  const queue: NodeId[] = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const order: NodeId[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const next of outgoing.get(current) ?? []) {
      const remaining = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  if (order.length < nodeIds.length) {
    const visited = new Set(order);
    for (const id of nodeIds) {
      if (!visited.has(id)) order.push(id);
    }
  }

  return order;
}
