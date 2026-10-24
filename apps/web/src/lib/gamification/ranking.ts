/**
 * Ordem do ranking (M2.8, content-draft.md §7): XP decrescente → quem chegou nesse XP primeiro
 * (data do último evento que deu XP, crescente; quem nunca ganhou XP vai por último) → apelido em
 * ordem alfabética. Determinística (FR-019): a mesma entrada sempre produz a mesma ordem.
 */

export type RankingEntry = { nickname: string; xp: number; lastXpAt: Date | null };

function compareLastXpAt(a: Date | null, b: Date | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.getTime() - b.getTime();
}

export function sortRanking<T extends RankingEntry>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) => b.xp - a.xp || compareLastXpAt(a.lastXpAt, b.lastXpAt) || a.nickname.localeCompare(b.nickname),
  );
}
