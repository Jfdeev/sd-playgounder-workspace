import { describe, expect, it } from 'vitest';
import { toFlowEdge, toFlowNode } from '../src/lib/canvas-types';
import type { FlowEdgeData, FlowNodeData } from '../src/lib/canvas-types';

/**
 * `toFlowNode`/`toFlowEdge` reconstroem o FlowNode/FlowEdge "achatado" (formato lido pelo mapper
 * puro `canvas-to-design.ts`) a partir do formato nativo do React Flow (id/position/source/target
 * como campos de topo + `data`). `canvas.tsx#handleSubmit` chama essas duas funções em todo
 * submit, antes de `toDesign`/`toWorkload`/`simulate` — um bug aqui quebraria silenciosamente
 * qualquer resultado do engine, então merece teste direto (não só cobertura indireta via
 * canvas-to-design.spec.ts, que já assume o formato achatado pronto).
 */
describe('toFlowNode', () => {
  it('reconstrói um nó de componente, preservando id/position de fora de `data` e todos os campos de `data`', () => {
    const data: FlowNodeData = { kind: 'component', componentType: 'app_server', replicas: 3 };
    const node = toFlowNode('n1', { x: 10, y: 20 }, data);

    expect(node).toEqual({
      id: 'n1',
      position: { x: 10, y: 20 },
      kind: 'component',
      componentType: 'app_server',
      replicas: 3,
    });
  });

  it('preserva cacheHitRate quando presente (só relevante para componentType === "cache")', () => {
    const data: FlowNodeData = { kind: 'component', componentType: 'cache', replicas: 2, cacheHitRate: 0.8 };
    const node = toFlowNode('n2', { x: 0, y: 0 }, data);

    expect(node).toMatchObject({ componentType: 'cache', cacheHitRate: 0.8 });
  });

  it('preserva `result` quando presente (metadado de UI pós-submissão, FR-008/FR-009)', () => {
    const data: FlowNodeData = {
      kind: 'component',
      componentType: 'app_server',
      replicas: 1,
      result: { status: 'saturated', isBottleneck: true },
    };
    const node = toFlowNode('n3', { x: 0, y: 0 }, data);

    expect(node).toMatchObject({ result: { status: 'saturated', isBottleneck: true } });
  });

  it('reconstrói um nó Cliente (kind: "client"), sem campos de componente', () => {
    const data: FlowNodeData = { kind: 'client', variant: 'mobile' };
    const node = toFlowNode('c1', { x: 5, y: 5 }, data);

    expect(node).toEqual({ id: 'c1', position: { x: 5, y: 5 }, kind: 'client', variant: 'mobile' });
  });
});

describe('toFlowEdge', () => {
  it('reconstrói uma aresta, preservando id/source/target de fora de `data` e o `kind`/`weight` de dentro', () => {
    const data: FlowEdgeData = { kind: 'write', weight: 70 };
    const edge = toFlowEdge('e1', 'n1', 'n2', data);

    expect(edge).toEqual({ id: 'e1', source: 'n1', target: 'n2', kind: 'write', weight: 70 });
  });

  it('omite `weight` quando ausente em `data` (peso implícito igual entre irmãs)', () => {
    const data: FlowEdgeData = { kind: 'read' };
    const edge = toFlowEdge('e2', 'n1', 'n3', data);

    expect(edge).toEqual({ id: 'e2', source: 'n1', target: 'n3', kind: 'read' });
    expect(edge.weight).toBeUndefined();
  });
});
