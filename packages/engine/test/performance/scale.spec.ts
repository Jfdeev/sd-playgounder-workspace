import { describe, expect, it } from 'vitest';
import { simulate } from '../../src/index.js';
import type { ComponentType, Design, DesignEdge, DesignNode, Workload } from '../../src/types.js';

/** Gera um grafo linear de `count` nós, alternando tipos, para testar em escala (SC-002). */
function buildLinearDesign(count: number): Design {
  const types: ComponentType[] = ['load_balancer', 'app_server', 'cache', 'nosql_kv', 'queue'];
  const nodes: DesignNode[] = Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    type: types[i % types.length]!,
    replicas: 2,
  }));
  const edges: DesignEdge[] = nodes.slice(0, -1).map((node, i) => ({
    id: `edge-${i}`,
    from: node.id,
    to: nodes[i + 1]!.id,
    kind: 'read',
    weight: 100,
  }));

  return { entryNodeIds: [nodes[0]!.id], nodes, edges };
}

describe('Performance (SC-002, RNF-1)', () => {
  it('simula um grafo com 30 nós em menos de 50 ms', () => {
    const design = buildLinearDesign(30);
    const workload: Workload = { rps: 500, readWriteRatio: 0.9, payloadBytes: 2048, peakMultiplier: 1 };

    const start = performance.now();
    const result = simulate(design, workload);
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(50);
    expect(Object.keys(result.nodes)).toHaveLength(30);
  });
});
