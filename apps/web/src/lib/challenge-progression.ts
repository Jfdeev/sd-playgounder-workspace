/**
 * Progressão travada de desafios — apps/web/src/lib/challenge-progression.ts
 *
 * Regra pedida pelo autor: "os próximos desafios ficam bloqueados até completar o primeiro" —
 * função pura sobre a ordem do catálogo (`ALL_PROBLEM_IDS`, de `@sdp/problems`) e o conjunto de
 * ids já completados (persistido em `stores/progression-store.ts`). Um desafio N só destrava
 * quando o desafio N-1 estiver em `completedIds` — o primeiro da lista está sempre destravado.
 */

export function isChallengeUnlocked(
  problemId: string,
  orderedProblemIds: readonly string[],
  completedIds: ReadonlySet<string>,
): boolean {
  const index = orderedProblemIds.indexOf(problemId);
  if (index === -1) return false; // id desconhecido — nunca destravado
  if (index === 0) return true; // primeiro desafio sempre disponível
  const previousId = orderedProblemIds[index - 1]!;
  return completedIds.has(previousId);
}
