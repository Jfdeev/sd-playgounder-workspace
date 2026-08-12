import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/index.js';
import type { Design, Workload } from '../../src/types.js';

/**
 * Design de referência A — nó único, ρ < 1 (SC-001, FR-015).
 *
 * app-1: app_server, 2 réplicas (catálogo: μ=500 rps/instância, latência base p50=20ms/p99=80ms).
 * Sem downstream — app-1 é folha, entrada e único nó do grafo.
 *
 * ---- CONTA À MÃO ----
 * capacidade = c·μ = 2 × 500 = 1000 rps
 * ρ = λ/(c·μ) = 400/1000 = 0.4                                  (< 0.7 ⇒ status 'healthy')
 * W (fila M/M/1) = 1/(μ_agregado − λ) = 1/(1000−400) s = 1/600 s = 1.6667 ms
 *
 * Percentis de fila (research.md §3, t_p = W · (−ln(1−p))):
 *   p50 = 1.6667 × 0.69315 ≈ 1.1552 ms
 *   p95 = 1.6667 × 2.99573 ≈ 4.9929 ms
 *   p99 = 1.6667 × 4.60517 ≈ 7.6753 ms
 *
 * Latência base interpolada (catálogo p50=20, p99=80; p95 = 20+(80−20)×45/49 ≈ 75.1020):
 *   caminho.p50 = 20 + 1.1552       ≈ 21.1552 ms
 *   caminho.p95 = 75.1020 + 4.9929  ≈ 80.0949 ms
 *   caminho.p99 = 80 + 7.6753       ≈ 87.6753 ms
 *
 * Throughput: min(λ=400, capacidade=1000) = 400 — capacidade (1000) > carga (400) ⇒ sem gargalo.
 * ----------------------
 */
describe('Design de referência A — nó único, ρ<1', () => {
  const design: Design = {
    entryNodeIds: ['app-1'],
    nodes: [{ id: 'app-1', type: 'app_server', replicas: 2 }],
    edges: [],
  };
  const workload: Workload = { rps: 400, readWriteRatio: 0.9, payloadBytes: 2048, peakMultiplier: 1 };

  const result = simulate(design, workload);

  it('não produz nenhuma violação', () => {
    expect(result.violations).toEqual([]);
  });

  it('calcula utilização e status corretamente (ρ=0.4, healthy)', () => {
    expect(result.nodes['app-1']!.utilization).toBeCloseTo(0.4);
    expect(result.nodes['app-1']!.status).toBe('healthy');
    expect(result.nodes['app-1']!.capacity).toBe(1000);
  });

  it('calcula o tempo de fila (W) corretamente', () => {
    expect(result.nodes['app-1']!.queueLatencyMs).toBeCloseTo(1.6667, 3);
  });

  it('calcula a latência do caminho batendo com a conta à mão', () => {
    expect(result.path.latency.p50).toBeCloseTo(21.1552, 2);
    expect(result.path.latency.p95).toBeCloseTo(80.0949, 2);
    expect(result.path.latency.p99).toBeCloseTo(87.6753, 2);
  });

  it('reporta throughput igual à carga ofertada, sem gargalo', () => {
    expect(result.path.throughputRps).toBe(400);
    expect(result.path.bottleneckId).toBeNull();
  });
});
