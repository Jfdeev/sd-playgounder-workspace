import { describe, expect, it } from 'vitest';
import { CLEAN_ARCHITECTURE, FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE, PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE } from '@sdp/knowledge';
import { ALL_PROBLEM_IDS, getProblem } from '../src/index.js';

const KNOWN_SOURCES = [
  CLEAN_ARCHITECTURE,
  FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE,
];

describe('Hint.source (M2.6, FR-003/FR-004)', () => {
  it.each(ALL_PROBLEM_IDS)('%s: tem pelo menos 1 hint citando uma fonte (prova positiva de FR-003)', (problemId) => {
    const problem = getProblem(problemId);
    expect(problem).toBeDefined();
    const hintsWithSource = problem!.hints.filter((hint) => hint.source !== undefined);
    expect(hintsWithSource.length).toBeGreaterThanOrEqual(1);
  });

  it('toda hint com source cita uma das 3 obras reais, nunca uma citação solta (FR-004)', () => {
    for (const problemId of ALL_PROBLEM_IDS) {
      const problem = getProblem(problemId)!;
      for (const hint of problem.hints) {
        if (hint.source !== undefined) {
          expect(KNOWN_SOURCES).toContain(hint.source);
        }
      }
    }
  });
});
