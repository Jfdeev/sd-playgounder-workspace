import { describe, expect, it } from 'vitest';
import { designToCanvas } from '../src/lib/design-to-canvas';
import type { Design } from '@sdp/engine';

describe('designToCanvas', () => {
  it('adiciona um nó Cliente sintético conectado a cada entryNodeId', () => {
    const design: Design = {
      nodes: [{ id: 'app-1', type: 'app_server', replicas: 2 }],
      edges: [],
      entryNodeIds: ['app-1'],
    };
    const { nodes, edges } = designToCanvas(design);

    const client = nodes.find((n) => n.data.kind === 'client');
    expect(client).toBeDefined();
    expect(edges.some((e) => e.source === client!.id && e.target === 'app-1')).toBe(true);
  });

  it('preserva todos os nós do design, com replicas/cacheHitRate corretos', () => {
    const design: Design = {
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 4 },
        { id: 'cache-1', type: 'cache', replicas: 2, cacheHitRate: 0.8 },
      ],
      edges: [{ id: 'e1', from: 'app-1', to: 'cache-1', kind: 'read', weight: 1 }],
      entryNodeIds: ['app-1'],
    };
    const { nodes } = designToCanvas(design);

    const appNode = nodes.find((n) => n.id === 'app-1');
    expect(appNode?.data).toMatchObject({ kind: 'component', componentType: 'app_server', replicas: 4 });

    const cacheNode = nodes.find((n) => n.id === 'cache-1');
    expect(cacheNode?.data).toMatchObject({ kind: 'component', componentType: 'cache', replicas: 2, cacheHitRate: 0.8 });
  });

  it('preserva todas as arestas do design, com id/kind/weight corretos', () => {
    const design: Design = {
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'db-1', type: 'sql_primary', replicas: 1 },
      ],
      edges: [{ id: 'e1', from: 'app-1', to: 'db-1', kind: 'write', weight: 1 }],
      entryNodeIds: ['app-1'],
    };
    const { edges } = designToCanvas(design);

    const designEdge = edges.find((e) => e.id === 'e1');
    expect(designEdge).toMatchObject({ source: 'app-1', target: 'db-1', data: { kind: 'write', weight: 1 } });
  });

  it('nós mais distantes da entrada ficam em colunas (x) maiores — layout em camadas', () => {
    const design: Design = {
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'cache-1', type: 'cache', replicas: 2 },
        { id: 'db-1', type: 'sql_primary', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'app-1', to: 'cache-1', kind: 'read', weight: 1 },
        { id: 'e2', from: 'cache-1', to: 'db-1', kind: 'read', weight: 1 },
      ],
      entryNodeIds: ['app-1'],
    };
    const { nodes } = designToCanvas(design);
    const positionOf = (id: string) => nodes.find((n) => n.id === id)!.position.x;

    const clientX = nodes.find((n) => n.data.kind === 'client')!.position.x;
    expect(clientX).toBeLessThan(positionOf('app-1'));
    expect(positionOf('app-1')).toBeLessThan(positionOf('cache-1'));
    expect(positionOf('cache-1')).toBeLessThan(positionOf('db-1'));
  });

  it('múltiplos nós de entrada geram uma aresta do Cliente pra cada um', () => {
    const design: Design = {
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'app-2', type: 'app_server', replicas: 2 },
      ],
      edges: [],
      entryNodeIds: ['app-1', 'app-2'],
    };
    const { edges } = designToCanvas(design);
    const client = designToCanvas(design).nodes.find((n) => n.data.kind === 'client')!;

    expect(edges.filter((e) => e.source === client.id)).toHaveLength(2);
  });

  it('design vazio (sem nós) ainda produz o Cliente, sem lançar', () => {
    const design: Design = { nodes: [], edges: [], entryNodeIds: [] };
    expect(() => designToCanvas(design)).not.toThrow();
    const { nodes, edges } = designToCanvas(design);
    expect(nodes).toHaveLength(1); // só o Cliente
    expect(edges).toHaveLength(0);
  });

  it('nó inalcançável a partir de nenhuma entrada ainda aparece, numa coluna própria', () => {
    const design: Design = {
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'orphan-1', type: 'cache', replicas: 1 },
      ],
      edges: [],
      entryNodeIds: ['app-1'],
    };
    const { nodes } = designToCanvas(design);
    expect(nodes.find((n) => n.id === 'orphan-1')).toBeDefined();
  });

  it('cada id de nó/aresta gerado é único', () => {
    const design: Design = {
      nodes: [
        { id: 'app-1', type: 'app_server', replicas: 2 },
        { id: 'app-2', type: 'app_server', replicas: 2 },
      ],
      edges: [{ id: 'e1', from: 'app-1', to: 'app-2', kind: 'read', weight: 1 }],
      entryNodeIds: ['app-1', 'app-2'],
    };
    const { nodes, edges } = designToCanvas(design);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);
    expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length);
  });
});
