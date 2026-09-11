import { describe, expect, it } from 'vitest';
import { simulate } from '@sdp/engine';
import { getProblem } from '@sdp/problems';
import { toDesign, toWorkload } from '../src/lib/canvas-to-design';
import type { FlowEdge, FlowNode } from '../src/lib/canvas-types';

/**
 * Prova de ponta a ponta (sem browser) do caminho que alimenta o destaque de gargalo (FR-009) e
 * SC-002: canvas → mapper → engine real, para a escala real do problema do encurtador de URL.
 * A escala foi escolhida deliberadamente em packages/problems/src/catalog/url-shortener.ts para
 * saturar 1 réplica de app_server (500 rps de capacidade) e não saturar 4 — este teste é a
 * verificação de que essa afirmação (até então só um comentário) é, de fato, verdadeira.
 */
describe('cenário de gargalo — Cliente → App Server, escala real do encurtador de URL', () => {
  const problem = getProblem('url-shortener');
  if (!problem) throw new Error('problema "url-shortener" não encontrado — catálogo quebrado');

  const nodes: FlowNode[] = [
    { id: 'client-1', kind: 'client', variant: 'web', position: { x: 0, y: 0 } },
    { id: 'app-server-1', kind: 'component', componentType: 'app_server', position: { x: 0, y: 0 }, replicas: 1 },
  ];
  const edges: FlowEdge[] = [{ id: 'e1', source: 'client-1', target: 'app-server-1', kind: 'read' }];

  it('com 1 réplica, o App Server satura e é identificado como o gargalo', () => {
    const design = toDesign(nodes, edges);
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    expect(result.path.bottleneckId).toBe('app-server-1');
    expect(result.nodes['app-server-1']?.status).toBe('saturated');
    expect(result.nodes['app-server-1']?.utilization).toBeGreaterThanOrEqual(1);
  });

  it('com 4 réplicas (2000 rps de capacidade > ~1737 rps de pico), o App Server não satura', () => {
    const wellProvisionedNodes: FlowNode[] = [
      { id: 'client-1', kind: 'client', variant: 'web', position: { x: 0, y: 0 } },
      { id: 'app-server-1', kind: 'component', componentType: 'app_server', position: { x: 0, y: 0 }, replicas: 4 },
    ];
    const design = toDesign(wellProvisionedNodes, edges);
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    expect(result.path.bottleneckId).toBeNull();
    expect(result.nodes['app-server-1']?.status).not.toBe('saturated');
  });
});

/**
 * M1.5 US3, Acceptance Scenario 2 / FR-006 (Clarifications 2026-08-25): VPC/Subnet nunca devem
 * aparecer como gargalo em designs razoáveis, mesmo quando o resto do caminho ESTÁ saturado — o
 * teste mais rigoroso possível é colocar o VPC bem na frente de um App Server deliberadamente
 * subprovisionado (mesmo cenário de 1 réplica que satura acima) e confirmar que o gargalo
 * reportado continua sendo o App Server, nunca o VPC.
 */
describe('VPC nunca é gargalo — Cliente → VPC → App Server subprovisionado, escala real do encurtador de URL', () => {
  const problem = getProblem('url-shortener');
  if (!problem) throw new Error('problema "url-shortener" não encontrado — catálogo quebrado');

  const nodes: FlowNode[] = [
    { id: 'client-1', kind: 'client', variant: 'web', position: { x: 0, y: 0 } },
    { id: 'vpc-1', kind: 'component', componentType: 'vpc', position: { x: 0, y: 0 }, replicas: 1 },
    { id: 'app-server-1', kind: 'component', componentType: 'app_server', position: { x: 0, y: 0 }, replicas: 1 },
  ];
  const edges: FlowEdge[] = [
    { id: 'e1', source: 'client-1', target: 'vpc-1', kind: 'read' },
    { id: 'e2', source: 'vpc-1', target: 'app-server-1', kind: 'read' },
  ];

  it('o App Server (não o VPC) é identificado como o gargalo, mesmo com o VPC no caminho crítico', () => {
    const design = toDesign(nodes, edges);
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    expect(result.path.bottleneckId).toBe('app-server-1');
    expect(result.nodes['app-server-1']?.status).toBe('saturated');
    expect(result.nodes['vpc-1']?.status).not.toBe('saturated');
    expect(result.nodes['vpc-1']?.utilization).toBeLessThan(1);
  });
});
