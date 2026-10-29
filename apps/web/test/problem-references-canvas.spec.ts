import { describe, expect, it } from 'vitest';
import { ALL_PROBLEMS } from '@sdp/problems';
import { forbiddenEdges } from './forbidden-edges';

// M4.2 FR-009: a solução de referência de todo desafio precisa caber no canvas — senão "Carregar no
// canvas" mostra algo que ninguém consegue montar à mão.
describe('soluções de referência dos desafios no canvas', () => {
  it.each(ALL_PROBLEMS.map((problem) => [problem.id, problem] as const))(
    '%s: toda aresta (e Cliente → entrada) é permitida por connection-rules.ts',
    (_id, problem) => {
      expect(forbiddenEdges(problem.referenceSolution.design)).toEqual([]);
    },
  );
});
