import { describe, expect, it } from 'vitest';
import { simulate } from '@sdp/engine';
import { getProblem, isProblemSolved } from '@sdp/problems';
import { toDesign, toWorkload } from '../src/lib/canvas-to-design';
import type { FlowEdge, FlowNode } from '../src/lib/canvas-types';

/**
 * Prova de ponta a ponta (mesmo padrão de bottleneck-scenario.spec.ts) de que a escala do Social
 * Feed cria uma decisão de réplica visível no NoSQL — o "aha" pedagógico deste problema, até então
 * só um comentário em social-feed.ts.
 */
describe('cenário de gargalo — Cliente → App Server → NoSQL, escala real do Social Feed', () => {
  const problem = getProblem('social-feed');
  if (!problem) throw new Error('problema "social-feed" não encontrado — catálogo quebrado');

  // App Server fixado em 30 réplicas (15.000 rps) — acima do pico deste problema (~13.889 rps),
  // pra nunca ser o fator limitante aqui: o engine reporta gargalo pelo nó de MENOR capacidade
  // absoluta no caminho (packages/engine/src/metrics/throughput.ts), então o teste isola o NoSQL
  // como a única variável.
  function nodesWithReplicas(nosqlReplicas: number): FlowNode[] {
    return [
      { id: 'client-1', kind: 'client', variant: 'web', position: { x: 0, y: 0 } },
      { id: 'app-server-1', kind: 'component', componentType: 'app_server', position: { x: 0, y: 0 }, replicas: 30 },
      { id: 'nosql-1', kind: 'component', componentType: 'nosql_kv', position: { x: 0, y: 0 }, replicas: nosqlReplicas },
    ];
  }
  const edges: FlowEdge[] = [
    { id: 'e1', source: 'client-1', target: 'app-server-1', kind: 'read' },
    { id: 'e2', source: 'app-server-1', target: 'nosql-1', kind: 'read' },
  ];

  it('com 1 réplica de NoSQL, o armazenamento do feed satura e é o gargalo', () => {
    const design = toDesign(nodesWithReplicas(1), edges);
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    expect(result.path.bottleneckId).toBe('nosql-1');
    expect(result.nodes['nosql-1']?.status).toBe('saturated');
  });

  it('com 4 réplicas de NoSQL, o design escoa a carga sem saturar', () => {
    const design = toDesign(nodesWithReplicas(4), edges);
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    expect(result.path.bottleneckId).toBeNull();
    expect(result.nodes['nosql-1']?.status).not.toBe('saturated');
  });

  it('rubrica completa (cache + nosql + sem SPOF) resolve o desafio na escala real', () => {
    // 30 réplicas de App Server (15.000 rps de capacidade) — o pico deste problema (~13.889 rps)
    // é ~8x o do Encurtador de URL, então precisa de capacidade de cômputo proporcionalmente
    // maior na entrada, além da réplica extra no NoSQL que é o "aha" pedagógico do problema.
    const nodes: FlowNode[] = [
      { id: 'client-1', kind: 'client', variant: 'web', position: { x: 0, y: 0 } },
      { id: 'app-server-1', kind: 'component', componentType: 'app_server', position: { x: 0, y: 0 }, replicas: 30 },
      { id: 'cache-1', kind: 'component', componentType: 'cache', position: { x: 0, y: 0 }, replicas: 2, cacheHitRate: 0.8 },
      { id: 'nosql-1', kind: 'component', componentType: 'nosql_kv', position: { x: 0, y: 0 }, replicas: 4 },
    ];
    const solvedEdges: FlowEdge[] = [
      { id: 'e1', source: 'client-1', target: 'app-server-1', kind: 'read' },
      { id: 'e2', source: 'app-server-1', target: 'cache-1', kind: 'read' },
      { id: 'e3', source: 'cache-1', target: 'nosql-1', kind: 'read' },
    ];
    const design = toDesign(nodes, solvedEdges);
    const result = simulate(design, toWorkload(problem));

    expect(isProblemSolved(problem, result, design)).toBe(true);
  });
});
