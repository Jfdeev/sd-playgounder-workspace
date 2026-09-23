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
  it('contém exatamente os 3 problemas completos do catálogo', () => {
    expect(ALL_PROBLEM_IDS).toHaveLength(3);
    expect(ALL_PROBLEM_IDS).toContain('url-shortener');
    expect(ALL_PROBLEM_IDS).toContain('social-feed');
    expect(ALL_PROBLEM_IDS).toContain('ecommerce-checkout');
  });
});

describe('todo problema do catálogo tem rubrica e dicas não-vazias', () => {
  it.each(['url-shortener', 'social-feed', 'ecommerce-checkout'])('%s', (id) => {
    const problem = getProblem(id);
    expect(problem?.rubric.length).toBeGreaterThan(0);
    expect(problem?.hints.length).toBeGreaterThan(0);
    const criterionIds = new Set(problem?.rubric.map((c) => c.id));
    expect(criterionIds.size).toBe(problem?.rubric.length); // ids únicos
  });
});

describe('Problem.latencyBudgetMs (M2) fica consistente com o critério de rubrica "latency-p99"', () => {
  it.each(['url-shortener', 'social-feed', 'ecommerce-checkout'])('%s', (id) => {
    const problem = getProblem(id);
    if (!problem) throw new Error(`problema "${id}" não encontrado — catálogo quebrado`);

    const criterion = problem.rubric.find((c) => c.id === 'latency-p99');
    if (!criterion) throw new Error(`problema "${id}" não tem critério "latency-p99" na rubrica`);

    // O critério real é uma função opaca sobre SimulationResult inteiro — fixture mínima só com o
    // que 'latency-p99' de fato lê (path.latency.p99), pra provar que o número declarado em
    // latencyBudgetMs é exatamente o limiar que o critério usa, sem duplicar lógica de simulação.
    const fixture = (p99: number) => ({ path: { latency: { p99 } } }) as never;
    expect(criterion.evaluate(fixture(problem.latencyBudgetMs), {} as never)).toBe(true);
    expect(criterion.evaluate(fixture(problem.latencyBudgetMs + 0.01), {} as never)).toBe(false);
  });
});
