import { describe, expect, it } from 'vitest';
import { simulate } from '../src/index.js';
import { ALL_DIMENSIONS } from '../src/types.js';
import type { Design, Workload } from '../src/types.js';

/**
 * FR-020 (M0) introduziu `scores` como placeholder zerado — M2 substitui isso por cálculo real
 * (`scores/calculate.ts`). Este teste só confirma o shape (as 7 chaves, valores numéricos no
 * intervalo 0-100); o comportamento de cada fórmula é testado em `test/scores/calculate.spec.ts`.
 */
describe('SimulationResult.scores — shape (M2)', () => {
  const design: Design = {
    entryNodeIds: ['app-1'],
    nodes: [{ id: 'app-1', type: 'app_server', replicas: 2 }],
    edges: [],
  };
  const workload: Workload = { rps: 100, readWriteRatio: 0.9, payloadBytes: 1024, peakMultiplier: 1 };

  it('retorna as 7 dimensões, cada uma um número entre 0 e 100', () => {
    const result = simulate(design, workload);

    expect(Object.keys(result.scores).sort()).toEqual([...ALL_DIMENSIONS].sort());
    for (const dimension of ALL_DIMENSIONS) {
      expect(result.scores[dimension]).toBeGreaterThanOrEqual(0);
      expect(result.scores[dimension]).toBeLessThanOrEqual(100);
    }
  });

  it('sem scoreContext (fora de um desafio), Latência e Custo retornam 0 — nunca um limiar inventado', () => {
    const result = simulate(design, workload);

    expect(result.scores.latencia).toBe(0);
    expect(result.scores.custo).toBe(0);
  });
});
