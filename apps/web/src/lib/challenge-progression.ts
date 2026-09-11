/**
 * Progressão travada de desafios — apps/web/src/lib/challenge-progression.ts
 *
 * Regra pedida pelo autor: "os próximos desafios ficam bloqueados até completar o primeiro" —
 * função pura sobre a ordem do catálogo (`ALL_PROBLEM_IDS`, de `@sdp/problems`) e o conjunto de
 * ids já completados (persistido em `stores/progression-store.ts`). Um desafio N só destrava
 * quando o desafio N-1 estiver em `completedIds` — o primeiro da lista está sempre destravado.
 */

/**
 * `completedIds` como array, não `Set` — de propósito: o chamador mais comum (`challenge-
 * topbar.tsx`) lê direto de `useProgressionStore((s) => s.completedIds)`, e um seletor Zustand
 * MUST devolver a mesma referência entre renders quando o valor não mudou (v5 usa
 * `useSyncExternalStore` por baixo, que compara snapshots com `Object.is`); embrulhar num `new
 * Set(...)` dentro do seletor cria uma referência nova a cada render e gera loop de re-render
 * ("The result of getSnapshot should be cached"). `.includes()` num array pequeno (poucos
 * desafios) é suficiente — não precisa da performance de um `Set` aqui.
 */
export function isChallengeUnlocked(
  problemId: string,
  orderedProblemIds: readonly string[],
  completedIds: readonly string[],
): boolean {
  const index = orderedProblemIds.indexOf(problemId);
  if (index === -1) return false; // id desconhecido — nunca destravado
  if (index === 0) return true; // primeiro desafio sempre disponível
  const previousId = orderedProblemIds[index - 1]!;
  return completedIds.includes(previousId);
}
