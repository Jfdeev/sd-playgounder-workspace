import type { ComponentType } from '@sdp/engine';
import { isValidCanvasConnection } from '../src/lib/connection-rules';

type DesignLike = {
  nodes: readonly { id: string; type: ComponentType }[];
  edges: readonly { from: string; to: string }[];
  entryNodeIds: readonly string[];
};

/** Arestas que o canvas recusaria desenhar à mão (mais a do Cliente até cada entrada). */
export function forbiddenEdges(design: DesignLike): string[] {
  const typeOf = new Map(design.nodes.map((node) => [node.id, node.type]));
  const forbidden = design.edges
    .filter((edge) => !isValidCanvasConnection(typeOf.get(edge.from)!, typeOf.get(edge.to)!))
    .map((edge) => `${edge.from} → ${edge.to}`);
  for (const entry of design.entryNodeIds) {
    if (!isValidCanvasConnection('client', typeOf.get(entry)!)) forbidden.push(`client → ${entry}`);
  }
  return forbidden;
}
