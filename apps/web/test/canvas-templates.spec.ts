import { describe, expect, it } from 'vitest';
import { ARCHITECTURE_TEMPLATES, instantiateTemplate } from '../src/lib/canvas-templates';
import { connectableKindOf, isValidCanvasConnection } from '../src/lib/connection-rules';
import type { FlowNodeData } from '../src/lib/canvas-types';

describe('ARCHITECTURE_TEMPLATES', () => {
  it('existem exatamente os 4 templates pedidos (Monolito, 3 Camadas, Microsserviços, Orientado a Eventos)', () => {
    expect(ARCHITECTURE_TEMPLATES.map((t) => t.id).sort()).toEqual(
      ['event-driven', 'microservices', 'monolith', 'three-tier'].sort(),
    );
    for (const template of ARCHITECTURE_TEMPLATES) {
      expect(template.label.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(20);
      expect(template.nodes.length).toBeGreaterThan(0);
    }
  });

  // A prova mecânica central deste módulo: nenhum template pode gerar uma conexão que o próprio
  // canvas recusaria o usuário desenhar à mão — senão o template contradiz connection-rules.ts.
  it.each(ARCHITECTURE_TEMPLATES.map((t) => [t.label, t] as const))(
    '%s: toda aresta é uma conexão válida em connection-rules.ts',
    (_label, template) => {
      const dataByLocalId = new Map<string, FlowNodeData>(
        template.nodes.map((def) => [
          def.localId,
          def.kind === 'client'
            ? { kind: 'client', variant: def.variant }
            : { kind: 'component', componentType: def.componentType, replicas: def.replicas },
        ]),
      );

      for (const edge of template.edges) {
        const sourceData = dataByLocalId.get(edge.from);
        const targetData = dataByLocalId.get(edge.to);
        expect(sourceData, `nó de origem "${edge.from}" não existe no template`).toBeDefined();
        expect(targetData, `nó de destino "${edge.to}" não existe no template`).toBeDefined();

        const valid = isValidCanvasConnection(connectableKindOf(sourceData!), connectableKindOf(targetData!));
        expect(valid, `${edge.from} → ${edge.to} não é uma conexão permitida por connection-rules.ts`).toBe(true);
      }
    },
  );

  it('todo template referencia só localIds que ele próprio declara (sem edge órfã)', () => {
    for (const template of ARCHITECTURE_TEMPLATES) {
      const localIds = new Set(template.nodes.map((n) => n.localId));
      for (const edge of template.edges) {
        expect(localIds.has(edge.from)).toBe(true);
        expect(localIds.has(edge.to)).toBe(true);
      }
    }
  });
});

describe('instantiateTemplate', () => {
  it('gera ids reais (não os localId do template) e preserva a contagem de nós/arestas', () => {
    const template = ARCHITECTURE_TEMPLATES[0]!;
    const { nodes, edges } = instantiateTemplate(template);

    expect(nodes).toHaveLength(template.nodes.length);
    expect(edges).toHaveLength(template.edges.length);
    for (const node of nodes) {
      expect(template.nodes.some((def) => def.localId === node.id)).toBe(false); // nunca reusa o localId como id real
    }
  });

  it('duas instanciações do mesmo template nunca colidem em id', () => {
    const template = ARCHITECTURE_TEMPLATES[0]!;
    const first = instantiateTemplate(template);
    const second = instantiateTemplate(template);

    const firstIds = new Set(first.nodes.map((n) => n.id));
    for (const node of second.nodes) {
      expect(firstIds.has(node.id)).toBe(false);
    }
  });

  it('toda aresta instanciada aponta pra um source/target que existe entre os nós instanciados', () => {
    for (const template of ARCHITECTURE_TEMPLATES) {
      const { nodes, edges } = instantiateTemplate(template);
      const nodeIds = new Set(nodes.map((n) => n.id));
      for (const edge of edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      }
    }
  });
});
