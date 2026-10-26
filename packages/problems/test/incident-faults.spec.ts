import { describe, expect, it } from 'vitest';
import type { Design } from '@sdp/engine';
import { FAULT_TYPES, applyFault, isFaultType } from '../src/incidents/faults.js';
import { replicasInZone } from '../src/incidents/zones.js';

const base: Design = {
  nodes: [
    { id: 'lb', type: 'load_balancer', replicas: 2 },
    { id: 'app', type: 'app_server', replicas: 4 },
    { id: 'cache', type: 'cache', replicas: 3, cacheHitRate: 0.9 },
    { id: 'db', type: 'sql_primary', replicas: 1 },
  ],
  edges: [
    { id: 'e1', from: 'lb', to: 'app', kind: 'read', weight: 1 },
    { id: 'e2', from: 'app', to: 'cache', kind: 'read', weight: 1 },
    { id: 'e3', from: 'cache', to: 'db', kind: 'read', weight: 1 },
  ],
  entryNodeIds: ['lb'],
};

const node = (design: Design, id: string) => design.nodes.find((n) => n.id === id);

describe('replicasInZone (3 zonas, rodízio)', () => {
  it.each([
    [1, [1, 0, 0]],
    [2, [1, 1, 0]],
    [3, [1, 1, 1]],
    [4, [2, 1, 1]],
    [7, [3, 2, 2]],
  ])('%i réplicas → por zona %j (soma = total)', (replicas, perZone) => {
    expect([0, 1, 2].map((z) => replicasInZone(replicas, z as 0 | 1 | 2))).toEqual(perZone);
  });
});

describe('applyFault', () => {
  it('node-down: o alvo perde instâncias (relativo — mais réplicas corrigem)', () => {
    const faulted = applyFault(base, { type: 'node-down', target: 'app', lostInstances: 3 });
    expect(node(faulted, 'app')?.replicas).toBe(1);
    const withMore = applyFault({ ...base, nodes: base.nodes.map((n) => (n.id === 'app' ? { ...n, replicas: 8 } : n)) }, {
      type: 'node-down',
      target: 'app',
      lostInstances: 3,
    });
    expect(node(withMore, 'app')?.replicas).toBe(5);
  });

  it('node-down total: o nó sai com suas conexões e da entrada — nunca replicas: 0', () => {
    const faulted = applyFault(base, { type: 'node-down', target: 'lb', lostInstances: 2 });
    expect(node(faulted, 'lb')).toBeUndefined();
    expect(faulted.edges.map((e) => e.id)).toEqual(['e2', 'e3']);
    expect(faulted.entryNodeIds).toEqual([]);
    expect(faulted.nodes.every((n) => n.replicas >= 1)).toBe(true);
  });

  it('zone-down: todo nó perde a fatia da zona; quem tinha 1 réplica na zona 0 morre', () => {
    const faulted = applyFault(base, { type: 'zone-down', target: 'app', zone: 0 });
    expect(node(faulted, 'lb')?.replicas).toBe(1);
    expect(node(faulted, 'app')?.replicas).toBe(2);
    expect(node(faulted, 'cache')?.replicas).toBe(2);
    expect(node(faulted, 'db')).toBeUndefined();
    expect(faulted.edges.map((e) => e.id)).toEqual(['e1', 'e2']);
  });

  it('zone-down em outra zona poupa quem só tem réplica na zona 0', () => {
    expect(node(applyFault(base, { type: 'zone-down', target: 'app', zone: 2 }), 'db')?.replicas).toBe(1);
  });

  it('partition: corta as arestas entre os dois, nos dois sentidos, e só elas', () => {
    const withBack = { ...base, edges: [...base.edges, { id: 'back', from: 'db', to: 'cache', kind: 'replication' as const, weight: 1 }] };
    const faulted = applyFault(withBack, { type: 'partition', target: 'db', cutFrom: 'cache' });
    expect(faulted.edges.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(faulted.nodes).toEqual(withBack.nodes);
  });

  it('cache-cold: taxa de acerto do alvo vai a 0, sobrescrevendo o que vier', () => {
    expect(node(applyFault(base, { type: 'cache-cold', target: 'cache' }), 'cache')?.cacheHitRate).toBe(0);
  });

  it('pool-exhausted: aplica o fator de capacidade (nunca aumenta um já menor)', () => {
    expect(node(applyFault(base, { type: 'pool-exhausted', target: 'db', capacityFactor: 0.3 }), 'db')?.capacityFactor).toBe(0.3);
    const already = { ...base, nodes: base.nodes.map((n) => (n.id === 'db' ? { ...n, capacityFactor: 0.1 } : n)) };
    expect(node(applyFault(already, { type: 'pool-exhausted', target: 'db', capacityFactor: 0.3 }), 'db')?.capacityFactor).toBe(0.1);
  });

  it('alvo ausente (o usuário apagou o componente no fix): falha sem efeito sobre ele', () => {
    const withoutCache = { ...base, nodes: base.nodes.filter((n) => n.id !== 'cache') };
    expect(applyFault(withoutCache, { type: 'cache-cold', target: 'cache' })).toEqual(withoutCache);
  });

  it('nunca muta o design de entrada', () => {
    const snapshot = structuredClone(base);
    for (const fault of [
      { type: 'node-down', target: 'app', lostInstances: 4 },
      { type: 'zone-down', target: 'app', zone: 0 },
      { type: 'partition', target: 'db', cutFrom: 'cache' },
      { type: 'cache-cold', target: 'cache' },
      { type: 'pool-exhausted', target: 'db', capacityFactor: 0.5 },
    ] as const) {
      applyFault(base, fault);
    }
    expect(base).toEqual(snapshot);
  });
});

describe('FAULT_TYPES', () => {
  it('os 5 tipos do roadmap', () => {
    expect([...FAULT_TYPES]).toEqual(['node-down', 'zone-down', 'partition', 'cache-cold', 'pool-exhausted']);
    expect(isFaultType('cache-cold')).toBe(true);
    expect(isFaultType('meteoro')).toBe(false);
  });
});
