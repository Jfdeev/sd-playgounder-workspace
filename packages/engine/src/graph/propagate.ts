/**
 * Propagação de carga pelo grafo — packages/engine/src/graph/propagate.ts
 *
 * FR-002: distribui a carga oferecida a partir de `entryNodeIds`, dividindo o tráfego entre
 * arestas de saída de um nó proporcionalmente ao peso configurado.
 * FR-018: pesos que não somam 100% são normalizados proporcionalmente antes de propagar.
 * FR-008: um nó `cache` com `cacheHitRate` configurado retém a fração `h` da carga — só
 * `(1−h)` (carga_no_db) continua para os nós a jusante (metrics/cache.ts).
 *
 * Travessia iterativa (não recursiva) em ordem topológica — O(V+E), research.md §4. Nós que
 * fazem parte de um ciclo não têm ordem topológica bem definida; são anexados ao final e ainda
 * recebem carga de entrada se forem `entryNodeIds`, mas sua propagação de saída não é garantida
 * (ciclo é sinalizado como Violation por graph/static-analysis.ts, não é papel deste módulo).
 */

import { calculateDownstreamLoad } from '../metrics/cache.js';
import type { Design, NodeId } from '../types.js';
import { filterValidEdges, groupOutgoingEdges } from './adjacency.js';
import { topologicalOrder } from './topology.js';

/**
 * @param design grafo já estruturalmente válido (rodar validateStructure antes)
 * @param offeredRps λ total oferecido ao sistema
 * @returns carga (λ) que chega em cada nó, indexada por NodeId
 */
export function propagateLoad(design: Design, offeredRps: number): Record<NodeId, number> {
  const nodeIds = new Set(design.nodes.map((node) => node.id));
  const validEdges = filterValidEdges(design.edges, nodeIds);
  const nodeById = new Map(design.nodes.map((node) => [node.id, node]));

  const load: Record<NodeId, number> = {};
  for (const node of design.nodes) {
    load[node.id] = 0;
  }

  const entryIds = design.entryNodeIds.filter((id) => nodeIds.has(id));
  if (entryIds.length > 0) {
    const loadPerEntry = offeredRps / entryIds.length;
    for (const id of entryIds) {
      // `load[id]` já foi inicializado com 0 acima para todo id ∈ nodeIds, e entryIds é filtrado
      // por nodeIds.has(id) — a assertion é segura, não uma checagem defensiva de fato alcançável.
      load[id] = load[id]! + loadPerEntry;
    }
  }

  const outgoingByNode = groupOutgoingEdges(validEdges);
  const order = topologicalOrder(
    design.nodes.map((node) => node.id),
    validEdges,
  );

  for (const nodeId of order) {
    const outgoingEdges = outgoingByNode.get(nodeId);
    if (!outgoingEdges || outgoingEdges.length === 0) continue;

    const totalWeight = outgoingEdges.reduce((sum, edge) => sum + edge.weight, 0);
    if (totalWeight <= 0) continue;

    // `nodeId` vem de `order`, que cobre todo design.nodes — sempre inicializado acima.
    let outgoingLoad = load[nodeId]!;

    // FR-008: cache retém a fração `h`; só (1−h) segue para os nós a jusante.
    const node = nodeById.get(nodeId);
    if (node?.type === 'cache' && node.cacheHitRate !== undefined) {
      outgoingLoad = calculateDownstreamLoad(outgoingLoad, node.cacheHitRate);
    }

    for (const edge of outgoingEdges) {
      const normalizedShare = edge.weight / totalWeight; // FR-018
      // `load[edge.to]` já foi inicializado com 0 — edge.to ∈ nodeIds (validEdges é filtrado por
      // nodeIds.has(edge.to)). Mesma justificativa da assertion acima.
      load[edge.to] = load[edge.to]! + outgoingLoad * normalizedShare;
    }
  }

  return load;
}
