import { simulate } from '@sdp/engine';
import { toWorkload, type Problem } from '@sdp/problems';

export type ScoreContext = { latencyBudgetMs: number | null; referenceCostUsd: number | null };

/**
 * Insumos de score que dependem do desafio (M2): o orçamento de latência e o custo mensal da própria
 * solução de referência na escala oficial. Fora de um desafio, `null` (scores/calculate.ts trata).
 * Usado pelo canvas e pelo narrador, que recalcula o resultado no servidor (relatório de segurança, item 2).
 */
export function scoreContextFor(problem: Problem | null): ScoreContext {
  if (!problem) return { latencyBudgetMs: null, referenceCostUsd: null };
  return {
    latencyBudgetMs: problem.latencyBudgetMs,
    referenceCostUsd: simulate(problem.referenceSolution.design, toWorkload(problem)).cost.monthlyTotal,
  };
}
