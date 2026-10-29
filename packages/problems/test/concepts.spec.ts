import { describe, expect, it } from 'vitest';
import { getLibraryEntry, LIBRARY_ENTRIES } from '@sdp/knowledge';
import { ALL_PROBLEMS, problemsForConcept } from '../src/index.js';

const CONCEPT_IDS = LIBRARY_ENTRIES.filter((entry) => entry.category === 'concepts').map((entry) => entry.id);

describe('Problem.concepts (M4.3, FR-003)', () => {
  it.each([...ALL_PROBLEMS])('$id: exercita ao menos 1 conceito, todos existentes e sem repetição', (problem) => {
    expect(problem.concepts.length).toBeGreaterThan(0);
    expect(new Set(problem.concepts).size).toBe(problem.concepts.length);
    for (const id of problem.concepts) expect(getLibraryEntry(id)?.category, id).toBe('concepts');
  });
});

describe('problemsForConcept (M4.3, FR-004)', () => {
  it('bate com os totais do mapa aprovado', () => {
    const totals = Object.fromEntries(CONCEPT_IDS.map((id) => [id, problemsForConcept(id).length]));
    expect(totals).toEqual({
      caching: 5, queues: 6, backpressure: 3, 'fan-out': 2, idempotency: 2, transactions: 2,
      'cap-pacelc': 2, redundancy: 2, pubsub: 1, partitioning: 1, 'stream-processing': 1,
      replication: 0, consensus: 0,
    });
  });

  it('devolve na ordem do catálogo, derivado de Problem.concepts', () => {
    expect(problemsForConcept('idempotency').map((p) => p.id)).toEqual(['notifications', 'pix-payment']);
  });

  it('conceito desconhecido não tem problema', () => {
    expect(problemsForConcept('fantasma')).toEqual([]);
  });
});
