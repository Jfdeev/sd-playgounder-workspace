import { describe, expect, it } from 'vitest';
import { FAULT_TYPES, FIX_CHECKS } from '@sdp/problems';
import { FAULT_TYPE_LABELS, FIX_CHECK_LABELS, violationLabel } from '../src/lib/incidents/labels';
import { canvasDesignOf, toDesign } from '../src/lib/canvas-to-design';

describe('rótulos do Modo Incidente', () => {
  it('todo tipo de falha e toda checagem do fix têm rótulo', () => {
    for (const type of FAULT_TYPES) expect(FAULT_TYPE_LABELS[type].length).toBeGreaterThan(0);
    for (const check of FIX_CHECKS) expect(FIX_CHECK_LABELS[check].length).toBeGreaterThan(0);
  });

  it('violações conhecidas em pt-br; desconhecidas pelo nome técnico', () => {
    expect(violationLabel('spof')).toBe('Ponto único de falha');
    expect(violationLabel('orphan-node')).toBe('Sem tráfego (órfão)');
    expect(violationLabel('duplicate-node-id')).toBe('duplicate-node-id');
  });
});

describe('canvasDesignOf', () => {
  it('é a mesma conversão de toDesign, a partir dos nós/arestas do React Flow', () => {
    const nodes = [
      { id: 'c', position: { x: 0, y: 0 }, data: { kind: 'client' as const, variant: 'web' as const } },
      { id: 'app', position: { x: 1, y: 0 }, data: { kind: 'component' as const, componentType: 'app_server' as const, replicas: 2 } },
    ];
    const edges = [{ id: 'e1', source: 'c', target: 'app' }];
    expect(canvasDesignOf(nodes, edges)).toEqual(
      toDesign(
        [
          { id: 'c', kind: 'client', variant: 'web', position: { x: 0, y: 0 } },
          { id: 'app', kind: 'component', componentType: 'app_server', replicas: 2, position: { x: 1, y: 0 } },
        ],
        [{ id: 'e1', source: 'c', target: 'app', kind: 'read' }],
      ),
    );
    expect(canvasDesignOf(nodes, edges).entryNodeIds).toEqual(['app']);
  });
});
