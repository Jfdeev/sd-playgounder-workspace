import type { Design, DesignNode, NodeId } from '@sdp/engine';
import { replicasInZone, type Zone } from './zones.js';

/**
 * Falhas do Modo Incidente (M3, research.md §2): funções puras e **relativas** sobre um `Design`.
 * Relativas porque a mesma falha é aplicada ao design do incidente (estado "durante") e ao design que
 * o usuário submete como fix — "perde 2 instâncias" deixa corrigir com mais réplicas; "fica com 1" não.
 * Um componente que fica sem instâncias é **removido com suas conexões** em vez de ganhar
 * `replicas: 0`, que viraria uma violação citando o nó e entregaria a causa na tela.
 */

export const FAULT_TYPES = ['node-down', 'zone-down', 'partition', 'cache-cold', 'pool-exhausted'] as const;
export type FaultType = (typeof FAULT_TYPES)[number];

export type Fault =
  | { type: 'node-down'; target: NodeId; lostInstances: number }
  | { type: 'zone-down'; target: NodeId; zone: Zone }
  | { type: 'partition'; target: NodeId; cutFrom: NodeId }
  | { type: 'cache-cold'; target: NodeId }
  | { type: 'pool-exhausted'; target: NodeId; capacityFactor: number };

export function isFaultType(value: unknown): value is FaultType {
  return typeof value === 'string' && (FAULT_TYPES as readonly string[]).includes(value);
}

function withoutNodes(design: Design, removed: ReadonlySet<NodeId>): Design {
  if (removed.size === 0) return design;
  return {
    nodes: design.nodes.filter((node) => !removed.has(node.id)),
    edges: design.edges.filter((edge) => !removed.has(edge.from) && !removed.has(edge.to)),
    entryNodeIds: design.entryNodeIds.filter((id) => !removed.has(id)),
  };
}

/** Tira `lost(node)` instâncias de cada nó; quem chega a zero sai do design. */
function loseInstances(design: Design, lost: (node: DesignNode) => number): Design {
  const removed = new Set<NodeId>();
  const nodes = design.nodes.map((node) => {
    const remaining = node.replicas - lost(node);
    if (remaining <= 0) removed.add(node.id);
    return remaining === node.replicas ? node : { ...node, replicas: remaining };
  });
  return withoutNodes({ ...design, nodes }, removed);
}

function patchTarget(design: Design, target: NodeId, patch: (node: DesignNode) => DesignNode): Design {
  return { ...design, nodes: design.nodes.map((node) => (node.id === target ? patch(node) : node)) };
}

export function applyFault(design: Design, fault: Fault): Design {
  switch (fault.type) {
    case 'node-down':
      return loseInstances(design, (node) => (node.id === fault.target ? fault.lostInstances : 0));
    case 'zone-down':
      return loseInstances(design, (node) => replicasInZone(node.replicas, fault.zone));
    case 'partition':
      return {
        ...design,
        edges: design.edges.filter(
          (edge) =>
            !((edge.from === fault.cutFrom && edge.to === fault.target) || (edge.from === fault.target && edge.to === fault.cutFrom)),
        ),
      };
    case 'cache-cold':
      return patchTarget(design, fault.target, (node) => ({ ...node, cacheHitRate: 0 }));
    case 'pool-exhausted':
      return patchTarget(design, fault.target, (node) => ({
        ...node,
        capacityFactor: Math.min(node.capacityFactor ?? 1, fault.capacityFactor),
      }));
  }
}
