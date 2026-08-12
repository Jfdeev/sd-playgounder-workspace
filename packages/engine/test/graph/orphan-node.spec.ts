import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/index.js';
import { detectOrphanNodes } from '../../src/graph/static-analysis.js';
import type { Design, Workload } from '../../src/types.js';

describe('detectOrphanNodes (FR-010)', () => {
  it('reporta nó não alcançável a partir da entrada', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 2 },
        { id: 'cache-jogado-no-canvas', type: 'cache', replicas: 2 },
      ],
      edges: [],
    };
    const reachable = new Set(['lb-1']);

    const violations = detectOrphanNodes(design, reachable);

    expect(violations).toContainEqual(
      expect.objectContaining({ type: 'orphan-node', nodeIds: ['cache-jogado-no-canvas'] }),
    );
  });

  it('não reporta nó alcançável', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [{ id: 'lb-1', type: 'load_balancer', replicas: 2 }],
      edges: [],
    };
    expect(detectOrphanNodes(design, new Set(['lb-1']))).toEqual([]);
  });
});

describe('nó órfão vale zero — integração via simulate() (regra anti-decoreba, constitution IV)', () => {
  it('nó órfão não contribui para custo nem aparece no caminho', () => {
    const design: Design = {
      entryNodeIds: ['app-1'],
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'cache-orfao', type: 'cache', replicas: 2 },
      ],
      edges: [],
    };
    const workload: Workload = { rps: 100, readWriteRatio: 0.9, payloadBytes: 1024, peakMultiplier: 1 };

    const result = simulate(design, workload);

    expect(result.violations).toContainEqual(
      expect.objectContaining({ type: 'orphan-node', nodeIds: ['cache-orfao'] }),
    );
    expect(result.cost.byNode['cache-orfao']).toBeUndefined();
  });
});
