/**
 * Caminho crítico (maior latência acumulada) — packages/engine/src/graph/critical-path.ts
 *
 * "O caminho" (FR-005, FR-006, FR-007) precisa ser uma sequência real de nós, não a soma de todo
 * nó alcançável — em um design com fan-out (ex.: LB → app-a e LB → app-b em paralelo), somar as
 * duas ramificações contaria latência paralela como se fosse sequencial. Este módulo resolve isso
 * com programação dinâmica sobre a ordem topológica (longest path em DAG, O(V+E)): encontra a
 * sequência de nós, a partir de um `entryNodeIds`, com a maior latência acumulada — o pior caminho
 * que uma requisição pode percorrer, que é o que interessa mostrar (gargalo, p99).
 *
 * Só considera nós alcançáveis a partir da entrada (graph/reachability.ts) — nó órfão nunca entra
 * no caminho crítico (FR-010).
 */

import type { Design, NodeId } from '../types.js';
import { filterValidEdges, groupOutgoingNodeIds } from './adjacency.js';
import { computeReachableNodeIds } from './reachability.js';
import { topologicalOrder } from './topology.js';

/**
 * @param design grafo já estruturalmente válido
 * @param nodeWeight peso (ex.: latência média) de cada nó, usado para escolher o pior caminho
 * @returns sequência ordenada de NodeId da entrada até o nó final do caminho crítico; [] se
 *          nenhum nó de entrada for alcançável
 */
export function findCriticalPath(
  design: Design,
  nodeWeight: (nodeId: NodeId) => number,
): NodeId[] {
  const reachable = computeReachableNodeIds(design);
  if (reachable.size === 0) return [];

  const nodeIds = design.nodes.map((node) => node.id).filter((id) => reachable.has(id));
  const edges = filterValidEdges(design.edges, reachable);
  const order = topologicalOrder(nodeIds, edges);
  // Posição de cada nó na ordem topológica — usada para ignorar arestas "de volta" de um ciclo
  // (ver comentário abaixo). Nós de ciclo são anexados ao final por topologicalOrder() em ordem
  // arbitrária; sem esta checagem, uma aresta de volta poderia sobrescrever o predecessor de um
  // nó de entrada e criar um ciclo nos próprios ponteiros de reconstrução do caminho.
  const position = new Map<NodeId, number>(order.map((id, index) => [id, index]));
  const outgoing = groupOutgoingNodeIds(edges);

  const dist = new Map<NodeId, number>();
  const predecessor = new Map<NodeId, NodeId | null>();

  for (const entryId of design.entryNodeIds) {
    if (reachable.has(entryId) && !dist.has(entryId)) {
      dist.set(entryId, nodeWeight(entryId));
      predecessor.set(entryId, null);
    }
  }

  for (const nodeId of order) {
    const currentDist = dist.get(nodeId);
    if (currentDist === undefined) continue; // nenhum caminho da entrada chega aqui ainda

    for (const nextId of outgoing.get(nodeId) ?? []) {
      // Só relaxa arestas que avançam na ordem topológica — uma aresta "de volta" (parte de um
      // ciclo) nunca é seguida aqui; o ciclo em si é sinalizado como Violation por
      // static-analysis.ts, não é papel deste módulo tentar resolvê-lo.
      // `nodeId` vem de `order` e `nextId` vem de uma aresta já filtrada por nós alcançáveis —
      // ambos sempre têm posição definida (assertion segura, não checagem defensiva alcançável).
      if (position.get(nextId)! <= position.get(nodeId)!) continue;

      const candidate = currentDist + nodeWeight(nextId);
      if (candidate > (dist.get(nextId) ?? -Infinity)) {
        dist.set(nextId, candidate);
        predecessor.set(nextId, nodeId);
      }
    }
  }

  // Percorre em ordem topológica (não a ordem de inserção do Map) e usa `>=`: em caso de empate
  // (comum quando dois nós seguidos estão ambos saturados, ambos com peso Infinity), o nó mais
  // profundo no grafo vence — o caminho reportado inclui todo o trecho a jusante do gargalo, não
  // para no primeiro nó saturado.
  // `endNode` nunca fica null aqui: `reachable.size > 0` (checado acima) implica que ao menos um
  // entryId ∈ nodeIds ∩ reachable, e o loop de inicialização de `dist` acima sempre popula esse
  // entryId — então o loop abaixo sempre encontra pelo menos um candidato.
  let endNode: NodeId | null = null;
  let maxDist = -Infinity;
  for (const nodeId of order) {
    const value = dist.get(nodeId);
    if (value !== undefined && value >= maxDist) {
      maxDist = value;
      endNode = nodeId;
    }
  }

  const path: NodeId[] = [];
  const visited = new Set<NodeId>();
  let current: NodeId | null = endNode;
  // `visited` é uma segunda camada de defesa (além da checagem de posição acima): garante que a
  // reconstrução termina mesmo que algum caso não previsto produza um predecessor cíclico.
  while (current !== null && !visited.has(current)) {
    path.push(current);
    visited.add(current);
    current = predecessor.get(current) ?? null;
  }
  return path.reverse();
}
