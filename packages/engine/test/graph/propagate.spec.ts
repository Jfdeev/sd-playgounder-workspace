import { describe, expect, it } from 'vitest';
import { propagateLoad } from '../../src/graph/propagate.js';
import type { Design } from '../../src/types.js';

describe('propagateLoad (FR-002)', () => {
  it('propaga toda a carga por um caminho linear único', () => {
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

    const load = propagateLoad(design, 300);

    expect(load['lb-1']).toBeCloseTo(300);
    expect(load['app-1']).toBeCloseTo(300);
    expect(load['db-1']).toBeCloseTo(300);
  });

  it('divide a carga entre arestas de saída proporcionalmente ao peso já normalizado (soma 100)', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'app-a', type: 'app_server', replicas: 1 },
        { id: 'app-b', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'lb-1', to: 'app-a', kind: 'read', weight: 70 },
        { id: 'e2', from: 'lb-1', to: 'app-b', kind: 'read', weight: 30 },
      ],
    };

    const load = propagateLoad(design, 1000);

    expect(load['app-a']).toBeCloseTo(700);
    expect(load['app-b']).toBeCloseTo(300);
  });

  it('normaliza pesos que não somam 100% (FR-018)', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'app-a', type: 'app_server', replicas: 1 },
        { id: 'app-b', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'lb-1', to: 'app-a', kind: 'read', weight: 30 },
        { id: 'e2', from: 'lb-1', to: 'app-b', kind: 'read', weight: 30 },
      ],
    };

    const load = propagateLoad(design, 1000);

    // 30/60 = 50% cada, mesmo os pesos originais somando só 60
    expect(load['app-a']).toBeCloseTo(500);
    expect(load['app-b']).toBeCloseTo(500);
  });

  it('acumula carga em um nó que recebe de múltiplos caminhos (fan-in)', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'app-a', type: 'app_server', replicas: 1 },
        { id: 'app-b', type: 'app_server', replicas: 1 },
        { id: 'db-1', type: 'sql_primary', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'lb-1', to: 'app-a', kind: 'read', weight: 50 },
        { id: 'e2', from: 'lb-1', to: 'app-b', kind: 'read', weight: 50 },
        { id: 'e3', from: 'app-a', to: 'db-1', kind: 'read', weight: 100 },
        { id: 'e4', from: 'app-b', to: 'db-1', kind: 'read', weight: 100 },
      ],
    };

    const load = propagateLoad(design, 1000);

    expect(load['db-1']).toBeCloseTo(1000);
  });

  it('não propaga carga por arestas de saída cujo peso total é zero', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'app-1', type: 'app_server', replicas: 1 },
      ],
      edges: [{ id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 0 }],
    };

    const load = propagateLoad(design, 500);

    expect(load['lb-1']).toBeCloseTo(500);
    expect(load['app-1']).toBe(0);
  });

  it('não trava em grafo com ciclo (propagação segue de forma best-effort)', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'app_server', replicas: 1 },
        { id: 'b', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'b', kind: 'read', weight: 100 },
        { id: 'e2', from: 'b', to: 'a', kind: 'read', weight: 100 },
      ],
    };

    expect(() => propagateLoad(design, 100)).not.toThrow();
  });
});
