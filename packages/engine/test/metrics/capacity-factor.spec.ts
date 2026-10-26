import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/index.js';
import { getComponentSpec } from '../../src/catalog/components.js';
import { isValidCapacityFactor } from '../../src/graph/validate.js';
import type { Design, Workload } from '../../src/types.js';

/** M3 — `capacityFactor` (pool de conexões esgotado): aditivo, só reduz a capacidade, nunca lança. */

const workload: Workload = { rps: 400, readWriteRatio: 0.8, payloadBytes: 1024, peakMultiplier: 1 };

function design(capacityFactor?: number): Design {
  const app = { id: 'app', type: 'app_server' as const, replicas: 2 };
  return {
    nodes: [capacityFactor === undefined ? app : { ...app, capacityFactor }, { id: 'db', type: 'sql_primary', replicas: 2 }],
    edges: [{ id: 'e1', from: 'app', to: 'db', kind: 'read', weight: 1 }],
    entryNodeIds: ['app'],
  };
}

describe('capacityFactor', () => {
  it('ausente ou 1 dá exatamente o mesmo resultado de antes', () => {
    expect(simulate(design(1), workload)).toEqual(simulate(design(), workload));
  });

  it('0.5 corta a capacidade do nó pela metade e dobra a utilização', () => {
    const full = simulate(design(), workload).nodes.app!;
    const half = simulate(design(0.5), workload).nodes.app!;
    expect(half.capacity).toBe(2 * getComponentSpec('app_server').maxThroughputRps * 0.5);
    expect(half.capacity).toBe(full.capacity / 2);
    expect(half.utilization).toBeCloseTo(full.utilization * 2);
  });

  it('pode saturar um nó que antes estava saudável', () => {
    expect(simulate(design(), workload).nodes.app!.status).not.toBe('saturated');
    expect(simulate(design(0.1), workload).nodes.app!.status).toBe('saturated');
  });

  it.each([0, -0.5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('fator inválido (%s) vira violação estrutural e é ignorado no cálculo', (factor) => {
    const result = simulate(design(factor), workload);
    expect(result.violations).toContainEqual(expect.objectContaining({ type: 'invalid-capacity-factor', nodeIds: ['app'] }));
    expect(result.nodes.app!.capacity).toBe(simulate(design(), workload).nodes.app!.capacity);
  });
});

describe('isValidCapacityFactor', () => {
  it('aceita (0, 1]', () => {
    expect([0.01, 0.5, 1].every(isValidCapacityFactor)).toBe(true);
    expect([0, -1, 1.01, Number.NaN].some(isValidCapacityFactor)).toBe(false);
  });
});
