import { describe, expect, it } from 'vitest';
import { isChallengeUnlocked } from '../src/lib/challenge-progression';

const ORDER = ['a', 'b', 'c'];

describe('isChallengeUnlocked', () => {
  it('o primeiro desafio da ordem está sempre destravado, mesmo sem nada completo', () => {
    expect(isChallengeUnlocked('a', ORDER, [])).toBe(true);
  });

  it('o segundo desafio só destrava depois do primeiro completo', () => {
    expect(isChallengeUnlocked('b', ORDER, [])).toBe(false);
    expect(isChallengeUnlocked('b', ORDER, ['a'])).toBe(true);
  });

  it('o terceiro desafio precisa do segundo completo — completar só o primeiro não basta', () => {
    expect(isChallengeUnlocked('c', ORDER, ['a'])).toBe(false);
    expect(isChallengeUnlocked('c', ORDER, ['a', 'b'])).toBe(true);
  });

  it('um id desconhecido (fora da ordem) nunca está destravado', () => {
    expect(isChallengeUnlocked('desconhecido', ORDER, ORDER)).toBe(false);
  });

  it('completar um desafio fora de ordem não destrava o seguinte (só o predecessor imediato conta)', () => {
    expect(isChallengeUnlocked('c', ORDER, ['c'])).toBe(false);
  });
});
