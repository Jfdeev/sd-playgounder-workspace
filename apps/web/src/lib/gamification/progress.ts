import { isAchievementId, type AchievementId } from './achievements';
import { levelForXp, type LevelProgress } from './levels';
import { computeStreak, type Streak } from './streak';

/**
 * Progresso derivado (M2.8, data-model.md "Derivados"): nada disso é guardado — sai sempre dos
 * eventos de pontuação imutáveis e dos dias de atividade. Uma derivação só, usada pela API, pelo
 * painel e pelo perfil público.
 */

export type ScoringEventRow = { type: string; problemId: string | null; eventKey: string; xp: number; createdAt: Date };

export type Progress = LevelProgress & {
  xp: number;
  solved: { problemId: string; solvedAt: Date }[];
  achievements: { id: AchievementId; unlockedAt: Date }[];
  streak: Streak;
};

const ACHIEVEMENT_PREFIX = 'achievement:';

export function buildProgress(events: readonly ScoringEventRow[], activityDays: readonly string[], today: string): Progress {
  const xp = events.reduce((total, event) => total + event.xp, 0);
  const solved = events
    .filter((event) => event.type === 'challenge' && event.problemId !== null)
    .map((event) => ({ problemId: event.problemId!, solvedAt: event.createdAt }));
  const achievements = events.flatMap((event) => {
    const id = event.eventKey.slice(ACHIEVEMENT_PREFIX.length);
    return event.type === 'achievement' && isAchievementId(id) ? [{ id, unlockedAt: event.createdAt }] : [];
  });
  return { xp, ...levelForXp(xp), solved, achievements, streak: computeStreak(activityDays, today) };
}

/** `Progress` como chega ao cliente pela API (datas viram strings ISO no JSON). */
export type ProgressJson = Omit<Progress, 'solved' | 'achievements'> & {
  solved: { problemId: string; solvedAt: string }[];
  achievements: { id: AchievementId; unlockedAt: string }[];
};
