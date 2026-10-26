import { describe, expect, it } from 'vitest';
import { describeSubmissionOutcome, type SubmissionResponseBody } from '../../src/lib/gamification/submission-feedback';

const progress: SubmissionResponseBody['progress'] = {
  xp: 100, level: 2, xpIntoLevel: 0, xpForNextLevel: 200, solved: [], incidentsResolved: [], achievements: [], streak: { current: 1, best: 1 },
};

function body(overrides: Partial<SubmissionResponseBody> = {}): SubmissionResponseBody {
  return { solved: true, credited: { xp: 0, achievements: [] }, progress, ...overrides };
}

describe('describeSubmissionOutcome', () => {
  it('primeira resolução: XP confirmado pelo servidor e conquistas pelo nome', () => {
    expect(describeSubmissionOutcome(200, body({ credited: { xp: 100, achievements: ['first-challenge'] } }))).toEqual({
      tone: 'success',
      text: '+100 XP — desafio resolvido! Conquista: Primeiro desafio.',
    });
  });

  it('resolveu de novo: sem XP novo', () => {
    expect(describeSubmissionOutcome(200, body())?.text).toMatch(/já tinha resolvido/);
  });

  it('não resolveu: nada a dizer (a rubrica já mostra), a menos que tenha desbloqueado conquista', () => {
    expect(describeSubmissionOutcome(200, body({ solved: false }))).toBeNull();
    expect(describeSubmissionOutcome(200, body({ solved: false, credited: { xp: 0, achievements: ['streak-3'] } }))).toEqual({
      tone: 'success',
      text: 'Conquista: 3 dias seguidos.',
    });
  });

  it('conquista desconhecida aparece pelo id, sem quebrar', () => {
    expect(describeSubmissionOutcome(200, body({ credited: { xp: 100, achievements: ['nova'] } }))?.text).toContain('nova');
  });

  it.each([
    [401, /sessão expirou/],
    [429, /Muitas submissões/],
    [503, /Não deu pra registrar/],
    [500, /Não deu pra registrar/],
  ])('status %i avisa sem mostrar XP', (status, text) => {
    const feedback = describeSubmissionOutcome(status, null);
    expect(feedback?.tone).toBe('warning');
    expect(feedback?.text).toMatch(text);
    expect(feedback?.text).not.toMatch(/XP —/);
  });

  it('200 sem corpo legível é tratado como falha de registro', () => {
    expect(describeSubmissionOutcome(200, null)?.tone).toBe('warning');
  });
});
