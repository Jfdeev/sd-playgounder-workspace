/**
 * Progressão travada de desafios — apps/web/src/lib/challenge-progression.ts
 *
 * Por nível (M4.2, decisão do autor): o nível básico está sempre aberto; um nível abre quando há ao
 * menos um problema resolvido no nível anterior. Mesma função no cliente (menu) e no servidor
 * (`POST /api/submissions`). Só abre mais do que a regra antiga (fila: N abria com N-1 resolvido).
 */

import { PROBLEM_LEVELS, type Problem, type ProblemLevel } from '@sdp/problems';

type CatalogEntry = Pick<Problem, 'id' | 'level'>;

export const LEVEL_LABEL: Record<ProblemLevel, string> = { basic: 'Básico', intermediate: 'Intermediário', advanced: 'Avançado' };

/**
 * Nível em que falta resolver um problema para abrir `problemId`; `null` se já está aberto (ou se o id
 * não existe no catálogo — use `isChallengeUnlocked` para saber se dá pra entrar).
 *
 * `completedIds` como array, não `Set` — o chamador mais comum lê direto de um seletor Zustand, que
 * precisa devolver a mesma referência entre renders (um `new Set(...)` no seletor gera loop de
 * re-render).
 */
export function blockingLevel(
  problemId: string,
  catalog: readonly CatalogEntry[],
  completedIds: readonly string[],
): ProblemLevel | null {
  const problem = catalog.find((entry) => entry.id === problemId);
  if (!problem) return null;
  const previous = PROBLEM_LEVELS[PROBLEM_LEVELS.indexOf(problem.level) - 1];
  if (previous === undefined) return null; // nível básico, sempre aberto
  const solvedPrevious = catalog.some((entry) => entry.level === previous && completedIds.includes(entry.id));
  return solvedPrevious ? null : previous;
}

export function isChallengeUnlocked(
  problemId: string,
  catalog: readonly CatalogEntry[],
  completedIds: readonly string[],
): boolean {
  return catalog.some((entry) => entry.id === problemId) && blockingLevel(problemId, catalog, completedIds) === null;
}
