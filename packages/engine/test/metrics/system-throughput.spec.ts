import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/index.js';
import type { Design, Workload } from '../../src/types.js';

/**
 * FR-006/FR-007 integrados via simulate(): o gargalo é decidido pela carga que REALMENTE chega em
 * cada nó (ρ), não pela comparação da capacidade do nó com o λ total. Regressão: antes, todo nó
 * atrás de um cache ou de um split era apontado como gargalo falso.
 */
const workload = (rps: number): Workload => ({ rps, readWriteRatio: 0.9, payloadBytes: 1024, peakMultiplier: 1 });

describe('throughput e gargalo do sistema (FR-006, FR-007)', () => {
  it('nó atrás de cache com ρ<1 não é gargalo, mesmo com capacidade < λ total', () => {
    // λ=5000 · app 12×500=6000 (ρ=0.833) · cache h=0.9 · db 2×1000=2000 recebe 500 (ρ=0.25)
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 2 },
        { id: 'app-1', type: 'app_server', replicas: 12 },
        { id: 'cache-1', type: 'cache', replicas: 2, cacheHitRate: 0.9 },
        { id: 'db-1', type: 'sql_primary', replicas: 2 },
      ],
      edges: [
        { id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 1 },
        { id: 'e2', from: 'app-1', to: 'cache-1', kind: 'read', weight: 1 },
        { id: 'e3', from: 'cache-1', to: 'db-1', kind: 'read', weight: 1 },
      ],
    };

    const result = simulate(design, workload(5000));

    expect(result.nodes['db-1']!.utilization).toBeCloseTo(0.25);
    expect(result.path.bottleneckId).toBeNull();
    expect(result.path.throughputRps).toBe(5000);
  });

  it('split entre réplicas lógicas: cada ramo recebe só sua fração da carga', () => {
    // λ=800 dividido 50/50 entre a1 e a2 (400 rps cada, cap 500) ⇒ ρ=0.8 nos dois, sem gargalo.
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 2 },
        { id: 'a1', type: 'app_server', replicas: 1 },
        { id: 'a2', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'lb-1', to: 'a1', kind: 'read', weight: 1 },
        { id: 'e2', from: 'lb-1', to: 'a2', kind: 'read', weight: 1 },
      ],
    };

    expect(simulate(design, workload(800)).path).toMatchObject({ throughputRps: 800, bottleneckId: null });

    // λ=1200 ⇒ ρ=1.2 nos dois ⇒ sustenta 1200/1.2 = 1000; empate decidido pelo menor id.
    expect(simulate(design, workload(1200)).path).toMatchObject({ throughputRps: 1000, bottleneckId: 'a1' });
  });

  it('worker saturado atrás de aresta async ainda limita o sistema (capacidade, não latência)', () => {
    // λ=300 · app 2×500 (ρ=0.3) → queue (ρ=0.1) → worker 1×200 (ρ=1.5) ⇒ 300/1.5 = 200
    const design: Design = {
      entryNodeIds: ['app-1'],
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'queue-1', type: 'queue', replicas: 1 },
        { id: 'worker-1', type: 'worker', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'app-1', to: 'queue-1', kind: 'async', weight: 1 },
        { id: 'e2', from: 'queue-1', to: 'worker-1', kind: 'async', weight: 1 },
      ],
    };

    const result = simulate(design, workload(300));

    expect(result.path.bottleneckId).toBe('worker-1');
    expect(result.path.throughputRps).toBeCloseTo(200);
    expect(Number.isFinite(result.path.latency.p99)).toBe(true);
  });

  it('nó órfão saturado não vira gargalo (não está no caminho da requisição)', () => {
    const design: Design = {
      entryNodeIds: ['app-1'],
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'orphan', type: 'worker', replicas: 0 },
      ],
      edges: [],
    };

    expect(simulate(design, workload(300)).path).toMatchObject({ throughputRps: 300, bottleneckId: null });
  });
});
