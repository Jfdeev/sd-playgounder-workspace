import { describe, expect, it } from 'vitest';
import { sortRanking, type RankingEntry } from '../../src/lib/gamification/ranking';

const at = (iso: string) => new Date(iso);
const names = (entries: RankingEntry[]) => sortRanking(entries).map((e) => e.nickname);

describe('sortRanking (FR-019, content-draft §7)', () => {
  it('XP decrescente', () => {
    expect(names([
      { nickname: 'b', xp: 100, lastXpAt: at('2026-10-01') },
      { nickname: 'a', xp: 300, lastXpAt: at('2026-10-02') },
    ])).toEqual(['a', 'b']);
  });

  it('empate de XP: quem chegou nesse XP primeiro', () => {
    expect(names([
      { nickname: 'tarde', xp: 200, lastXpAt: at('2026-10-05') },
      { nickname: 'cedo', xp: 200, lastXpAt: at('2026-10-01') },
    ])).toEqual(['cedo', 'tarde']);
  });

  it('empate de XP e de data: ordem alfabética do apelido', () => {
    expect(names([
      { nickname: 'zeta', xp: 100, lastXpAt: at('2026-10-01') },
      { nickname: 'alfa', xp: 100, lastXpAt: at('2026-10-01') },
    ])).toEqual(['alfa', 'zeta']);
  });

  it('quem nunca ganhou XP vai depois, em ordem alfabética', () => {
    expect(names([
      { nickname: 'zero_b', xp: 0, lastXpAt: null },
      { nickname: 'zero_a', xp: 0, lastXpAt: null },
      { nickname: 'pontuou', xp: 0, lastXpAt: at('2026-10-01') },
    ])).toEqual(['pontuou', 'zero_a', 'zero_b']);
  });

  it('não muta a entrada e é determinístico', () => {
    const entries = [
      { nickname: 'b', xp: 1, lastXpAt: null },
      { nickname: 'a', xp: 1, lastXpAt: null },
    ];
    expect(names(entries)).toEqual(names([...entries].reverse()));
    expect(entries.map((e) => e.nickname)).toEqual(['b', 'a']);
  });
});
