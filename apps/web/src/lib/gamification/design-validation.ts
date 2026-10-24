import type { Design, DesignEdge, DesignNode, EdgeKind } from '@sdp/engine';
import { isConnectableKind, isValidCanvasConnection } from '../connection-rules';

/**
 * Validação do design que chega ao servidor na submissão verificada (M2.8, research.md §3). O
 * servidor roda `simulate` + rubrica sobre entrada não confiável, então antes disso o design precisa
 * (a) ter a forma de um `Design`, (b) caber nos limites que contêm custo, e (c) obedecer a mesma
 * matriz de conexões do canvas — a rubrica avalia `(result, design)`, e uma topologia que o canvas
 * recusaria não pode resolver um desafio só porque foi montada à mão.
 */

export const DESIGN_LIMITS = { maxNodes: 60, maxEdges: 150, maxReplicas: 1000, maxIdLength: 64 } as const;

const EDGE_KINDS: Record<EdgeKind, true> = { read: true, write: true, async: true, replication: true };

export type DesignValidation = { ok: true; design: Design } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= DESIGN_LIMITS.maxIdLength;
}

function fail(reason: string): DesignValidation {
  return { ok: false, reason };
}

function parseNode(raw: unknown): DesignNode | string {
  if (!isRecord(raw) || !isValidId(raw.id)) return 'nó com id inválido';
  const { id, type, replicas, cacheHitRate } = raw;
  if (!isConnectableKind(type) || type === 'client') return `nó "${id}" com tipo desconhecido`;
  if (typeof replicas !== 'number' || !Number.isInteger(replicas) || replicas < 1 || replicas > DESIGN_LIMITS.maxReplicas) {
    return `nó "${id}" com réplicas fora de 1–${DESIGN_LIMITS.maxReplicas}`;
  }
  if (cacheHitRate === undefined) return { id, type, replicas };
  if (typeof cacheHitRate !== 'number' || !(cacheHitRate >= 0 && cacheHitRate <= 1)) {
    return `nó "${id}" com taxa de acerto fora de 0–1`;
  }
  return { id, type, replicas, cacheHitRate };
}

function parseEdge(raw: unknown): DesignEdge | string {
  if (!isRecord(raw) || !isValidId(raw.id)) return 'aresta com id inválido';
  const { id, from, to, kind, weight } = raw;
  if (!isValidId(from) || !isValidId(to)) return `aresta "${id}" com extremidade inválida`;
  if (typeof kind !== 'string' || !Object.hasOwn(EDGE_KINDS, kind)) return `aresta "${id}" com tipo desconhecido`;
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) return `aresta "${id}" com peso inválido`;
  return { id, from, to, kind: kind as EdgeKind, weight };
}

export function validateSubmittedDesign(raw: unknown): DesignValidation {
  if (!isRecord(raw) || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges) || !Array.isArray(raw.entryNodeIds)) {
    return fail('design fora do formato esperado');
  }
  if (raw.nodes.length === 0) return fail('design sem componentes');
  if (raw.nodes.length > DESIGN_LIMITS.maxNodes) return fail(`mais de ${DESIGN_LIMITS.maxNodes} componentes`);
  if (raw.edges.length > DESIGN_LIMITS.maxEdges) return fail(`mais de ${DESIGN_LIMITS.maxEdges} conexões`);

  const nodes: DesignNode[] = [];
  for (const rawNode of raw.nodes) {
    const node = parseNode(rawNode);
    if (typeof node === 'string') return fail(node);
    nodes.push(node);
  }
  const typeById = new Map(nodes.map((node) => [node.id, node.type]));
  if (typeById.size !== nodes.length) return fail('ids de componente repetidos');

  const edges: DesignEdge[] = [];
  for (const rawEdge of raw.edges) {
    const edge = parseEdge(rawEdge);
    if (typeof edge === 'string') return fail(edge);
    const sourceType = typeById.get(edge.from);
    const targetType = typeById.get(edge.to);
    if (!sourceType || !targetType) return fail(`aresta "${edge.id}" aponta pra um componente inexistente`);
    if (!isValidCanvasConnection(sourceType, targetType)) return fail(`conexão ${sourceType} → ${targetType} não é permitida`);
    edges.push(edge);
  }
  if (new Set(edges.map((edge) => edge.id)).size !== edges.length) return fail('ids de conexão repetidos');

  const entryNodeIds: string[] = [];
  for (const entry of raw.entryNodeIds) {
    const entryType = typeof entry === 'string' ? typeById.get(entry) : undefined;
    if (!entryType) return fail('entrada aponta pra um componente inexistente');
    if (!isValidCanvasConnection('client', entryType)) return fail(`o Cliente não pode se conectar a ${entryType}`);
    entryNodeIds.push(entry as string);
  }
  if (entryNodeIds.length === 0) return fail('design sem ponto de entrada (nenhum componente ligado ao Cliente)');

  return { ok: true, design: { nodes, edges, entryNodeIds } };
}
