import type { Progress } from './progress';

/**
 * Serializador do perfil público e do ranking (M2.8, FR-018, SC-007). Monta campo a campo — nunca
 * espalha (`...`) o objeto de entrada —, então e-mail, nome da conta, imagem ou design nunca saem
 * daqui, mesmo que alguém passe um objeto que os contenha.
 */

export type PublicProfile = {
  nickname: string;
  level: number;
  xp: number;
  solvedChallenges: { problemId: string; solvedAt: string }[];
  achievements: { id: string; unlockedAt: string }[];
  streak: { current: number; best: number };
};

export function toPublicProfile(nickname: string, progress: Progress): PublicProfile {
  return {
    nickname,
    level: progress.level,
    xp: progress.xp,
    solvedChallenges: progress.solved.map((s) => ({ problemId: s.problemId, solvedAt: s.solvedAt.toISOString() })),
    achievements: progress.achievements.map((a) => ({ id: a.id, unlockedAt: a.unlockedAt.toISOString() })),
    streak: { current: progress.streak.current, best: progress.streak.best },
  };
}
