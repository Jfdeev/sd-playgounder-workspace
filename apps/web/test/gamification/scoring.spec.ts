import { describe, expect, it } from 'vitest';
import { simulate } from '@sdp/engine';
import { ALL_PROBLEM_IDS, getProblem, isProblemSolved, toWorkload } from '@sdp/problems';
import {
  achievementEventKey,
  challengeEventKey,
  evaluateSubmission,
  parseSubmissionBody,
} from '../../src/lib/gamification/scoring';

describe('evaluateSubmission', () => {
  it.each(ALL_PROBLEM_IDS)('a solução de referência de "%s" resolve o desafio no servidor', (problemId) => {
    const problem = getProblem(problemId)!;
    expect(evaluateSubmission(problem, problem.referenceSolution.design).solved).toBe(true);
  });

  it('dá o mesmo veredito que o canvas, calculando tudo do próprio problema', () => {
    const problem = getProblem(ALL_PROBLEM_IDS[0]!)!;
    const design = problem.referenceSolution.design;
    const workload = toWorkload(problem);
    const referenceCostUsd = simulate(design, workload).cost.monthlyTotal;
    const clientResult = simulate(design, workload, { latencyBudgetMs: problem.latencyBudgetMs, referenceCostUsd });
    const evaluation = evaluateSubmission(problem, design);
    expect(evaluation.result).toEqual(clientResult);
    expect(evaluation.solved).toBe(isProblemSolved(problem, clientResult, design));
  });

  it('um design que não passa a rubrica não resolve', () => {
    const problem = getProblem(ALL_PROBLEM_IDS[0]!)!;
    const lonelyApp = { nodes: [{ id: 'app', type: 'app_server' as const, replicas: 1 }], edges: [], entryNodeIds: ['app'] };
    const evaluation = evaluateSubmission(problem, lonelyApp);
    expect(evaluation.solved).toBe(false);
    expect(evaluation.solvedWithoutSpof).toBe(false);
  });

  it('solvedWithoutSpof só quando resolve e não há violação de SPOF', () => {
    for (const problemId of ALL_PROBLEM_IDS) {
      const problem = getProblem(problemId)!;
      const evaluation = evaluateSubmission(problem, problem.referenceSolution.design);
      const hasSpof = evaluation.result.violations.some((v) => v.type === 'spof');
      expect(evaluation.solvedWithoutSpof).toBe(evaluation.solved && !hasSpof);
    }
  });
});

describe('parseSubmissionBody', () => {
  it('fica só com problemId e design — ignora resultado, carga e nota alegados', () => {
    const design = { nodes: [] };
    expect(parseSubmissionBody({ problemId: 'url-shortener', design, result: { forged: true }, score: 100, workload: {} })).toEqual({
      problemId: 'url-shortener',
      design,
    });
  });

  it.each([null, 'x', {}, { problemId: '' }, { problemId: 7 }])('recusa corpo sem problemId (%j)', (body) => {
    expect(parseSubmissionBody(body)).toBeNull();
  });
});

describe('chaves de evento', () => {
  it('uma por desafio e uma por conquista', () => {
    expect(challengeEventKey('url-shortener')).toBe('challenge:url-shortener');
    expect(achievementEventKey('no-spof')).toBe('achievement:no-spof');
  });
});
