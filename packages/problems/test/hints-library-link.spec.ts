import { describe, expect, it } from 'vitest';
import { getLibraryEntry } from '@sdp/knowledge';
import { ALL_PROBLEM_IDS, getProblem } from '../src/index.js';

describe('Hint.libraryEntryId (M2.7, US4)', () => {
  it('todo libraryEntryId de toda dica resolve para uma entrada real da biblioteca — nunca link morto', () => {
    for (const problemId of ALL_PROBLEM_IDS) {
      for (const hint of getProblem(problemId)!.hints) {
        if (hint.libraryEntryId !== undefined) {
          expect(getLibraryEntry(hint.libraryEntryId), `${problemId}/${hint.id}`).toBeDefined();
        }
      }
    }
  });

  it.each([
    ['url-shortener', 'srp'],
    ['social-feed', 'srp'],
    ['ecommerce-checkout', 'dip'],
  ])('%s: a dica de responsabilidade/acoplamento aponta para a entrada "%s"', (problemId, entryId) => {
    const hint = getProblem(problemId)!.hints.find((h) => h.id === 'responsibility-coupling');
    expect(hint?.libraryEntryId).toBe(entryId);
  });

  it('uma dica que não cita um princípio não tem libraryEntryId (nenhum link inventado)', () => {
    const hint = getProblem('url-shortener')!.hints.find((h) => h.id === 'why-high-latency');
    expect(hint).toBeDefined();
    expect(hint?.libraryEntryId).toBeUndefined();
  });

  it('toda dica com libraryEntryId também cita a obra (source) — o link nunca aparece sem atribuição', () => {
    for (const problemId of ALL_PROBLEM_IDS) {
      for (const hint of getProblem(problemId)!.hints) {
        if (hint.libraryEntryId !== undefined) expect(hint.source).toBeDefined();
      }
    }
  });
});
