import { describe, expect, it } from 'vitest';
import { simulate } from '@sdp/engine';
import { getProblem, isProblemSolved } from '@sdp/problems';
import { toDesign, toWorkload } from '../src/lib/canvas-to-design';
import type { FlowEdge, FlowNode } from '../src/lib/canvas-types';

/**
 * Prova de ponta a ponta (mesmo padrão de bottleneck-scenario.spec.ts) de que a escala do
 * E-commerce Checkout cria uma decisão de réplica visível no SQL Primary — o "aha" pedagógico
 * deste problema, até então só um comentário em ecommerce-checkout.ts.
 */
describe('cenário de gargalo — Cliente → App Server → SQL Primary, escala real do E-commerce Checkout', () => {
  const problem = getProblem('ecommerce-checkout');
  if (!problem) throw new Error('problema "ecommerce-checkout" não encontrado — catálogo quebrado');

  function nodesWithReplicas(sqlReplicas: number): FlowNode[] {
    return [
      { id: 'client-1', kind: 'client', variant: 'web', position: { x: 0, y: 0 } },
      { id: 'app-server-1', kind: 'component', componentType: 'app_server', position: { x: 0, y: 0 }, replicas: 4 },
      { id: 'sql-1', kind: 'component', componentType: 'sql_primary', position: { x: 0, y: 0 }, replicas: sqlReplicas },
    ];
  }
  const edges: FlowEdge[] = [
    { id: 'e1', source: 'client-1', target: 'app-server-1', kind: 'read' },
    { id: 'e2', source: 'app-server-1', target: 'sql-1', kind: 'write' },
  ];

  it('com 1 réplica de SQL Primary, o banco transacional satura e é o gargalo', () => {
    const design = toDesign(nodesWithReplicas(1), edges);
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    expect(result.path.bottleneckId).toBe('sql-1');
    expect(result.nodes['sql-1']?.status).toBe('saturated');
  });

  it('com 4 réplicas de SQL Primary, o design escoa a carga sem saturar', () => {
    const design = toDesign(nodesWithReplicas(4), edges);
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    expect(result.path.bottleneckId).toBeNull();
    expect(result.nodes['sql-1']?.status).not.toBe('saturated');
  });

  it('rubrica completa (rate limiter + payment + sem SPOF) resolve o desafio na escala real', () => {
    const nodes: FlowNode[] = [
      { id: 'client-1', kind: 'client', variant: 'web', position: { x: 0, y: 0 } },
      { id: 'rl-1', kind: 'component', componentType: 'rate_limiter', position: { x: 0, y: 0 }, replicas: 2 },
      { id: 'app-server-1', kind: 'component', componentType: 'app_server', position: { x: 0, y: 0 }, replicas: 4 },
      { id: 'sql-1', kind: 'component', componentType: 'sql_primary', position: { x: 0, y: 0 }, replicas: 4 },
      // App Server tem 2 arestas de saída (sql-1 e payment-1) — o engine faz split de carga entre
      // elas (FR-018), então Payment (80 rps/réplica) precisa de réplicas suficientes pra cobrir
      // até 100% do pico (~1.389 rps) com folga, sem depender de qual fração exata cada aresta leva.
      { id: 'payment-1', kind: 'component', componentType: 'payment', position: { x: 0, y: 0 }, replicas: 20 },
    ];
    const solvedEdges: FlowEdge[] = [
      { id: 'e1', source: 'client-1', target: 'rl-1', kind: 'read' },
      { id: 'e2', source: 'rl-1', target: 'app-server-1', kind: 'read' },
      { id: 'e3', source: 'app-server-1', target: 'sql-1', kind: 'write' },
      { id: 'e4', source: 'app-server-1', target: 'payment-1', kind: 'write' },
    ];
    const design = toDesign(nodes, solvedEdges);
    const result = simulate(design, toWorkload(problem));

    expect(isProblemSolved(problem, result, design)).toBe(true);
  });
});
