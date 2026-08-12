import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/index.js';
import type { Design, Workload } from '../../src/types.js';

/**
 * Design de referência C — integra cache + custo + SPOF num único design (SC-001, FR-015).
 *
 * lb-1 (load_balancer, 2 réplicas, μ=10 000, US$50/inst.)
 *   → cache-1 (cache, 1 réplica, μ=50 000, US$60/inst., hit rate 0.9)
 *     → db-1 (sql_primary, 1 réplica, μ=1 000, US$120/inst.)
 * λ ofertado = 500 rps.
 *
 * ---- CONTA À MÃO ----
 * Propagação (FR-002, FR-008): lb-1=500 · cache-1=500 (peso único 100%)
 *   db-1 = 500 × (1 − 0.9) = 50   (carga_no_db = λ·(1−h))
 *
 * lb-1: capacidade=2×10000=20000, ρ=500/20000=0.025 (healthy), W=1/(20000−500)s=0.05128ms
 * cache-1: capacidade=1×50000=50000, ρ=500/50000=0.01 (healthy), W=1/(50000−500)s=0.02020ms
 * db-1: capacidade=1×1000=1000, ρ=50/1000=0.05 (healthy), W=1/(1000−50)s=1.05263ms
 *
 * SPOF (FR-009): cache-1 e db-1 têm 1 réplica cada ⇒ 2 violações 'spof'. lb-1 (2 réplicas) não.
 *
 * Custo (FR-013): lb-1=2×50=100 · cache-1=1×60=60 · db-1=1×120=120 ⇒ total=280
 *
 * Throughput (FR-006/FR-007): min(500, {20000,50000,1000}) = 500 (capacidade db 1000 > 500) ⇒
 *   sem gargalo real, bottleneckId=null, throughputRps=500
 *
 * Latência ponderada (FR-005, FR-008): peso 1 para lb-1 e cache-1; peso (1−0.9)=0.1 para db-1
 * (só é visitado em 10% dos casos — miss do cache):
 *   p50 ≈ 1×1.035542 + 1×0.514003 + 0.1×5.729628 ≈ 2.122508 ms
 *   p95 ≈ 1×2.990362 + 1×1.938071 + 0.1×26.520749 ≈ 7.580508 ms
 *   p99 ≈ 1×3.236163 + 1×2.093034 + 0.1×29.847547 ≈ 8.313951 ms
 * ----------------------
 */
describe('Design de referência C — cache + custo + SPOF', () => {
  const design: Design = {
    entryNodeIds: ['lb-1'],
    nodes: [
      { id: 'lb-1', type: 'load_balancer', replicas: 2 },
      { id: 'cache-1', type: 'cache', replicas: 1, cacheHitRate: 0.9 },
      { id: 'db-1', type: 'sql_primary', replicas: 1 },
    ],
    edges: [
      { id: 'e1', from: 'lb-1', to: 'cache-1', kind: 'read', weight: 100 },
      { id: 'e2', from: 'cache-1', to: 'db-1', kind: 'read', weight: 100 },
    ],
  };
  const workload: Workload = { rps: 500, readWriteRatio: 0.9, payloadBytes: 2048, peakMultiplier: 1 };

  const result = simulate(design, workload);

  it('propaga a carga reduzida pelo hit rate do cache até o db', () => {
    expect(result.nodes['lb-1']!.offeredLoad).toBeCloseTo(500);
    expect(result.nodes['cache-1']!.offeredLoad).toBeCloseTo(500);
    expect(result.nodes['db-1']!.offeredLoad).toBeCloseTo(50);
  });

  it('reporta SPOF para cache-1 e db-1, mas não para lb-1 (2 réplicas)', () => {
    const spofNodeIds = result.violations.filter((v) => v.type === 'spof').flatMap((v) => v.nodeIds);
    expect(new Set(spofNodeIds)).toEqual(new Set(['cache-1', 'db-1']));
  });

  it('calcula o custo mensal por nó e total corretamente', () => {
    expect(result.cost.byNode['lb-1']).toBe(100);
    expect(result.cost.byNode['cache-1']).toBe(60);
    expect(result.cost.byNode['db-1']).toBe(120);
    expect(result.cost.monthlyTotal).toBe(280);
  });

  it('não reporta gargalo (toda capacidade do caminho excede a carga ofertada)', () => {
    expect(result.path.bottleneckId).toBeNull();
    expect(result.path.throughputRps).toBe(500);
  });

  it('pondera a latência do db por (1−h), batendo com a conta à mão', () => {
    expect(result.path.latency.p50).toBeCloseTo(2.122508, 4);
    expect(result.path.latency.p95).toBeCloseTo(7.580508, 3);
    expect(result.path.latency.p99).toBeCloseTo(8.313951, 3);
  });
});
