import { describe, expect, it } from 'vitest';
import { detectSpof } from '../../src/graph/static-analysis.js';
import type { Design } from '../../src/types.js';

describe('detectSpof (FR-009)', () => {
  it('reporta SPOF para nó alcançável com apenas 1 réplica', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'db-1', type: 'sql_primary', replicas: 1 },
      ],
      edges: [{ id: 'e1', from: 'lb-1', to: 'db-1', kind: 'read', weight: 100 }],
    };
    const reachable = new Set(['lb-1', 'db-1']);

    const violations = detectSpof(design, reachable);

    expect(violations).toContainEqual(expect.objectContaining({ type: 'spof', nodeIds: ['lb-1'] }));
    expect(violations).toContainEqual(expect.objectContaining({ type: 'spof', nodeIds: ['db-1'] }));
  });

  it('não reporta SPOF para nó com 2+ réplicas (decisão do autor, spec.md Clarifications)', () => {
    const design: Design = {
      entryNodeIds: ['app-1'],
      nodes: [{ id: 'app-1', type: 'app_server', replicas: 2 }],
      edges: [],
    };
    const reachable = new Set(['app-1']);

    expect(detectSpof(design, reachable)).toEqual([]);
  });

  it('não reporta SPOF para nó não-alcançável (já é órfão, ver detectOrphanNodes)', () => {
    const design: Design = {
      entryNodeIds: ['app-1'],
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'orfao', type: 'app_server', replicas: 1 },
      ],
      edges: [],
    };
    const reachable = new Set(['app-1']);

    expect(detectSpof(design, reachable)).toEqual([]);
  });
});
