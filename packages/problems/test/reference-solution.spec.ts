import { describe, expect, it } from 'vitest';
import { simulate } from '@sdp/engine';
import { ALL_PROBLEM_IDS, getProblem, toWorkload } from '../src/index.js';

/**
 * SC-005 (specs/avaliacao-biblioteca-m2/spec.md): toda `referenceSolution` MUST passar 100% da
 * própria rubrica quando simulada na escala oficial do problema — uma referência que a própria
 * rubrica rejeitaria seria uma contradição. Mesmo padrão de `bottleneck-scenario.spec.ts`.
 */
describe('referenceSolution de cada problema resolve a própria rubrica', () => {
  it.each([...ALL_PROBLEM_IDS])('%s: a solução de referência passa em todos os critérios da rubrica', (id) => {
    const problem = getProblem(id);
    if (!problem) throw new Error(`problema "${id}" não encontrado — catálogo quebrado`);

    const { design } = problem.referenceSolution;
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    const failing = problem.rubric.filter((criterion) => !criterion.evaluate(result, design));
    expect(failing.map((c) => c.id)).toEqual([]);
  });
});
