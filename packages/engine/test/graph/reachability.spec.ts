import { describe, expect, it } from 'vitest';
import { computeReachableNodeIds } from '../../src/graph/reachability.js';
import type { Design } from '../../src/types.js';

describe('computeReachableNodeIds', () => {
  it('inclui os nós de entrada e tudo alcançável a partir deles', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'app-1', type: 'app_server', replicas: 1 },
        { id: 'orfao', type: 'app_server', replicas: 1 },
      ],
      edges: [{ id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 100 }],
    };

    const reachable = computeReachableNodeIds(design);

    expect(reachable.has('lb-1')).toBe(true);
    expect(reachable.has('app-1')).toBe(true);
    expect(reachable.has('orfao')).toBe(false);
  });

  it('ignora arestas que referenciam nó inexistente sem lançar', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [{ id: 'lb-1', type: 'load_balancer', replicas: 1 }],
      edges: [{ id: 'e1', from: 'lb-1', to: 'nao-existe', kind: 'read', weight: 100 }],
    };

    expect(() => computeReachableNodeIds(design)).not.toThrow();
    expect(computeReachableNodeIds(design)).toEqual(new Set(['lb-1']));
  });

  it('não trava em grafo cíclico', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'app_server', replicas: 1 },
        { id: 'b', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'b', kind: 'read', weight: 100 },
        { id: 'e2', from: 'b', to: 'a', kind: 'read', weight: 100 },
      ],
    };

    const reachable = computeReachableNodeIds(design);
    expect(reachable).toEqual(new Set(['a', 'b']));
  });
});
