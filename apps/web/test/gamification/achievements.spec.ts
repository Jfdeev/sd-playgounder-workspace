import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, achievementsUnlockedBy, isAchievementId, type VerifiedState } from '../../src/lib/gamification/achievements';

const ALL = ['a', 'b', 'c'];

function state(overrides: Partial<VerifiedState> = {}): VerifiedState {
  return { solvedProblemIds: [], allProblemIds: ALL, solvedWithoutSpof: false, currentStreak: 0, ...overrides };
}

describe('achievementsUnlockedBy', () => {
  it('sem nada verificado: nenhuma', () => {
    expect(achievementsUnlockedBy(state())).toEqual([]);
  });

  it('primeiro desafio resolvido', () => {
    expect(achievementsUnlockedBy(state({ solvedProblemIds: ['a'] }))).toEqual(['first-challenge']);
  });

  it('catálogo completo só com todos os desafios', () => {
    expect(achievementsUnlockedBy(state({ solvedProblemIds: ['a', 'b'] }))).not.toContain('all-challenges');
    expect(achievementsUnlockedBy(state({ solvedProblemIds: ['c', 'a', 'b'] }))).toContain('all-challenges');
    expect(achievementsUnlockedBy(state({ allProblemIds: [] }))).not.toContain('all-challenges');
  });

  it('sem SPOF vem da submissão atual verificada pelo servidor', () => {
    expect(achievementsUnlockedBy(state({ solvedProblemIds: ['a'], solvedWithoutSpof: true }))).toContain('no-spof');
  });

  it('ofensiva de 3 e de 7 dias', () => {
    expect(achievementsUnlockedBy(state({ currentStreak: 2 }))).toEqual([]);
    expect(achievementsUnlockedBy(state({ currentStreak: 3 }))).toEqual(['streak-3']);
    expect(achievementsUnlockedBy(state({ currentStreak: 7 }))).toEqual(['streak-3', 'streak-7']);
  });
});

describe('ACHIEVEMENTS', () => {
  it('são as 5 aprovadas no content-draft, com nome e condição', () => {
    expect(ACHIEVEMENTS.map((a) => a.id)).toEqual(['first-challenge', 'all-challenges', 'no-spof', 'streak-3', 'streak-7']);
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.condition.length).toBeGreaterThan(0);
    }
  });

  it('isAchievementId', () => {
    expect(isAchievementId('no-spof')).toBe(true);
    expect(isAchievementId('xp-farmer')).toBe(false);
  });
});
