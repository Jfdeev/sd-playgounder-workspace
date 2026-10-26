import type { EdgeKind } from '@sdp/engine';
import type { ClientVariant, FlowEdgeData } from '../canvas-types';
import { isConnectableKind, isValidCanvasConnection, type ConnectableKind } from '../connection-rules';
import { DESIGN_LIMITS } from '../gamification/design-validation';
import type { SavedCanvas, SavedCanvasEdge, SavedCanvasNode } from './saved-canvas';

/**
 * Validação do conteúdo salvo que chega pela API (M4.1, FR-010, research §5). Mesmo rigor da submissão
 * do M2.8 — tipos conhecidos, limites, matriz de conexões (inclusive Cliente → componente) —, mas
 * aceitando rascunho: não exige ponto de entrada nem conexões. Remonta tudo campo a campo, então campo
 * extra (ex.: `capacityFactor`) nunca é guardado.
 */

export type SavedCanvasValidation = { ok: true; canvas: SavedCanvas } | { ok: false; reason: string };

const EDGE_KINDS: Record<EdgeKind, true> = { read: true, write: true, async: true, replication: true };
const CLIENT_VARIANTS: Record<ClientVariant, true> = { mobile: true, web: true, desktop: true };
const MAX_COORDINATE = 1_000_000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= DESIGN_LIMITS.maxIdLength;
const isCoordinate = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_COORDINATE;

function parseNode(raw: unknown): SavedCanvasNode | string {
  if (!isRecord(raw) || !isId(raw.id)) return 'nó com id inválido';
  const { id, position, data } = raw;
  if (!isRecord(position) || !isCoordinate(position.x) || !isCoordinate(position.y)) return `nó "${id}" com posição inválida`;
  if (!isRecord(data)) return `nó "${id}" sem dados`;
  const pos = { x: position.x, y: position.y };
  if (data.kind === 'client') {
    const variant = data.variant;
    if (typeof variant !== 'string' || !Object.hasOwn(CLIENT_VARIANTS, variant)) return `cliente "${id}" com variante inválida`;
    return { id, position: pos, data: { kind: 'client', variant: variant as ClientVariant } };
  }
  if (data.kind !== 'component') return `nó "${id}" de tipo desconhecido`;
  const { componentType, replicas, cacheHitRate } = data;
  if (!isConnectableKind(componentType) || componentType === 'client') return `nó "${id}" com componente desconhecido`;
  if (typeof replicas !== 'number' || !Number.isInteger(replicas) || replicas < 1 || replicas > DESIGN_LIMITS.maxReplicas) {
    return `nó "${id}" com réplicas fora de 1–${DESIGN_LIMITS.maxReplicas}`;
  }
  if (cacheHitRate === undefined) return { id, position: pos, data: { kind: 'component', componentType, replicas } };
  if (typeof cacheHitRate !== 'number' || !(cacheHitRate >= 0 && cacheHitRate <= 1)) return `nó "${id}" com taxa de acerto fora de 0–1`;
  return { id, position: pos, data: { kind: 'component', componentType, replicas, cacheHitRate } };
}

function parseEdge(raw: unknown): SavedCanvasEdge | string {
  if (!isRecord(raw) || !isId(raw.id) || !isId(raw.source) || !isId(raw.target) || !isRecord(raw.data)) return 'conexão inválida';
  const { kind, weight } = raw.data;
  if (typeof kind !== 'string' || !Object.hasOwn(EDGE_KINDS, kind)) return `conexão "${raw.id}" com tipo desconhecido`;
  if (weight !== undefined && (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0)) return `conexão "${raw.id}" com peso inválido`;
  const data: FlowEdgeData = weight === undefined ? { kind: kind as EdgeKind } : { kind: kind as EdgeKind, weight };
  return { id: raw.id, source: raw.source, target: raw.target, data };
}

export function validateSavedCanvas(raw: unknown): SavedCanvasValidation {
  if (!isRecord(raw) || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return { ok: false, reason: 'conteúdo fora do formato esperado' };
  if (raw.nodes.length === 0) return { ok: false, reason: 'canvas vazio' };
  if (raw.nodes.length > DESIGN_LIMITS.maxNodes) return { ok: false, reason: `mais de ${DESIGN_LIMITS.maxNodes} componentes` };
  if (raw.edges.length > DESIGN_LIMITS.maxEdges) return { ok: false, reason: `mais de ${DESIGN_LIMITS.maxEdges} conexões` };
  const presetId = raw.loadedPresetId ?? null;
  if (presetId !== null && !isId(presetId)) return { ok: false, reason: 'arquitetura de referência inválida' };

  const nodes: SavedCanvasNode[] = [];
  for (const rawNode of raw.nodes) {
    const node = parseNode(rawNode);
    if (typeof node === 'string') return { ok: false, reason: node };
    nodes.push(node);
  }
  const kindById = new Map<string, ConnectableKind>(nodes.map((n) => [n.id, n.data.kind === 'client' ? 'client' : n.data.componentType]));
  if (kindById.size !== nodes.length) return { ok: false, reason: 'ids de componente repetidos' };

  const edges: SavedCanvasEdge[] = [];
  for (const rawEdge of raw.edges) {
    const edge = parseEdge(rawEdge);
    if (typeof edge === 'string') return { ok: false, reason: edge };
    const source = kindById.get(edge.source);
    const target = kindById.get(edge.target);
    if (!source || !target) return { ok: false, reason: `conexão "${edge.id}" aponta pra um componente inexistente` };
    if (!isValidCanvasConnection(source, target)) return { ok: false, reason: `conexão ${source} → ${target} não é permitida` };
    edges.push(edge);
  }
  if (new Set(edges.map((e) => e.id)).size !== edges.length) return { ok: false, reason: 'ids de conexão repetidos' };

  return { ok: true, canvas: { nodes, edges, loadedPresetId: presetId } };
}

/** Nome do design: 1–80 caracteres depois de tirar espaços das pontas. */
export function normalizeDesignName(raw: unknown): { ok: true; name: string } | { ok: false; reason: string } {
  if (typeof raw !== 'string') return { ok: false, reason: 'Dê um nome ao design.' };
  const name = raw.trim();
  if (name.length === 0) return { ok: false, reason: 'Dê um nome ao design.' };
  if (name.length > 80) return { ok: false, reason: 'O nome pode ter no máximo 80 caracteres.' };
  return { ok: true, name };
}

/** Limites por conta (gate 2 do plan, aprovado pelo autor): acima disso salvar é recusado, nada é apagado. */
export const ACCOUNT_DESIGN_LIMITS = { maxDesigns: 50, maxVersionsPerDesign: 100 } as const;
