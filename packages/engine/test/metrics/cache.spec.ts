import { describe, expect, it } from 'vitest';
import { calculateDownstreamLoad, calculateEffectiveLatency } from '../../src/metrics/cache.js';
import { simulate } from '../../src/index.js';
import type { Design, Workload } from '../../src/types.js';

describe('calculateDownstreamLoad (FR-008, carga_no_db = λ·(1−h))', () => {
  it('reduz a carga proporcionalmente ao hit rate', () => {
    expect(calculateDownstreamLoad(1000, 0.99)).toBeCloseTo(10);
    expect(calculateDownstreamLoad(1000, 0.95)).toBeCloseTo(50);
  });

  it('hit rate 0.99 → 0.95 multiplica a carga no DB por 5x (docs/product-context.md §7)', () => {
    const loadAt99 = calculateDownstreamLoad(1000, 0.99);
    const loadAt95 = calculateDownstreamLoad(1000, 0.95);
    expect(loadAt95 / loadAt99).toBeCloseTo(5);
  });
});

describe('calculateEffectiveLatency (FR-008)', () => {
  it('calcula a latência efetiva ponderada por hit/miss', () => {
    // h=0.9, L_cache=1ms, L_db=20ms ⇒ 0.9×1 + 0.1×(1+20) = 0.9 + 2.1 = 3
    expect(calculateEffectiveLatency(1, 20, 0.9)).toBeCloseTo(3);
  });

  it('h=1 (hit sempre) ⇒ latência efetiva = latência do cache', () => {
    expect(calculateEffectiveLatency(1, 20, 1)).toBeCloseTo(1);
  });

  it('h=0 (miss sempre) ⇒ latência efetiva = cache + db', () => {
    expect(calculateEffectiveLatency(1, 20, 0)).toBeCloseTo(21);
  });
});

describe('integração via simulate(): cache reduz carga e latência do caminho', () => {
  const design: Design = {
    entryNodeIds: ['cache-1'],
    nodes: [
      { id: 'cache-1', type: 'cache', replicas: 1, cacheHitRate: 0.99 },
      { id: 'db-1', type: 'sql_primary', replicas: 1 },
    ],
    edges: [{ id: 'e1', from: 'cache-1', to: 'db-1', kind: 'read', weight: 100 }],
  };
  const workload: Workload = { rps: 1000, readWriteRatio: 0.9, payloadBytes: 1024, peakMultiplier: 1 };

  it('a carga que chega no db reflete carga_no_db = λ·(1−h)', () => {
    const result = simulate(design, workload);
    expect(result.nodes['db-1']!.offeredLoad).toBeCloseTo(10); // 1000 × (1−0.99)
  });

  it('cair o hit rate de 0.99 para 0.95 multiplica a carga no db por 5x', () => {
    const designAt95: Design = {
      ...design,
      nodes: [{ ...design.nodes[0]!, cacheHitRate: 0.95 }, design.nodes[1]!],
    };

    const resultAt99 = simulate(design, workload);
    const resultAt95 = simulate(designAt95, workload);

    expect(resultAt95.nodes['db-1']!.offeredLoad / resultAt99.nodes['db-1']!.offeredLoad).toBeCloseTo(5);
  });

  it('h=0.99: p50 e p95 são hits (só o cache); o p99 cai na fronteira dos misses e soma o db inteiro', () => {
    const result = simulate(design, workload);
    const cacheOnly = simulate({ ...design, nodes: [design.nodes[0]!], edges: [] }, workload);
    const dbOnly = simulate(
      { entryNodeIds: ['db-1'], nodes: [design.nodes[1]!], edges: [] },
      { ...workload, rps: 10 },
    );

    expect(result.path.latency.p50).toBeCloseTo(cacheOnly.path.latency.p50);
    expect(result.path.latency.p95).toBeCloseTo(cacheOnly.path.latency.p95);
    expect(result.path.latency.p99).toBeCloseTo(cacheOnly.path.latency.p99 + dbOnly.path.latency.p99);
  });
});
