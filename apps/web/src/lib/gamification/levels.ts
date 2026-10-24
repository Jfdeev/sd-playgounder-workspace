/**
 * Curva de níveis do M2.8 (content-draft.md §2, aprovado pelo autor) — o nível `L` começa em
 * `100 × (L−1) × L / 2` XP: cada nível pede 100 XP a mais que o anterior (0, 100, 300, 600, 1000…).
 * Função determinística do XP total (FR-006) — nunca guardada no banco, sempre derivada.
 */

const XP_STEP = 100;

export type LevelProgress = {
  level: number;
  /** XP acumulado dentro do nível atual. */
  xpIntoLevel: number;
  /** XP que o nível atual pede pra chegar ao próximo. */
  xpForNextLevel: number;
};

/** XP mínimo pra estar no nível `level` (≥ 1). */
export function minXpForLevel(level: number): number {
  return (XP_STEP * (level - 1) * level) / 2;
}

export function levelForXp(xp: number): LevelProgress {
  if (!Number.isInteger(xp) || xp < 0) {
    throw new RangeError(`XP deve ser um inteiro ≥ 0, recebido: ${xp}`);
  }
  let level = 1;
  while (minXpForLevel(level + 1) <= xp) level += 1;
  const levelStart = minXpForLevel(level);
  return { level, xpIntoLevel: xp - levelStart, xpForNextLevel: minXpForLevel(level + 1) - levelStart };
}
