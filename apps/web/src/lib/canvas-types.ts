/**
 * Tipos de fronteira do canvas — apps/web/src/lib/canvas-types.ts
 *
 * Vocabulário do React Flow (nós/arestas do canvas), distinto do vocabulário do engine
 * (DesignNode/DesignEdge). Ver specs/canvas-submissao-m1/data-model.md.
 */

import type { ComponentType, EdgeKind } from '@sdp/engine';

export type ClientVariant = 'mobile' | 'web' | 'desktop';

export type ComputableFlowNode = {
  id: string;
  kind: 'component';
  componentType: ComponentType;
  position: { x: number; y: number };
  replicas: number;
  /** Só relevante quando componentType === 'cache'. */
  cacheHitRate?: number;
};

export type ClientFlowNode = {
  id: string;
  kind: 'client';
  variant: ClientVariant;
  position: { x: number; y: number };
};

export type FlowNode = ComputableFlowNode | ClientFlowNode;

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  /** Peso bruto digitado pelo usuário; ausente = peso implícito igual entre irmãs. */
  weight?: number;
};

/**
 * Payload de `data` dos nós/arestas nativos do React Flow (`Node<FlowNodeData>`,
 * `Edge<FlowEdgeData>`) — tudo de FlowNode/FlowEdge exceto `id`/`position` (nó) ou
 * `id`/`source`/`target` (aresta), que o React Flow já mantém como campos de topo (única fonte
 * de verdade durante drag/conexão — nunca duplicados dentro de `data`, para não dessincronizar).
 */
export type FlowNodeData = Omit<ComputableFlowNode, 'id' | 'position'> | Omit<ClientFlowNode, 'id' | 'position'>;
export type FlowEdgeData = Omit<FlowEdge, 'id' | 'source' | 'target'>;

/** Reconstrói o FlowNode "achatado" (usado pelo mapper puro) a partir do nó nativo do React Flow. */
export function toFlowNode(id: string, position: { x: number; y: number }, data: FlowNodeData): FlowNode {
  return { id, position, ...data } as FlowNode;
}

/** Reconstrói o FlowEdge "achatado" a partir da aresta nativa do React Flow. */
export function toFlowEdge(id: string, source: string, target: string, data: FlowEdgeData): FlowEdge {
  return { id, source, target, ...data };
}
