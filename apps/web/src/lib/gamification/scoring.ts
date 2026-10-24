import { simulate, type Design, type SimulationResult } from '@sdp/engine';
import { isProblemSolved, toWorkload, type Problem } from '@sdp/problems';

/**
 * Regras de pontuação do M2.8 (content-draft.md §1 e §5, aprovado pelo autor) e a avaliação de uma
 * submissão pelo servidor. `evaluateSubmission` repete exatamente o que o canvas faz ao submeter —
 * carga derivada do próprio problema, custo de referência da `referenceSolution`, `simulate` e
 * rubrica —, então o veredito do servidor é o mesmo do cliente para o mesmo design (Constitution
 * III), mas sem confiar em nada que o cliente calculou (FR-002).
 */

export const CHALLENGE_XP = 100;
export const ACHIEVEMENT_XP = 0;
/** M3: resolver um incidente vale o mesmo que um desafio (decisão do autor, 2026-10-24). */
export const INCIDENT_XP = 100;
export const SUBMISSION_RATE_LIMIT = { maxSubmissions: 10, windowMs: 60_000 } as const;

export const challengeEventKey = (problemId: string) => `challenge:${problemId}`;
export const achievementEventKey = (achievementId: string) => `achievement:${achievementId}`;

export type SubmissionEvaluation = {
  result: SimulationResult;
  solved: boolean;
  /** Resolveu e o resultado do servidor não tem nenhuma violação de ponto único de falha. */
  solvedWithoutSpof: boolean;
};

export function evaluateSubmission(problem: Problem, design: Design): SubmissionEvaluation {
  const workload = toWorkload(problem);
  const referenceCostUsd = simulate(problem.referenceSolution.design, workload).cost.monthlyTotal;
  const result = simulate(design, workload, { latencyBudgetMs: problem.latencyBudgetMs, referenceCostUsd });
  const solved = isProblemSolved(problem, result, design);
  return { result, solved, solvedWithoutSpof: solved && !result.violations.some((v) => v.type === 'spof') };
}

/** Do corpo da requisição só interessam `problemId` e `design` — resultado, carga ou nota alegados são ignorados. */
export function parseSubmissionBody(body: unknown): { problemId: string; design: unknown } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { problemId, design } = body as Record<string, unknown>;
  return typeof problemId === 'string' && problemId.length > 0 ? { problemId, design } : null;
}
