import { describe, expect, it } from 'vitest';
import {
  baseLatencyAtPercentile,
  calculatePathLatency,
  queueLatencyAtPercentile,
} from '../../src/metrics/latency.js';

describe('queueLatencyAtPercentile (research.md §3)', () => {
  it('p50 ≈ 0.693 × W médio', () => {
    expect(queueLatencyAtPercentile(10, 'p50')).toBeCloseTo(10 * 0.6931, 2);
  });

  it('p95 ≈ 2.996 × W médio', () => {
    expect(queueLatencyAtPercentile(10, 'p95')).toBeCloseTo(10 * 2.9957, 2);
  });

  it('p99 ≈ 4.605 × W médio', () => {
    expect(queueLatencyAtPercentile(10, 'p99')).toBeCloseTo(10 * 4.6052, 2);
  });

  it('propaga Infinity quando o nó está saturado', () => {
    expect(queueLatencyAtPercentile(Infinity, 'p99')).toBe(Infinity);
  });
});

describe('baseLatencyAtPercentile', () => {
  const base = { p50: 10, p99: 50 };

  it('p50 retorna o valor base p50 diretamente', () => {
    expect(baseLatencyAtPercentile(base, 'p50')).toBe(10);
  });

  it('p99 retorna o valor base p99 diretamente', () => {
    expect(baseLatencyAtPercentile(base, 'p99')).toBe(50);
  });

  it('p95 interpola linearmente entre p50 e p99', () => {
    // 10 + (50-10) * (45/49) ≈ 46.73
    expect(baseLatencyAtPercentile(base, 'p95')).toBeCloseTo(46.73, 1);
  });
});

describe('calculatePathLatency (FR-005)', () => {
  it('soma base + fila de cada nó do caminho, para cada percentil', () => {
    const nodes = [
      { baseLatencyMs: { p50: 5, p99: 25 }, queueWaitMs: 2 },
      { baseLatencyMs: { p50: 20, p99: 80 }, queueWaitMs: 4 },
    ];

    const result = calculatePathLatency(nodes);

    const expectedP50 =
      baseLatencyAtPercentile(nodes[0]!.baseLatencyMs, 'p50') +
      queueLatencyAtPercentile(2, 'p50') +
      baseLatencyAtPercentile(nodes[1]!.baseLatencyMs, 'p50') +
      queueLatencyAtPercentile(4, 'p50');

    expect(result.p50).toBeCloseTo(expectedP50);
    expect(result.p95).toBeGreaterThan(result.p50);
    expect(result.p99).toBeGreaterThan(result.p95);
  });

  it('retorna 0 em todos os percentis para um caminho vazio', () => {
    expect(calculatePathLatency([])).toEqual({ p50: 0, p95: 0, p99: 0 });
  });

  describe('limiar de cauda por `reachProbability` (FR-008)', () => {
    const entry = { baseLatencyMs: { p50: 1, p99: 1 }, queueWaitMs: 0 };
    const downstream = { baseLatencyMs: { p50: 10, p99: 10 }, queueWaitMs: 0 };

    it('reachProbability omitido ⇒ 1, o nó conta em todos os percentis', () => {
      expect(calculatePathLatency([downstream])).toEqual(
        calculatePathLatency([{ ...downstream, reachProbability: 1 }]),
      );
    });

    it('miss de 10% (h=0.9): nó fora do p50, inteiro no p95 e no p99 — nunca 0.1× a latência', () => {
      const result = calculatePathLatency([entry, { ...downstream, reachProbability: 0.1 }]);
      expect(result).toEqual({ p50: 1, p95: 11, p99: 11 });
    });

    it('miss de 2% (h=0.98): só a p99 cai entre os misses', () => {
      const result = calculatePathLatency([entry, { ...downstream, reachProbability: 0.02 }]);
      expect(result).toEqual({ p50: 1, p95: 1, p99: 11 });
    });

    it('fronteira exata (1−h) = (1−p) conta o nó, apesar do erro de ponto flutuante de 1 − 0.99', () => {
      const result = calculatePathLatency([entry, { ...downstream, reachProbability: 1 - 0.99 }]);
      expect(result.p99).toBe(11);
    });

    it('miss de 0.5% (h=0.995): o nó não entra em nenhum dos percentis reportados', () => {
      const result = calculatePathLatency([entry, { ...downstream, reachProbability: 0.005 }]);
      expect(result).toEqual({ p50: 1, p95: 1, p99: 1 });
    });
  });
});
