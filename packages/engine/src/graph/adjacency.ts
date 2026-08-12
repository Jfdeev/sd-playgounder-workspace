/**
 * Utilitário de adjacência compartilhado — packages/engine/src/graph/adjacency.ts
 *
 * Usado por propagate.ts, critical-path.ts, reachability.ts e static-analysis.ts — extraído
 * aqui para não duplicar a lógica (DRY).
 */

import type { DesignEdge, NodeId } from '../types.js';

/** Agrupa arestas por nó de origem — Map<from, DesignEdge[]>. */
export function groupOutgoingEdges(edges: readonly DesignEdge[]): Map<NodeId, DesignEdge[]> {
  const outgoing = new Map<NodeId, DesignEdge[]>();
  for (const edge of edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }
  return outgoing;
}

/** Agrupa apenas os IDs de destino por nó de origem — Map<from, NodeId[]>. */
export function groupOutgoingNodeIds(edges: readonly DesignEdge[]): Map<NodeId, NodeId[]> {
  const outgoing = new Map<NodeId, NodeId[]>();
  for (const edge of edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  }
  return outgoing;
}

/** Filtra o grafo para as arestas cujos dois extremos existem em `nodeIds`. */
export function filterValidEdges(
  edges: readonly DesignEdge[],
  nodeIds: ReadonlySet<NodeId>,
): DesignEdge[] {
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
}
