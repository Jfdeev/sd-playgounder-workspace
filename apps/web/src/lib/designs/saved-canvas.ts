import type { FlowEdgeData, FlowNodeData } from '../canvas-types';

/**
 * Formato salvo de um design na conta (M4.1, research §1): o canvas inteiro — nós com posição, nós
 * Cliente, arestas com tipo/peso e o vínculo com uma arquitetura de referência —, não só o `Design` do
 * engine, que perderia posição e Cliente. Nunca guarda o que é efêmero (resultado da simulação,
 * seleção). Conversão pura nos dois sentidos com o estado do canvas.
 */

export type SavedCanvasNode = { id: string; position: { x: number; y: number }; data: FlowNodeData };
export type SavedCanvasEdge = { id: string; source: string; target: string; data: FlowEdgeData };
export type SavedCanvas = { nodes: SavedCanvasNode[]; edges: SavedCanvasEdge[]; loadedPresetId: string | null };

type CanvasNodeLike = { id: string; position: { x: number; y: number }; data: FlowNodeData };
type CanvasEdgeLike = { id: string; source: string; target: string; data?: FlowEdgeData };

function stripEphemeral(data: FlowNodeData): FlowNodeData {
  if (data.kind === 'client') return { kind: 'client', variant: data.variant };
  const { componentType, replicas, cacheHitRate } = data;
  return cacheHitRate === undefined
    ? { kind: 'component', componentType, replicas }
    : { kind: 'component', componentType, replicas, cacheHitRate };
}

export function toSavedCanvas(
  nodes: readonly CanvasNodeLike[],
  edges: readonly CanvasEdgeLike[],
  loadedPresetId: string | null,
): SavedCanvas {
  return {
    nodes: nodes.map((n) => ({ id: n.id, position: { x: n.position.x, y: n.position.y }, data: stripEphemeral(n.data) })),
    edges: edges.map((e) => {
      const data = e.data ?? { kind: 'read' };
      return { id: e.id, source: e.source, target: e.target, data: data.weight === undefined ? { kind: data.kind } : { kind: data.kind, weight: data.weight } };
    }),
    loadedPresetId,
  };
}

/** Nós/arestas no formato que `loadDesign` da store do canvas espera. */
export function fromSavedCanvas(saved: SavedCanvas) {
  return {
    nodes: saved.nodes.map((n) => ({ id: n.id, type: n.data.kind, position: { ...n.position }, data: { ...n.data } })),
    edges: saved.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: 'typed' as const, data: { ...e.data } })),
  };
}

/** JSON canônico (nós e arestas por id, chaves em ordem fixa) — base do hash de "nada mudou". */
export function canonicalSavedCanvas(saved: SavedCanvas): string {
  const byId = <T extends { id: string }>(items: readonly T[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({
    nodes: byId(saved.nodes).map((n) => ({ id: n.id, x: n.position.x, y: n.position.y, data: canonicalData(n.data) })),
    edges: byId(saved.edges).map((e) => ({ id: e.id, source: e.source, target: e.target, kind: e.data.kind, weight: e.data.weight ?? null })),
    loadedPresetId: saved.loadedPresetId,
  });
}

function canonicalData(data: FlowNodeData) {
  return data.kind === 'client'
    ? { kind: 'client', variant: data.variant }
    : { kind: 'component', componentType: data.componentType, replicas: data.replicas, cacheHitRate: data.cacheHitRate ?? null };
}

export async function contentHash(saved: SavedCanvas): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalSavedCanvas(saved));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
