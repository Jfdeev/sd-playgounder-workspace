import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/index.js';
import type { Design, Workload } from '../../src/types.js';

/**
 * FR-012: aresta assíncrona sai do cálculo de latência do usuário. app-1 → queue-1 é 'async':
 * o worker que consome a fila roda em background e não deve entrar na latência reportada.
 */
describe('exclusão de aresta assíncrona da latência do usuário (FR-012)', () => {
  const design: Design = {
    entryNodeIds: ['app-1'],
    nodes: [
      { id: 'app-1', type: 'app_server', replicas: 2 },
      { id: 'queue-1', type: 'queue', replicas: 1 },
    ],
    edges: [{ id: 'e1', from: 'app-1', to: 'queue-1', kind: 'async', weight: 100 }],
  };
  const workload: Workload = { rps: 100, readWriteRatio: 0.9, payloadBytes: 1024, peakMultiplier: 1 };

  it('a latência do caminho não inclui a latência do nó atrás da aresta async', () => {
    const result = simulate(design, workload);
    const syncOnly = simulate(
      { ...design, nodes: [design.nodes[0]!], edges: [] },
      workload,
    );

    expect(result.path.latency).toEqual(syncOnly.path.latency);
  });

  it('um ramo async mais pesado não esconde o ramo síncrono da latência (regressão)', () => {
    // app-1 (4 réplicas, cap 2000) → db-1 síncrono e → queue-1 → worker-1 assíncrono, pesos 1:1.
    // Antes, a DP escolhia o ramo fila→worker (mais lento) e cortava na aresta async, perdendo db-1.
    //
    // ---- CONTA À MÃO (λ=360) ----
    // app-1: λ=360, W = 1/(2000−360) s = 0.609756 ms
    // db-1:  λ=180 (split 50%), cap 2000, W = 1/(2000−180) s = 0.549451 ms
    // p50 = 20 + 0.609756·ln2 + 5 + 0.549451·ln2 ≈ 25.803497 ms
    // p99 = 80 + 25 + (0.609756 + 0.549451)·ln(100) ≈ 110.338438 ms
    const fanOut = (workerReplicas: number): Design => ({
      entryNodeIds: ['app-1'],
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 4 },
        { id: 'db-1', type: 'sql_primary', replicas: 2 },
        { id: 'queue-1', type: 'queue', replicas: 2 },
        { id: 'worker-1', type: 'worker', replicas: workerReplicas },
      ],
      edges: [
        { id: 'e1', from: 'app-1', to: 'db-1', kind: 'read', weight: 1 },
        { id: 'e2', from: 'app-1', to: 'queue-1', kind: 'async', weight: 1 },
        { id: 'e3', from: 'queue-1', to: 'worker-1', kind: 'async', weight: 1 },
      ],
    });
    const load: Workload = { ...workload, rps: 360 };

    const result = simulate(fanOut(2), load);
    expect(result.path.latency.p50).toBeCloseTo(25.803497, 4);
    expect(result.path.latency.p99).toBeCloseTo(110.338438, 3);

    // A capacidade do worker (fora do caminho síncrono) não mexe na latência do usuário.
    expect(simulate(fanOut(1), load).path.latency).toEqual(result.path.latency);
  });

  it('a latência do caminho síncrono continua igual quando não há aresta async', () => {
    const syncDesign: Design = { ...design, edges: [{ ...design.edges[0]!, kind: 'read' }] };
    const syncResult = simulate(syncDesign, workload);

    // Com aresta síncrona, queue-1 entra na soma — latência maior que o cenário async.
    const asyncResult = simulate(design, workload);
    expect(syncResult.path.latency.p50).toBeGreaterThan(asyncResult.path.latency.p50);
  });
});
