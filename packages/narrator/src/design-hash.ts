/**
 * Hash de cache do narrador — packages/narrator/src/design-hash.ts
 *
 * FR-005, research.md §3: mesmo par (Design, Workload) nunca gera uma chamada nova ao provedor de
 * LLM — a explicação fica cacheada em `narratorExplanations` (apps/web/src/db/schema.ts) por este
 * hash. Canonicaliza antes de hashear (nodes/edges ordenados por id) — dois designs logicamente
 * iguais mas serializados em ordem diferente (ex. depois de um undo/redo) MUST compartilhar cache.
 */

import type { Design, Workload } from '@sdp/engine';
import { NARRATOR_PROMPT_VERSION } from './prompt.js';

function canonicalizeDesign(design: Design): string {
  const nodes = [...design.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((node) => ({
      id: node.id,
      type: node.type,
      replicas: node.replicas,
      cacheHitRate: node.cacheHitRate ?? null,
    }));

  const edges = [...design.edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((edge) => ({ id: edge.id, from: edge.from, to: edge.to, kind: edge.kind, weight: edge.weight }));

  const entryNodeIds = [...design.entryNodeIds].sort();

  return JSON.stringify({ nodes, edges, entryNodeIds });
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash determinístico de (Design, Workload) — mesmo par lógico sempre gera o mesmo hash.
 *
 * `promptVersion` (M2.6, research.md §1.6) entra no material hasheado — o default já é a versão
 * atual do prompt, então uma explicação cacheada de antes de uma mudança de prompt nunca colide
 * com o cache novo pro mesmo design/workload (senão o cache serviria uma explicação sem citação,
 * por exemplo, mesmo depois do prompt passar a suportar citação).
 */
export async function hashDesign(
  design: Design,
  workload: Workload,
  promptVersion: number = NARRATOR_PROMPT_VERSION,
): Promise<string> {
  const canonical = `${canonicalizeDesign(design)}|${JSON.stringify(workload)}|v${promptVersion}`;
  return sha256Hex(canonical);
}
