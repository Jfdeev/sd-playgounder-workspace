import type { ComponentType, Design, EdgeKind } from '@sdp/engine';
import { GITHUB_PRESET } from './presets/github.js';

/**
 * Arquiteturas de referência (M2.5) — presets de empresas reais, pesquisados previamente e
 * aprovados pelo autor (FR-008). Dado puro: o `Design` do preset usa só o catálogo existente; o
 * resto (fontes, explicação por componente, base de cada conexão, limitações) é texto que a UI
 * exibe. Nenhum número aqui é métrica da empresa — réplicas são ilustrativas salvo fonte explícita.
 */

/** Fonte web — distinta do `Source` do M2.6 (livro + autor). */
export type WebSource = {
  id: string;
  title: string;
  /** Publicador primário; vendor/terceiro só se declarado como tal. */
  publisher: string;
  url: string;
  /** Data ISO em que a página foi lida — a fonte pode mudar ou sair do ar. */
  accessedAt: string;
};

export type PresetNode = {
  /** Vira o id do nó no canvas (`designToCanvas` preserva) — é o que liga a explicação ao nó. */
  id: string;
  type: ComponentType;
  replicas: number;
  label: string;
  sourceIds: readonly string[];
  /** Quando o tipo do catálogo é só uma aproximação do componente real. */
  approximation?: string;
  /** Réplicas são ilustrativas por padrão; só ficam `false` se uma fonte der o número. */
  replicasIllustrative: boolean;
  /** Obrigatório quando `replicasIllustrative === false`. */
  replicasSourceId?: string;
  explanation: { text: string; sourceIds: readonly string[] };
};

export type PresetEdge = {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  weight: number;
  /** `afirmada`: uma fonte lida diz isso. `inferida`: consequência do que as fontes dizem, nunca dita. */
  basis: 'afirmada' | 'inferida';
  /** Obrigatório (>= 1) quando `basis === 'afirmada'`. */
  sourceIds: readonly string[];
  /** Por que é inferida / o que a aresta colapsa. Obrigatório quando `basis === 'inferida'`. */
  note?: string;
};

export type ReferenceArchitecture = {
  id: string;
  company: string;
  summary: string;
  sources: readonly WebSource[];
  nodes: readonly PresetNode[];
  edges: readonly PresetEdge[];
  entryNodeIds: readonly string[];
  /** O que o simulador não modela / simplificou — sempre >= 1 item, exibido no preset. */
  limitations: readonly string[];
};

export const REFERENCE_ARCHITECTURES: readonly ReferenceArchitecture[] = [GITHUB_PRESET];

export function getReferenceArchitecture(id: string): ReferenceArchitecture | undefined {
  return REFERENCE_ARCHITECTURES.find((preset) => preset.id === id);
}

/** Projeção pura pro `Design` do engine — descarta explicação, fonte e `basis`. */
export function toDesign(preset: ReferenceArchitecture): Design {
  return {
    nodes: preset.nodes.map((node) => ({ id: node.id, type: node.type, replicas: node.replicas })),
    edges: preset.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      kind: edge.kind,
      weight: edge.weight,
    })),
    entryNodeIds: [...preset.entryNodeIds],
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

function duplicates(ids: readonly string[]): string[] {
  return ids.filter((id, index) => ids.indexOf(id) !== index);
}

/**
 * Os 7 invariantes de data-model.md. Pura; devolve a lista de violações (vazia = preset válido) —
 * um preset que viole qualquer um não pode ir pro catálogo (FR-002/003/006).
 */
export function validateReferenceArchitecture(preset: ReferenceArchitecture): string[] {
  const errors: string[] = [];
  const sourceIds = new Set(preset.sources.map((source) => source.id));
  const nodeIds = new Set(preset.nodes.map((node) => node.id));
  const checkSources = (where: string, ids: readonly string[]) => {
    for (const id of ids) if (!sourceIds.has(id)) errors.push(`${where}: fonte "${id}" não existe no preset`);
  };

  // 1. ids únicos
  if (preset.id.trim() === '') errors.push('preset sem id');
  for (const id of duplicates(preset.nodes.map((node) => node.id))) errors.push(`nó "${id}" duplicado`);
  for (const id of duplicates(preset.edges.map((edge) => edge.id))) errors.push(`aresta "${id}" duplicada`);
  for (const id of duplicates(preset.sources.map((source) => source.id))) errors.push(`fonte "${id}" duplicada`);

  // 2. fontes existentes; todo nó com fonte e explicação
  for (const node of preset.nodes) {
    if (node.sourceIds.length === 0) errors.push(`nó "${node.id}" sem fonte`);
    if (node.explanation.text.trim() === '') errors.push(`nó "${node.id}" sem explicação`);
    if (node.explanation.sourceIds.length === 0) errors.push(`explicação do nó "${node.id}" sem fonte`);
    checkSources(`nó "${node.id}"`, node.sourceIds);
    checkSources(`explicação do nó "${node.id}"`, node.explanation.sourceIds);
  }

  // 3. toda aresta com basis; afirmada ⇒ fonte; inferida ⇒ note
  for (const edge of preset.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) errors.push(`aresta "${edge.id}" liga nó inexistente`);
    if (edge.basis !== 'afirmada' && edge.basis !== 'inferida') errors.push(`aresta "${edge.id}" sem basis`);
    if (edge.basis === 'afirmada' && edge.sourceIds.length === 0) errors.push(`aresta afirmada "${edge.id}" sem fonte`);
    if (edge.basis === 'inferida' && (edge.note ?? '').trim() === '') errors.push(`aresta inferida "${edge.id}" sem note`);
    checkSources(`aresta "${edge.id}"`, edge.sourceIds);
  }

  // 4. toda aresta inferida citada pelo id em limitations
  for (const edge of preset.edges) {
    if (edge.basis !== 'inferida') continue;
    const cited = preset.limitations.some((limitation) => new RegExp(`\\b${edge.id}\\b`).test(limitation));
    if (!cited) errors.push(`aresta inferida "${edge.id}" não aparece nas limitações`);
  }

  // 5. limitations não vazio; entryNodeIds ⊆ nós
  if (preset.limitations.length === 0) errors.push('preset sem limitações');
  if (preset.entryNodeIds.length === 0) errors.push('preset sem nó de entrada');
  for (const id of preset.entryNodeIds) if (!nodeIds.has(id)) errors.push(`entrada "${id}" não é um nó do preset`);

  // 6. réplicas não ilustrativas ⇒ fonte do número
  for (const node of preset.nodes) {
    if (node.replicasIllustrative) continue;
    if (!node.replicasSourceId) errors.push(`nó "${node.id}" com réplicas reais sem replicasSourceId`);
    else checkSources(`réplicas do nó "${node.id}"`, [node.replicasSourceId]);
  }

  // 7. URL https e data ISO
  for (const source of preset.sources) {
    if (!source.url.startsWith('https://')) errors.push(`fonte "${source.id}" sem https`);
    if (!isValidIsoDate(source.accessedAt)) errors.push(`fonte "${source.id}" com accessedAt inválido`);
  }

  return errors;
}
