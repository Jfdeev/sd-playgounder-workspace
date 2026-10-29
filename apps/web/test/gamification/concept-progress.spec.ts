import { describe, expect, it } from 'vitest';
import { ALL_PROBLEMS } from '@sdp/problems';
import { conceptProgress, weakestConcepts } from '../../src/lib/gamification/concept-progress';

const PROBLEMS = [
  { id: 'p1', concepts: ['a', 'b'] },
  { id: 'p2', concepts: ['a'] },
  { id: 'p3', concepts: ['c'] },
];

describe('conceptProgress', () => {
  it('conta resolvidos ÷ total por conceito, na ordem dada', () => {
    expect(conceptProgress(['c', 'a', 'b'], PROBLEMS, ['p1'])).toEqual([
      { conceptId: 'c', solved: 0, total: 1 },
      { conceptId: 'a', solved: 1, total: 2 },
      { conceptId: 'b', solved: 1, total: 1 },
    ]);
  });

  it('deixa de fora conceito que nenhum problema exercita', () => {
    expect(conceptProgress(['a', 'sem-problema'], PROBLEMS, []).map((item) => item.conceptId)).toEqual(['a']);
  });

  it('ignora resolvidos que não exercitam o conceito', () => {
    expect(conceptProgress(['c'], PROBLEMS, ['p1', 'p2'])).toEqual([{ conceptId: 'c', solved: 0, total: 1 }]);
  });

  it('com o catálogo real: resolver o Encurtador conta para Caching e Redundância', () => {
    const progress = conceptProgress(['caching', 'redundancy', 'queues'], ALL_PROBLEMS, ['url-shortener']);
    expect(progress).toEqual([
      { conceptId: 'caching', solved: 1, total: 5 },
      { conceptId: 'redundancy', solved: 1, total: 2 },
      { conceptId: 'queues', solved: 0, total: 6 },
    ]);
  });
});

describe('weakestConcepts', () => {
  it('devolve os de menor fração entre os incompletos, com empate', () => {
    const progress = [
      { conceptId: 'a', solved: 1, total: 4 },
      { conceptId: 'b', solved: 2, total: 8 },
      { conceptId: 'c', solved: 1, total: 2 },
      { conceptId: 'd', solved: 3, total: 3 },
    ];
    expect(weakestConcepts(progress).map((item) => item.conceptId)).toEqual(['a', 'b']);
  });

  it('ignora conceitos completos mesmo quando outros estão em zero', () => {
    const progress = [
      { conceptId: 'a', solved: 0, total: 2 },
      { conceptId: 'b', solved: 1, total: 1 },
    ];
    expect(weakestConcepts(progress).map((item) => item.conceptId)).toEqual(['a']);
  });

  it('fica vazio quando tudo está completo', () => {
    expect(weakestConcepts([{ conceptId: 'a', solved: 2, total: 2 }])).toEqual([]);
  });
});
