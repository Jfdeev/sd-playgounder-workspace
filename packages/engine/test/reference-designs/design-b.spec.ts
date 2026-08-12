import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/index.js';
import type { Design, Workload } from '../../src/types.js';

/**
 * Design de referência B — gargalo no meio do caminho (SC-001, FR-015).
 *
 * lb-1 (load_balancer, 1 réplica, μ=10 000) → app-1 (app_server, 1 réplica, μ=500)
 *      → db-1 (sql_primary, 1 réplica, μ=1 000)
 * λ ofertado = 800 rps — acima da capacidade de app-1 (500), abaixo da de lb-1 e db-1.
 *
 * ---- CONTA À MÃO ----
 * Propagação (FR-002): peso único 100% em cada aresta ⇒ toda a carga passa adiante sem split.
 *   lb-1.offeredLoad = 800 · app-1.offeredLoad = 800 · db-1.offeredLoad = 800
 *
 * lb-1: capacidade = 1×10 000 = 10 000. ρ = 800/10 000 = 0.08 (healthy)
 * app-1: capacidade = 1×500 = 500. ρ = 800/500 = 1.6 ≥ 1 ⇒ status 'saturated'
 *        W = 1/(μ−λ) com (μ−λ) = 500−800 = −300 ≤ 0 ⇒ sentinela Infinity (Edge Cases)
 * db-1: capacidade = 1×1 000 = 1 000. ρ = 800/1 000 = 0.8 (≥0.7 ⇒ 'warning')
 *        W = 1/(1000−800) s = 5 ms
 *
 * Throughput (FR-006/FR-007): min(λ=800, capacidades do caminho {10000, 500, 1000}) = 500
 *   500 < 800 ⇒ há gargalo real ⇒ bottleneckId = 'app-1'
 *
 * Latência do caminho (FR-005): app-1 está saturado (W=Infinity) e faz parte do caminho ⇒
 *   qualquer percentil que inclua o termo de app-1 é Infinity — resultado correto e esperado:
 *   um nó saturado no caminho torna a latência do usuário efetivamente ilimitada.
 * ----------------------
 */
describe('Design de referência B — gargalo no meio do caminho', () => {
  const design: Design = {
    entryNodeIds: ['lb-1'],
    nodes: [
      { id: 'lb-1', type: 'load_balancer', replicas: 1 },
      { id: 'app-1', type: 'app_server', replicas: 1 },
      { id: 'db-1', type: 'sql_primary', replicas: 1 },
    ],
    edges: [
      { id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 100 },
      { id: 'e2', from: 'app-1', to: 'db-1', kind: 'read', weight: 100 },
    ],
  };
  const workload: Workload = { rps: 800, readWriteRatio: 0.9, payloadBytes: 2048, peakMultiplier: 1 };

  const result = simulate(design, workload);

  it('propaga a carga integralmente por um caminho linear (sem split)', () => {
    expect(result.nodes['lb-1']!.offeredLoad).toBeCloseTo(800);
    expect(result.nodes['app-1']!.offeredLoad).toBeCloseTo(800);
    expect(result.nodes['db-1']!.offeredLoad).toBeCloseTo(800);
  });

  it('marca app-1 como saturated (ρ=1.6) e db-1 como warning (ρ=0.8)', () => {
    expect(result.nodes['app-1']!.utilization).toBeCloseTo(1.6);
    expect(result.nodes['app-1']!.status).toBe('saturated');
    expect(result.nodes['db-1']!.utilization).toBeCloseTo(0.8);
    expect(result.nodes['db-1']!.status).toBe('warning');
    expect(result.nodes['lb-1']!.status).toBe('healthy');
  });

  it('reporta o tempo de fila sentinela (Infinity) para o nó saturado', () => {
    expect(result.nodes['app-1']!.queueLatencyMs).toBe(Infinity);
    expect(result.nodes['db-1']!.queueLatencyMs).toBeCloseTo(5);
  });

  it('identifica app-1 como gargalo e limita o throughput a 500 (nunca acima da carga ofertada)', () => {
    expect(result.path.bottleneckId).toBe('app-1');
    expect(result.path.throughputRps).toBe(500);
    expect(result.path.throughputRps).toBeLessThanOrEqual(workload.rps);
  });

  it('reporta latência do caminho Infinity quando o gargalo está saturado', () => {
    expect(result.path.latency.p50).toBe(Infinity);
    expect(result.path.latency.p95).toBe(Infinity);
    expect(result.path.latency.p99).toBe(Infinity);
  });
});
