/**
 * Análises estáticas do grafo — packages/engine/src/graph/static-analysis.ts
 *
 * Rodam sobre a estrutura do Design, sem depender de carga simulada (docs/foundational-doc.md
 * §3.2). FR-009 (SPOF), FR-010 (nó órfão), FR-011 (ciclo).
 */

import type { Design, NodeId, Violation } from '../types.js';
import { groupOutgoingNodeIds } from './adjacency.js';

/** SPOF (FR-009): nó alcançável com menos de 2 réplicas. Um por nó, para rastreabilidade. */
export function detectSpof(design: Design, reachable: ReadonlySet<NodeId>): Violation[] {
  return design.nodes
    .filter((node) => reachable.has(node.id) && node.replicas < 2)
    .map((node) => ({
      type: 'spof' as const,
      nodeIds: [node.id],
      message: `Nó '${node.id}' é ponto único de falha: apenas ${node.replicas} réplica(s) no caminho crítico`,
    }));
}

/** Nó órfão (FR-010): nó não alcançável a partir de `entryNodeIds` — vale zero. Um por nó. */
export function detectOrphanNodes(design: Design, reachable: ReadonlySet<NodeId>): Violation[] {
  return design.nodes
    .filter((node) => !reachable.has(node.id))
    .map((node) => ({
      type: 'orphan-node' as const,
      nodeIds: [node.id],
      message: `Nó '${node.id}' está desconectado do caminho da requisição — não pontua`,
    }));
}

/**
 * Ciclo (FR-011): DFS iterativo de 3 cores (research.md §4) sobre o subgrafo alcançável — nó
 * não-alcançável já é reportado separadamente como órfão e não pontua de qualquer forma.
 * Retorna no máximo uma Violation, com todos os nós que são membro de algum ciclo.
 */
export function detectCycle(design: Design, reachable: ReadonlySet<NodeId>): Violation[] {
  const nodeIds = design.nodes.map((node) => node.id).filter((id) => reachable.has(id));
  const validEdges = design.edges.filter(
    (edge) => reachable.has(edge.from) && reachable.has(edge.to),
  );
  const outgoing = groupOutgoingNodeIds(validEdges);

  const cycleMembers = findCycleMembers(nodeIds, outgoing);
  if (cycleMembers.size === 0) return [];

  return [
    {
      type: 'cycle',
      nodeIds: [...cycleMembers],
      message: `Ciclo detectado envolvendo: ${[...cycleMembers].join(', ')}`,
    },
  ];
}

const WHITE = 0; // não visitado
const GRAY = 1; // em processamento (na pilha atual)
const BLACK = 2; // processamento concluído

function findCycleMembers(
  nodeIds: readonly NodeId[],
  outgoing: ReadonlyMap<NodeId, NodeId[]>,
): Set<NodeId> {
  const color = new Map<NodeId, number>(nodeIds.map((id) => [id, WHITE]));
  const cycleMembers = new Set<NodeId>();

  for (const start of nodeIds) {
    if (color.get(start) !== WHITE) continue;

    // DFS iterativo (não recursivo, research.md §4): cada frame guarda o nó e o índice do
    // próximo vizinho a explorar, simulando a pilha de chamadas manualmente.
    const stack: { id: NodeId; nextNeighborIndex: number }[] = [{ id: start, nextNeighborIndex: 0 }];
    color.set(start, GRAY);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const neighbors = outgoing.get(frame.id) ?? [];

      if (frame.nextNeighborIndex >= neighbors.length) {
        color.set(frame.id, BLACK);
        stack.pop();
        continue;
      }

      const next = neighbors[frame.nextNeighborIndex]!;
      frame.nextNeighborIndex += 1;

      if (color.get(next) === GRAY) {
        // Aresta de volta para um nó ainda na pilha ⇒ ciclo. Todo nó da pilha a partir dele
        // (inclusive) é membro do ciclo.
        const cycleStartIndex = stack.findIndex((f) => f.id === next);
        for (let i = cycleStartIndex; i < stack.length; i++) {
          cycleMembers.add(stack[i]!.id);
        }
      } else if (color.get(next) === WHITE) {
        color.set(next, GRAY);
        stack.push({ id: next, nextNeighborIndex: 0 });
      }
      // color === BLACK: já totalmente processado, não é aresta de volta — ignora.
    }
  }

  return cycleMembers;
}
