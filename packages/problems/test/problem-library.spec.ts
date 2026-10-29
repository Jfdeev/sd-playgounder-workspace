import { describe, expect, it } from 'vitest';
import { simulate, type Design } from '@sdp/engine';
import { ALL_PROBLEMS, getProblem, toWorkload, type Problem } from '../src/index.js';

/** Ids dos critérios que falham ao simular `design` na escala oficial do problema. */
function failingCriteria(problem: Problem, design: Design): string[] {
  const result = simulate(design, toWorkload(problem));
  return problem.rubric.filter((criterion) => !criterion.evaluate(result, design)).map((criterion) => criterion.id);
}

function withReplicas(design: Design, nodeId: string, replicas: number): Design {
  expect(design.nodes.some((node) => node.id === nodeId), `nó "${nodeId}" existe na referência`).toBe(true);
  return { ...design, nodes: design.nodes.map((node) => (node.id === nodeId ? { ...node, replicas } : node)) };
}

// Os 3 problemas anteriores ao M4.2 ficam como estão (a referência do Feed roda em ρ 0,93 desde o M2).
const PRE_M42 = ['url-shortener', 'social-feed', 'ecommerce-checkout'];
const NEW_PROBLEMS = ALL_PROBLEMS.filter((problem) => !PRE_M42.includes(problem.id));

describe('M4.2 FR-003: nenhuma referência nova roda perto da saturação', () => {
  it('são 9 problemas novos', () => {
    expect(NEW_PROBLEMS).toHaveLength(9);
  });

  it.each(NEW_PROBLEMS)('$id: todo nó da referência fica com ρ ≤ 0,8', (problem) => {
    const result = simulate(problem.referenceSolution.design, toWorkload(problem));
    for (const [nodeId, node] of Object.entries(result.nodes)) {
      expect(node.utilization, nodeId).toBeLessThanOrEqual(0.8);
    }
  });
});

describe('M4.2 SC-002: o design ingênuo (componente central com 1 réplica) satura', () => {
  it.each([
    ['rate-limiter', 'app-server-1'],
    ['leaderboard', 'worker-1'],
    ['notifications', 'worker-1'],
    ['realtime-chat', 'app-server-1'],
    ['video-streaming', 'object-storage-1'],
    ['web-crawler', 'worker-1'],
    ['pix-payment', 'spi-1'],
    ['ride-matching', 'location-service-1'],
    ['ad-click-aggregator', 'analytics-1'],
  ])('%s: %s com 1 réplica', (problemId, nodeId) => {
    const problem = getProblem(problemId)!;
    expect(failingCriteria(problem, withReplicas(problem.referenceSolution.design, nodeId, 1))).toContain('no-saturated-node');
  });
});

describe('Matching de corridas: location-off-sql', () => {
  const problem = getProblem('ride-matching')!;
  const reference = problem.referenceSolution.design;

  it('a referência manda menos de 30% da carga ao SQL', () => {
    expect(failingCriteria(problem, reference)).not.toContain('location-off-sql');
  });

  it('gravar a posição no SQL em vez do Cache falha o critério', () => {
    const toSql: Design = {
      ...reference,
      edges: reference.edges.map((edge) => (edge.id === 'e3' ? { ...edge, to: 'sql-primary-1' } : edge)),
    };
    expect(failingCriteria(problem, toSql)).toContain('location-off-sql');
  });

  it('sem nó de entrada não passa (nada a comparar)', () => {
    expect(failingCriteria(problem, { ...reference, entryNodeIds: [] })).toContain('location-off-sql');
    expect(failingCriteria(problem, { ...reference, entryNodeIds: ['fantasma'] })).toContain('location-off-sql');
  });
});
