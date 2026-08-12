import { describe, expect, it } from 'vitest';
import { validateStructure } from '../../src/graph/validate.js';
import type { Design } from '../../src/types.js';

function baseDesign(): Design {
  return {
    entryNodeIds: ['lb-1'],
    nodes: [
      { id: 'lb-1', type: 'load_balancer', replicas: 1 },
      { id: 'app-1', type: 'app_server', replicas: 2 },
    ],
    edges: [{ id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 100 }],
  };
}

describe('validateStructure (FR-019)', () => {
  it('não retorna nenhuma violação para um design estruturalmente válido', () => {
    expect(validateStructure(baseDesign())).toEqual([]);
  });

  it('nunca lança exceção para entrada malformada', () => {
    const design = baseDesign();
    design.edges.push({ id: 'e-broken', from: 'app-1', to: 'nao-existe', kind: 'read', weight: 100 });
    expect(() => validateStructure(design)).not.toThrow();
  });

  it('detecta aresta cujo destino (to) referencia nó inexistente', () => {
    const design = baseDesign();
    design.edges.push({ id: 'e-broken', from: 'app-1', to: 'nao-existe', kind: 'read', weight: 100 });

    const violations = validateStructure(design);

    expect(violations).toContainEqual(
      expect.objectContaining({ type: 'broken-edge-reference', edgeIds: ['e-broken'] }),
    );
  });

  it('detecta aresta cuja origem (from) referencia nó inexistente', () => {
    const design = baseDesign();
    design.edges.push({ id: 'e-broken', from: 'nao-existe', to: 'app-1', kind: 'read', weight: 100 });

    const violations = validateStructure(design);

    expect(violations).toContainEqual(
      expect.objectContaining({ type: 'broken-edge-reference', edgeIds: ['e-broken'], nodeIds: ['nao-existe'] }),
    );
  });

  it('detecta IDs de nó duplicados (duplicate-node-id)', () => {
    const design = baseDesign();
    design.nodes.push({ id: 'lb-1', type: 'load_balancer', replicas: 1 });

    const violations = validateStructure(design);

    expect(violations).toContainEqual(
      expect.objectContaining({ type: 'duplicate-node-id', nodeIds: ['lb-1'] }),
    );
  });

  it.each([0, -1, 1.5])(
    'detecta contagem de réplicas inválida (invalid-replica-count) para replicas=%s',
    (replicas) => {
      const design = baseDesign();
      design.nodes[1]!.replicas = replicas;

      const violations = validateStructure(design);

      expect(violations).toContainEqual(
        expect.objectContaining({ type: 'invalid-replica-count', nodeIds: ['app-1'] }),
      );
    },
  );
});
