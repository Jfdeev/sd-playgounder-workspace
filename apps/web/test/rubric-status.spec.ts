import { describe, expect, it } from 'vitest';
import { simulate } from '@sdp/engine';
import { getProblem, toWorkload } from '@sdp/problems';
import { toManualWorkload } from '../src/lib/canvas-to-design';
import { criterionStatus } from '../src/lib/rubric-status';

const problem = getProblem('url-shortener')!;
const design = problem.referenceSolution.design;
const submitted = simulate(design, toWorkload(problem));

describe('criterionStatus — só "Submeter" verifica a rubrica (ajustes gerais, SC-001)', () => {
  it('Simular com tudo passando não pinta o card: todo critério fica "unchecked"', () => {
    const simulated = simulate(design, toManualWorkload(10));
    for (const criterion of problem.rubric) {
      expect(criterion.evaluate(simulated, design), criterion.id).toBe(true); // passaria, se contasse
      expect(criterionStatus(criterion, { kind: 'simulate', result: simulated, design })).toBe('unchecked');
    }
  });

  it('depois de Submeter, cada critério mostra o resultado real', () => {
    for (const criterion of problem.rubric) {
      expect(criterionStatus(criterion, { kind: 'submit', result: submitted, design })).toBe('pass');
    }
    const naive = { ...design, nodes: design.nodes.map((node) => ({ ...node, replicas: 1 })) };
    const statuses = problem.rubric.map((criterion) =>
      criterionStatus(criterion, { kind: 'submit', result: simulate(naive, toWorkload(problem)), design: naive }),
    );
    expect(statuses).toContain('fail');
  });

  it('sem nenhuma execução, ou com resultado limpo, fica "unchecked"', () => {
    const criterion = problem.rubric[0]!;
    expect(criterionStatus(criterion, { kind: null, result: null, design: null })).toBe('unchecked');
    expect(criterionStatus(criterion, { kind: 'submit', result: null, design: null })).toBe('unchecked');
  });
});
