import { describe, expect, it } from 'vitest';
import { simulate, type Design } from '@sdp/engine';
import { REFERENCE_ARCHITECTURES, toDesign as presetToDesign } from '@sdp/knowledge';
import { ALL_PROBLEM_IDS, getProblem, toWorkload } from '@sdp/problems';
import { ARCHITECTURE_TEMPLATES } from '../src/lib/canvas-templates';
import { toDesign, toManualWorkload } from '../src/lib/canvas-to-design';
import type { FlowEdge, FlowNode } from '../src/lib/canvas-types';

/**
 * Não-regressão do engine (M3, SC-006/FR-012): o resultado de todo design que já existe no produto —
 * solução de referência de cada desafio, cada template e cada arquitetura de referência — fica
 * congelado num snapshot. Qualquer capacidade nova do engine (ex.: `capacityFactor`) tem que ser
 * aditiva: se este snapshot mudar, algum design existente passou a dar outro número.
 */

function templateDesign(template: (typeof ARCHITECTURE_TEMPLATES)[number]): Design {
  const nodes: FlowNode[] = template.nodes.map((def) =>
    def.kind === 'client'
      ? { id: def.localId, kind: 'client', variant: def.variant, position: { x: def.column, y: def.row } }
      : { id: def.localId, kind: 'component', componentType: def.componentType, replicas: def.replicas, position: { x: def.column, y: def.row } },
  );
  const edges: FlowEdge[] = template.edges.map((edge, i) => ({ id: `e${i}`, source: edge.from, target: edge.to, kind: edge.kind }));
  return toDesign(nodes, edges);
}

describe('engine — resultados congelados de todo design existente (SC-006)', () => {
  it.each(ALL_PROBLEM_IDS)('solução de referência do desafio %s', (problemId) => {
    const problem = getProblem(problemId)!;
    expect(simulate(problem.referenceSolution.design, toWorkload(problem))).toMatchSnapshot();
  });

  it.each(ARCHITECTURE_TEMPLATES.map((t) => [t.id, t] as const))('template %s', (_id, template) => {
    expect(simulate(templateDesign(template), toManualWorkload(1000))).toMatchSnapshot();
  });

  it.each(REFERENCE_ARCHITECTURES.map((p) => [p.id, p] as const))('arquitetura de referência %s', (_id, preset) => {
    expect(simulate(presetToDesign(preset), toManualWorkload(1000))).toMatchSnapshot();
  });
});
