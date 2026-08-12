import { describe, expect, it } from 'vitest';
import { simulate } from '../src/index.js';
import type { Design, Workload } from '../src/types.js';

/**
 * Valida que o exemplo de specs/engine-puro-m0/quickstart.md §3 produz exatamente o resultado
 * documentado ali (T051) — se este teste quebrar, o quickstart.md está desatualizado.
 */
describe('quickstart.md — exemplo de uso mínimo', () => {
  const design: Design = {
    entryNodeIds: ['lb-1'],
    nodes: [
      { id: 'lb-1', type: 'load_balancer', replicas: 1 },
      { id: 'app-1', type: 'app_server', replicas: 2 },
      { id: 'db-1', type: 'sql_primary', replicas: 1 },
    ],
    edges: [
      { id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 100 },
      { id: 'e2', from: 'app-1', to: 'db-1', kind: 'read', weight: 100 },
    ],
  };
  const workload: Workload = { rps: 300, readWriteRatio: 0.9, payloadBytes: 2048, peakMultiplier: 1 };

  const result = simulate(design, workload);

  it('não tem gargalo — toda capacidade do caminho (10000/1000/1000) excede a carga (300)', () => {
    expect(result.path.bottleneckId).toBeNull();
    expect(result.path.throughputRps).toBe(300);
  });

  it('reporta SPOF para lb-1 e db-1 (1 réplica cada) — não para app-1 (2 réplicas)', () => {
    const spofNodeIds = result.violations.filter((v) => v.type === 'spof').flatMap((v) => v.nodeIds);
    expect(new Set(spofNodeIds)).toEqual(new Set(['lb-1', 'db-1']));
  });
});
