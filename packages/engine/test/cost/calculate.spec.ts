import { describe, expect, it } from 'vitest';
import { calculateCost } from '../../src/cost/calculate.js';
import type { Design } from '../../src/types.js';

describe('calculateCost (FR-013)', () => {
  it('calcula o custo por nó como réplicas × custo unitário do catálogo', () => {
    const design: Design = {
      entryNodeIds: ['app-1'],
      // app_server: US$30/instância (catálogo) × 3 réplicas = US$90
      nodes: [{ id: 'app-1', type: 'app_server', replicas: 3 }],
      edges: [],
    };

    const { byNode, monthlyTotal } = calculateCost(design, new Set(['app-1']));

    expect(byNode['app-1']).toBe(90);
    expect(monthlyTotal).toBe(90);
  });

  it('soma o custo de múltiplos nós no total', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 }, // US$50
        { id: 'app-1', type: 'app_server', replicas: 2 }, // US$60
      ],
      edges: [{ id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 100 }],
    };

    const { byNode, monthlyTotal } = calculateCost(design, new Set(['lb-1', 'app-1']));

    expect(byNode['lb-1']).toBe(50);
    expect(byNode['app-1']).toBe(60);
    expect(monthlyTotal).toBe(110);
  });

  it('exclui nó órfão do custo (FR-010, vale zero)', () => {
    const design: Design = {
      entryNodeIds: ['app-1'],
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 1 },
        { id: 'orfao', type: 'cache', replicas: 5 },
      ],
      edges: [],
    };

    const { byNode, monthlyTotal } = calculateCost(design, new Set(['app-1']));

    expect(byNode['orfao']).toBeUndefined();
    expect(monthlyTotal).toBe(30);
  });

  it('retorna total zero para design sem nenhum nó alcançável', () => {
    const design: Design = {
      entryNodeIds: [],
      nodes: [{ id: 'app-1', type: 'app_server', replicas: 1 }],
      edges: [],
    };

    expect(calculateCost(design, new Set())).toEqual({ monthlyTotal: 0, byNode: {} });
  });
});
