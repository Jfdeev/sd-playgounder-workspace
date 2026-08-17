import { describe, expect, it } from 'vitest';
import { toDesign, toWorkload } from '../src/lib/canvas-to-design';
import type { ComputableFlowNode, FlowEdge, FlowNode } from '../src/lib/canvas-types';
import type { Problem } from '@sdp/problems';

function componentNode(id: string, overrides: Partial<ComputableFlowNode> = {}): FlowNode {
  return {
    id,
    kind: 'component',
    componentType: 'app_server',
    position: { x: 0, y: 0 },
    replicas: 2,
    ...overrides,
  };
}

function clientNode(id: string, variant: 'mobile' | 'web' | 'desktop' = 'web'): FlowNode {
  return { id, kind: 'client', variant, position: { x: 0, y: 0 } };
}

function edge(id: string, source: string, target: string, overrides: Partial<FlowEdge> = {}): FlowEdge {
  return { id, source, target, kind: 'read', ...overrides };
}

describe('toDesign', () => {
  it('canvas vazio produz um Design vazio-mas-válido', () => {
    expect(toDesign([], [])).toEqual({ nodes: [], edges: [], entryNodeIds: [] });
  });

  it('nó Cliente sem nenhuma conexão é ignorado — nenhum entryNodeId', () => {
    const nodes = [clientNode('client-1'), componentNode('api')];
    const design = toDesign(nodes, []);
    expect(design.entryNodeIds).toEqual([]);
  });

  it('componente conectado diretamente a um Cliente vira entryNodeId', () => {
    const nodes = [clientNode('client-1'), componentNode('api')];
    const edges = [edge('e1', 'client-1', 'api')];
    const design = toDesign(nodes, edges);
    expect(design.entryNodeIds).toEqual(['api']);
  });

  it('dois nós Cliente conectados ao mesmo componente real produzem 1 entryNodeId sem duplicata', () => {
    const nodes = [clientNode('client-mobile', 'mobile'), clientNode('client-web', 'web'), componentNode('gateway')];
    const edges = [edge('e1', 'client-mobile', 'gateway'), edge('e2', 'client-web', 'gateway')];
    const design = toDesign(nodes, edges);
    expect(design.entryNodeIds).toEqual(['gateway']);
  });

  it('dois Clientes conectados a dois componentes diferentes produzem 2 entryNodeIds', () => {
    const nodes = [clientNode('client-mobile', 'mobile'), clientNode('client-desktop', 'desktop'), componentNode('gateway-a'), componentNode('gateway-b')];
    const edges = [edge('e1', 'client-mobile', 'gateway-a'), edge('e2', 'client-desktop', 'gateway-b')];
    const design = toDesign(nodes, edges);
    expect(design.entryNodeIds).toEqual(expect.arrayContaining(['gateway-a', 'gateway-b']));
    expect(design.entryNodeIds).toHaveLength(2);
  });

  it('nós Cliente nunca aparecem em Design.nodes', () => {
    const nodes = [clientNode('client-1'), componentNode('api')];
    const design = toDesign(nodes, []);
    expect(design.nodes.map((n) => n.id)).toEqual(['api']);
  });

  it('arestas partindo de um Cliente nunca aparecem em Design.edges', () => {
    const nodes = [clientNode('client-1'), componentNode('api')];
    const edges = [edge('e1', 'client-1', 'api')];
    const design = toDesign(nodes, edges);
    expect(design.edges).toEqual([]);
  });

  it('arestas entre dois componentes reais aparecem em Design.edges', () => {
    const nodes = [componentNode('api'), componentNode('db', { componentType: 'sql_primary' })];
    const edges = [edge('e1', 'api', 'db', { kind: 'write' })];
    const design = toDesign(nodes, edges);
    expect(design.edges).toEqual([{ id: 'e1', from: 'api', to: 'db', kind: 'write', weight: 1 }]);
  });

  it('peso bruto é repassado sem normalização própria — normalização é responsabilidade do engine', () => {
    const nodes = [componentNode('api'), componentNode('cache-1', { componentType: 'cache' }), componentNode('db', { componentType: 'sql_primary' })];
    const edges = [edge('e1', 'api', 'cache-1', { weight: 30 }), edge('e2', 'api', 'db', { weight: 30 })];
    const design = toDesign(nodes, edges);
    expect(design.edges.map((e) => e.weight)).toEqual([30, 30]);
  });

  it('aresta sem peso explícito recebe peso implícito 1 (igual entre irmãs, normalizado pelo engine)', () => {
    const nodes = [componentNode('api'), componentNode('cache-1', { componentType: 'cache' })];
    const edges = [edge('e1', 'api', 'cache-1')];
    const design = toDesign(nodes, edges);
    expect(design.edges[0]?.weight).toBe(1);
  });

  it('taxa de acerto de cache só é incluída para nós do tipo cache', () => {
    const nodes = [componentNode('cache-1', { componentType: 'cache', cacheHitRate: 0.8 })];
    const design = toDesign(nodes, []);
    expect(design.nodes[0]).toMatchObject({ type: 'cache', cacheHitRate: 0.8 });
  });

  it('cacheHitRate não é incluída para nós que não são cache, mesmo se presente no FlowNode', () => {
    const nodes = [componentNode('api', { cacheHitRate: 0.8 })];
    const design = toDesign(nodes, []);
    expect(design.nodes[0]).not.toHaveProperty('cacheHitRate');
  });

  it('nunca lança exceção para uma aresta apontando para um id de nó inexistente', () => {
    const nodes = [componentNode('api')];
    const edges = [edge('e1', 'api', 'no-existe')];
    expect(() => toDesign(nodes, edges)).not.toThrow();
    const design = toDesign(nodes, edges);
    expect(design.edges).toEqual([{ id: 'e1', from: 'api', to: 'no-existe', kind: 'read', weight: 1 }]);
  });

  it('nunca lança exceção para uma aresta cuja origem não existe', () => {
    const nodes = [componentNode('api')];
    const edges = [edge('e1', 'nao-existe', 'api')];
    expect(() => toDesign(nodes, edges)).not.toThrow();
    expect(toDesign(nodes, edges).edges).toEqual([]);
    expect(toDesign(nodes, edges).entryNodeIds).toEqual([]);
  });
});

describe('toWorkload', () => {
  const problem: Problem = {
    id: 'test-problem',
    title: 'Problema de teste',
    statement: 'Enunciado',
    functionalRequirements: [],
    nonFunctionalRequirements: [],
    scale: {
      dau: 10_000_000,
      requestsPerUserPerDay: 5,
      readWriteRatio: 0.99,
      avgPayloadBytes: 500,
      peakMultiplier: 3,
    },
  };

  it('converte DAU + requisições/usuário/dia + pico em rps', () => {
    const workload = toWorkload(problem);
    // (10_000_000 * 5 / 86400) * 3 ≈ 1736.11
    expect(workload.rps).toBeCloseTo(1736.111, 2);
  });

  it('repassa readWriteRatio, payloadBytes e peakMultiplier sem alteração', () => {
    const workload = toWorkload(problem);
    expect(workload.readWriteRatio).toBe(0.99);
    expect(workload.payloadBytes).toBe(500);
    expect(workload.peakMultiplier).toBe(3);
  });

  it('é determinística — mesmo Problem, mesmo Workload, sempre', () => {
    expect(toWorkload(problem)).toEqual(toWorkload(problem));
  });
});
