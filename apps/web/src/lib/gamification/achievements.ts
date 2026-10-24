/**
 * Conquistas iniciais do M2.8 (content-draft.md §6, aprovado pelo autor). Todas dependem só de fatos
 * verificados pelo servidor; cada uma desbloqueia uma vez (garantido pela chave única do evento
 * `achievement:<id>` — aqui só se decide quais condições valem).
 */

export const ACHIEVEMENTS = [
  { id: 'first-challenge', name: 'Primeiro desafio', condition: 'Resolver qualquer desafio.' },
  { id: 'all-challenges', name: 'Catálogo completo', condition: 'Ter resolvido todos os desafios do catálogo.' },
  { id: 'no-spof', name: 'Sem ponto único de falha', condition: 'Resolver um desafio com um design sem nenhum ponto único de falha.' },
  { id: 'streak-3', name: '3 dias seguidos', condition: 'Chegar a uma ofensiva de 3 dias.' },
  { id: 'streak-7', name: 'Uma semana', condition: 'Chegar a uma ofensiva de 7 dias.' },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

export type VerifiedState = {
  /** Desafios já resolvidos (incluindo o desta submissão, se resolveu). */
  solvedProblemIds: readonly string[];
  allProblemIds: readonly string[];
  /** Esta submissão resolveu o desafio e o resultado do servidor não tem nenhuma violação de SPOF. */
  solvedWithoutSpof: boolean;
  currentStreak: number;
};

const CONDITIONS: Record<AchievementId, (state: VerifiedState) => boolean> = {
  'first-challenge': (s) => s.solvedProblemIds.length > 0,
  'all-challenges': (s) => s.allProblemIds.length > 0 && s.allProblemIds.every((id) => s.solvedProblemIds.includes(id)),
  'no-spof': (s) => s.solvedWithoutSpof,
  'streak-3': (s) => s.currentStreak >= 3,
  'streak-7': (s) => s.currentStreak >= 7,
};

/** Ids de conquista cuja condição vale neste estado (o banco ignora as já desbloqueadas). */
export function achievementsUnlockedBy(state: VerifiedState): AchievementId[] {
  return ACHIEVEMENTS.filter((achievement) => CONDITIONS[achievement.id](state)).map((achievement) => achievement.id);
}

export function isAchievementId(value: string): value is AchievementId {
  return ACHIEVEMENTS.some((achievement) => achievement.id === value);
}
