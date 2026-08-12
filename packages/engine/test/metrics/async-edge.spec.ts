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

  it('a latência do caminho síncrono continua igual quando não há aresta async', () => {
    const syncDesign: Design = { ...design, edges: [{ ...design.edges[0]!, kind: 'read' }] };
    const syncResult = simulate(syncDesign, workload);

    // Com aresta síncrona, queue-1 entra na soma — latência maior que o cenário async.
    const asyncResult = simulate(design, workload);
    expect(syncResult.path.latency.p50).toBeGreaterThan(asyncResult.path.latency.p50);
  });
});
