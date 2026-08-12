import { describe, expect, it } from 'vitest';
import { simulate } from '../src/index.js';
import { ALL_DIMENSIONS } from '../src/types.js';
import type { Design, Workload } from '../src/types.js';

describe('placeholder de scores (FR-020)', () => {
  const design: Design = {
    entryNodeIds: ['app-1'],
    nodes: [{ id: 'app-1', type: 'app_server', replicas: 2 }],
    edges: [],
  };
  const workload: Workload = { rps: 100, readWriteRatio: 0.9, payloadBytes: 1024, peakMultiplier: 1 };

  it('retorna as 7 dimensões de score, todas zeradas', () => {
    const result = simulate(design, workload);

    for (const dimension of ALL_DIMENSIONS) {
      expect(result.scores[dimension]).toBe(0);
    }
    expect(Object.keys(result.scores).sort()).toEqual([...ALL_DIMENSIONS].sort());
  });
});
