import { describe, expect, it } from 'vitest';
import { ALL_PROBLEMS } from '@sdp/problems';
import { blockingLevel, isChallengeUnlocked } from '../src/lib/challenge-progression';

const CATALOG = [
  { id: 'b1', level: 'basic' },
  { id: 'b2', level: 'basic' },
  { id: 'i1', level: 'intermediate' },
  { id: 'i2', level: 'intermediate' },
  { id: 'a1', level: 'advanced' },
] as const;

describe('isChallengeUnlocked — por nível (M4.2)', () => {
  it('o nível básico está sempre aberto, mesmo sem nada resolvido', () => {
    expect(isChallengeUnlocked('b1', CATALOG, [])).toBe(true);
    expect(isChallengeUnlocked('b2', CATALOG, [])).toBe(true);
  });

  it('resolver qualquer problema básico abre o nível intermediário inteiro', () => {
    expect(isChallengeUnlocked('i1', CATALOG, [])).toBe(false);
    expect(isChallengeUnlocked('i1', CATALOG, ['b2'])).toBe(true);
    expect(isChallengeUnlocked('i2', CATALOG, ['b2'])).toBe(true);
  });

  it('o avançado precisa de um intermediário resolvido — básico não basta', () => {
    expect(isChallengeUnlocked('a1', CATALOG, ['b1', 'b2'])).toBe(false);
    expect(isChallengeUnlocked('a1', CATALOG, ['b1', 'i2'])).toBe(true);
  });

  it('um id desconhecido nunca está aberto', () => {
    expect(isChallengeUnlocked('desconhecido', CATALOG, CATALOG.map((p) => p.id))).toBe(false);
  });
});

describe('blockingLevel', () => {
  it('diz qual nível falta resolver, ou null quando está aberto', () => {
    expect(blockingLevel('b1', CATALOG, [])).toBeNull();
    expect(blockingLevel('i1', CATALOG, [])).toBe('basic');
    expect(blockingLevel('a1', CATALOG, ['b1'])).toBe('intermediate');
    expect(blockingLevel('a1', CATALOG, ['i1'])).toBeNull();
  });

  it('id desconhecido não tem nível bloqueando (quem decide é isChallengeUnlocked)', () => {
    expect(blockingLevel('desconhecido', CATALOG, [])).toBeNull();
  });
});

describe('a regra nova não fecha nada que a antiga abria (spec, US2 cenário 4)', () => {
  // Regra antiga: fila Encurtador → Feed → Checkout, cada um abria com o anterior resolvido.
  const OLD_ORDER = ['url-shortener', 'social-feed', 'ecommerce-checkout'];
  const subsets = [[], ['url-shortener'], ['url-shortener', 'social-feed'], ['url-shortener', 'social-feed', 'ecommerce-checkout']];

  it.each(subsets.map((solved) => [solved.join(', ') || 'nada', solved] as const))('resolvido: %s', (_label, solved) => {
    OLD_ORDER.forEach((id, index) => {
      const openBefore = index === 0 || solved.includes(OLD_ORDER[index - 1]!);
      if (openBefore) expect(isChallengeUnlocked(id, ALL_PROBLEMS, solved), id).toBe(true);
    });
  });
});
