/**
 * Progresso por conceito (M4.3, US3) — apps/web/src/lib/gamification/concept-progress.ts
 *
 * Domínio de um conceito = problemas resolvidos que o exercitam ÷ problemas que o exercitam. Derivado
 * de `Problem.concepts` e dos desafios resolvidos que o progresso já carrega — nada novo no banco.
 */

import type { Problem } from '@sdp/problems';

export type ConceptProgress = { conceptId: string; solved: number; total: number };

/**
 * Um item por conceito que algum problema exercita, na ordem de `conceptIds` (a ordem da biblioteca);
 * conceito sem problema não entra (spec, edge cases).
 */
export function conceptProgress(
  conceptIds: readonly string[],
  problems: readonly Pick<Problem, 'id' | 'concepts'>[],
  solvedProblemIds: readonly string[],
): ConceptProgress[] {
  return conceptIds
    .map((conceptId) => {
      const exercising = problems.filter((problem) => problem.concepts.includes(conceptId));
      const solved = exercising.filter((problem) => solvedProblemIds.includes(problem.id)).length;
      return { conceptId, solved, total: exercising.length };
    })
    .filter((item) => item.total > 0);
}

/** Pontos fracos: os de menor fração entre os incompletos (empate: todos). Vazio se tudo está completo. */
export function weakestConcepts(progress: readonly ConceptProgress[]): ConceptProgress[] {
  const incomplete = progress.filter((item) => item.solved < item.total);
  if (incomplete.length === 0) return [];
  const fraction = (item: ConceptProgress) => item.solved / item.total;
  const lowest = Math.min(...incomplete.map(fraction));
  return incomplete.filter((item) => fraction(item) === lowest);
}
