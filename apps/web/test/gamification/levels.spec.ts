import { describe, expect, it } from 'vitest';
import { levelForXp, minXpForLevel } from '../../src/lib/gamification/levels';

describe('minXpForLevel', () => {
  it('segue a curva aprovada: 0, 100, 300, 600, 1000', () => {
    expect([1, 2, 3, 4, 5].map(minXpForLevel)).toEqual([0, 100, 300, 600, 1000]);
  });
});

describe('levelForXp', () => {
  it.each([
    [0, { level: 1, xpIntoLevel: 0, xpForNextLevel: 100 }],
    [99, { level: 1, xpIntoLevel: 99, xpForNextLevel: 100 }],
    [100, { level: 2, xpIntoLevel: 0, xpForNextLevel: 200 }],
    [299, { level: 2, xpIntoLevel: 199, xpForNextLevel: 200 }],
    [300, { level: 3, xpIntoLevel: 0, xpForNextLevel: 300 }],
    [1000, { level: 5, xpIntoLevel: 0, xpForNextLevel: 500 }],
  ])('%i XP', (xp, expected) => {
    expect(levelForXp(xp)).toEqual(expected);
  });

  it('é determinístico (FR-006)', () => {
    expect(levelForXp(450)).toEqual(levelForXp(450));
  });

  it.each([-1, 1.5, Number.NaN])('rejeita XP inválido (%s)', (xp) => {
    expect(() => levelForXp(xp)).toThrow(RangeError);
  });
});
