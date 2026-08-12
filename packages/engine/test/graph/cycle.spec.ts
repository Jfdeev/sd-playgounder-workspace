import { describe, expect, it } from 'vitest';
import { detectCycle } from '../../src/graph/static-analysis.js';
import type { Design } from '../../src/types.js';

describe('detectCycle (FR-011)', () => {
  it('detecta um ciclo simples e reporta todos os membros', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'app_server', replicas: 1 },
        { id: 'b', type: 'app_server', replicas: 1 },
        { id: 'c', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'b', kind: 'read', weight: 100 },
        { id: 'e2', from: 'b', to: 'c', kind: 'read', weight: 100 },
        { id: 'e3', from: 'c', to: 'b', kind: 'read', weight: 100 },
      ],
    };
    const reachable = new Set(['a', 'b', 'c']);

    const violations = detectCycle(design, reachable);

    expect(violations).toHaveLength(1);
    expect(violations[0]!.type).toBe('cycle');
    expect(new Set(violations[0]!.nodeIds)).toEqual(new Set(['b', 'c']));
  });

  it('distingue membro do ciclo de nó apenas a jusante (não membro)', () => {
    // a → b ↔ c (ciclo b,c) → d (a jusante do ciclo, não é membro)
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'app_server', replicas: 1 },
        { id: 'b', type: 'app_server', replicas: 1 },
        { id: 'c', type: 'app_server', replicas: 1 },
        { id: 'd', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'b', kind: 'read', weight: 100 },
        { id: 'e2', from: 'b', to: 'c', kind: 'read', weight: 100 },
        { id: 'e3', from: 'c', to: 'b', kind: 'read', weight: 100 },
        { id: 'e4', from: 'c', to: 'd', kind: 'read', weight: 100 },
      ],
    };
    const reachable = new Set(['a', 'b', 'c', 'd']);

    const violations = detectCycle(design, reachable);

    const cycleNodeIds = new Set(violations[0]!.nodeIds);
    expect(cycleNodeIds.has('b')).toBe(true);
    expect(cycleNodeIds.has('c')).toBe(true);
    expect(cycleNodeIds.has('a')).toBe(false);
    expect(cycleNodeIds.has('d')).toBe(false);
  });

  it('não reporta nada para um grafo acíclico (DAG)', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'app_server', replicas: 1 },
        { id: 'b', type: 'app_server', replicas: 1 },
      ],
      edges: [{ id: 'e1', from: 'a', to: 'b', kind: 'read', weight: 100 }],
    };

    expect(detectCycle(design, new Set(['a', 'b']))).toEqual([]);
  });

  it('detecta auto-loop (nó com aresta para si mesmo) como ciclo de 1 membro', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [{ id: 'a', type: 'app_server', replicas: 1 }],
      edges: [{ id: 'e1', from: 'a', to: 'a', kind: 'read', weight: 100 }],
    };

    const violations = detectCycle(design, new Set(['a']));

    expect(violations).toHaveLength(1);
    expect(violations[0]!.nodeIds).toEqual(['a']);
  });
});
