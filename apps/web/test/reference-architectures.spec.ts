import { describe, expect, it } from 'vitest';
import { simulate, type Workload } from '@sdp/engine';
import { REFERENCE_ARCHITECTURES, toDesign, type ReferenceArchitecture } from '@sdp/knowledge';
import { isValidCanvasConnection } from '../src/lib/connection-rules';
import { designToCanvas } from '../src/lib/design-to-canvas';

// Carga ilustrativa — as violações estruturais (SPOF, órfão, ciclo, estrutura) não dependem dela.
const ILLUSTRATIVE_WORKLOAD: Workload = { rps: 500, readWriteRatio: 0.8, payloadBytes: 2048, peakMultiplier: 1 };

/** Arestas do preset que o canvas recusaria desenhar à mão (mais a do Cliente até cada entrada). */
function forbiddenEdges(preset: ReferenceArchitecture): string[] {
  const typeOf = new Map(preset.nodes.map((node) => [node.id, node.type]));
  const forbidden = preset.edges
    .filter((edge) => !isValidCanvasConnection(typeOf.get(edge.from)!, typeOf.get(edge.to)!))
    .map((edge) => `${edge.from} → ${edge.to}`);
  for (const entry of preset.entryNodeIds) {
    if (!isValidCanvasConnection('client', typeOf.get(entry)!)) forbidden.push(`client → ${entry}`);
  }
  return forbidden;
}

describe('arquiteturas de referência no canvas', () => {
  it('o teste acusa uma aresta proibida (senão passaria no vácuo)', () => {
    const preset = REFERENCE_ARCHITECTURES[0]!;
    const withForbidden: ReferenceArchitecture = {
      ...preset,
      edges: [...preset.edges, { id: 'bad', from: 'mysql-read-replicas', to: 'rails-monolith', kind: 'read', weight: 1, basis: 'inferida', sourceIds: [], note: 'x' }],
    };
    expect(forbiddenEdges(withForbidden)).toContain('mysql-read-replicas → rails-monolith');
  });

  it.each(REFERENCE_ARCHITECTURES.map((p) => [p.company, p] as const))(
    '%s: toda aresta é uma conexão permitida por connection-rules.ts',
    (_company, preset) => {
      expect(forbiddenEdges(preset)).toEqual([]);
    },
  );

  it.each(REFERENCE_ARCHITECTURES.map((p) => [p.company, p] as const))(
    '%s: simulate() devolve zero violações (FR-002, SC-003)',
    (_company, preset) => {
      expect(simulate(toDesign(preset), ILLUSTRATIVE_WORKLOAD).violations).toEqual([]);
    },
  );

  // Réplicas são ilustrativas: um preset que já nasce saturado na carga padrão do canvas livre
  // (1.000 rps) sugeriria um gargalo da empresa que nenhuma fonte afirma.
  it.each(REFERENCE_ARCHITECTURES.map((p) => [p.company, p] as const))(
    '%s: nenhum nó saturado na carga padrão do canvas livre',
    (_company, preset) => {
      const result = simulate(toDesign(preset), { ...ILLUSTRATIVE_WORKLOAD, rps: 1000 });
      const saturated = Object.entries(result.nodes).filter(([, node]) => node.status === 'saturated').map(([id]) => id);
      expect(saturated).toEqual([]);
    },
  );

  it.each(REFERENCE_ARCHITECTURES.map((p) => [p.company, p] as const))(
    '%s: designToCanvas preserva o id de cada nó (é o que liga a explicação ao nó)',
    (_company, preset) => {
      const canvasIds = new Set(designToCanvas(toDesign(preset)).nodes.map((node) => node.id));
      for (const node of preset.nodes) expect(canvasIds.has(node.id)).toBe(true);
    },
  );
});
