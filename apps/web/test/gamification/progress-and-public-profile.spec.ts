import { describe, expect, it } from 'vitest';
import { buildProgress, type ScoringEventRow } from '../../src/lib/gamification/progress';
import { toPublicProfile } from '../../src/lib/gamification/public-profile';

const day1 = new Date('2026-10-20T15:00:00Z');
const day2 = new Date('2026-10-22T15:00:00Z');

const events: ScoringEventRow[] = [
  { type: 'challenge', problemId: 'url-shortener', eventKey: 'challenge:url-shortener', xp: 100, createdAt: day1 },
  { type: 'achievement', problemId: null, eventKey: 'achievement:first-challenge', xp: 0, createdAt: day1 },
  { type: 'challenge', problemId: 'social-feed', eventKey: 'challenge:social-feed', xp: 100, createdAt: day2 },
  // conquista que não existe mais no catálogo: ignorada, nunca quebra o painel
  { type: 'achievement', problemId: null, eventKey: 'achievement:retired-badge', xp: 0, createdAt: day2 },
];

describe('buildProgress', () => {
  it('estado inicial explícito: nível 1, zero XP, listas vazias (US2 cenário 3)', () => {
    expect(buildProgress([], [], '2026-10-23')).toEqual({
      xp: 0,
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 100,
      solved: [],
      achievements: [],
      streak: { current: 0, best: 0 },
    });
  });

  it('XP, nível, desafios, conquistas e ofensiva saem só dos eventos e dias', () => {
    const progress = buildProgress(events, ['2026-10-22', '2026-10-23'], '2026-10-23');
    expect(progress.xp).toBe(200);
    expect(progress.level).toBe(2);
    expect(progress.solved).toEqual([
      { problemId: 'url-shortener', solvedAt: day1 },
      { problemId: 'social-feed', solvedAt: day2 },
    ]);
    expect(progress.achievements).toEqual([{ id: 'first-challenge', unlockedAt: day1 }]);
    expect(progress.streak).toEqual({ current: 2, best: 2 });
  });
});

describe('toPublicProfile (FR-018, SC-007)', () => {
  it('expõe só apelido, nível, XP, desafios, conquistas e ofensiva', () => {
    const profile = toPublicProfile('fulano', buildProgress(events, ['2026-10-23'], '2026-10-23'));
    expect(profile).toEqual({
      nickname: 'fulano',
      level: 2,
      xp: 200,
      solvedChallenges: [
        { problemId: 'url-shortener', solvedAt: day1.toISOString() },
        { problemId: 'social-feed', solvedAt: day2.toISOString() },
      ],
      achievements: [{ id: 'first-challenge', unlockedAt: day1.toISOString() }],
      streak: { current: 1, best: 1 },
    });
  });

  it('nunca deixa sair e-mail, nome, imagem nem design, mesmo se vierem junto', () => {
    const leaky = {
      ...buildProgress(events, [], '2026-10-23'),
      email: 'fulano@example.com',
      name: 'Fulano de Tal',
      image: 'https://example.com/a.png',
      design: { nodes: [], edges: [], entryNodeIds: [] },
    };
    const serialized = JSON.stringify(toPublicProfile('fulano', leaky));
    for (const forbidden of ['email', 'fulano@example.com', '"name"', 'Fulano de Tal', 'image', 'design']) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
