import { describe, expect, it } from 'vitest';
import { ALL_PROBLEM_IDS, getProblem } from '../src/index.js';

describe('getProblem', () => {
  it('retorna o problema do encurtador de URL para o id "url-shortener"', () => {
    const problem = getProblem('url-shortener');
    expect(problem).toBeDefined();
    expect(problem?.id).toBe('url-shortener');
    expect(problem?.title).toBe('Encurtador de URL');
  });

  it('retorna undefined para um id inexistente', () => {
    expect(getProblem('problema-que-nao-existe')).toBeUndefined();
  });

  it('retorna undefined para uma string vazia', () => {
    expect(getProblem('')).toBeUndefined();
  });

  it('o problema do encurtador de URL tem enunciado não-vazio', () => {
    const problem = getProblem('url-shortener');
    expect(problem?.statement.length).toBeGreaterThan(0);
  });

  it('o problema do encurtador de URL tem ao menos 1 requisito funcional e 1 não-funcional', () => {
    const problem = getProblem('url-shortener');
    expect(problem?.functionalRequirements.length).toBeGreaterThan(0);
    expect(problem?.nonFunctionalRequirements.length).toBeGreaterThan(0);
  });

  it('a escala do problema do encurtador de URL tem valores plausíveis (> 0)', () => {
    const scale = getProblem('url-shortener')?.scale;
    expect(scale?.dau).toBeGreaterThan(0);
    expect(scale?.requestsPerUserPerDay).toBeGreaterThan(0);
    expect(scale?.avgPayloadBytes).toBeGreaterThan(0);
    expect(scale?.peakMultiplier).toBeGreaterThan(0);
    expect(scale?.readWriteRatio).toBeGreaterThan(0);
    expect(scale?.readWriteRatio).toBeLessThanOrEqual(1);
  });
});

describe('ALL_PROBLEM_IDS', () => {
  it('contém exatamente 1 problema neste marco (M1)', () => {
    expect(ALL_PROBLEM_IDS).toHaveLength(1);
    expect(ALL_PROBLEM_IDS).toContain('url-shortener');
  });
});
