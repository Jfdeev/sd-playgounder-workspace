import { describe, expect, it } from 'vitest';
import { simulate } from '@sdp/engine';
import { getProblem, toWorkload } from '@sdp/problems';
import { narratorCacheKey, parseNarratorRequest, parseWorkload, WORKLOAD_LIMITS } from '../src/lib/narrator-request';
import { scoreContextFor } from '../src/lib/simulation-context';

const problem = getProblem('url-shortener')!;
const design = problem.referenceSolution.design;
const workload = toWorkload(problem);

describe('parseNarratorRequest (relatório de segurança, itens 2 e 3)', () => {
  it('aceita design + carga, com ou sem desafio', () => {
    const free = parseNarratorRequest({ design, workload });
    expect(free).toEqual({ ok: true, request: { design, workload, problem: null } });
    const inChallenge = parseNarratorRequest({ design, workload, problemId: 'url-shortener' });
    expect(inChallenge.ok && inChallenge.request.problem).toBe(problem);
    expect(parseNarratorRequest({ design, workload, problemId: null })).toMatchObject({ ok: true });
  });

  it('ignora um `result` enviado pelo navegador (o servidor recalcula)', () => {
    const parsed = parseNarratorRequest({ design, workload, result: { forjado: true } });
    expect(parsed.ok && Object.keys(parsed.request)).toEqual(['design', 'workload', 'problem']);
  });

  it('recusa corpo, design, carga ou desafio inválidos', () => {
    expect(parseNarratorRequest(null)).toEqual({ ok: false, reason: 'corpo inválido' });
    expect(parseNarratorRequest({ design: { nodes: 'x' }, workload })).toMatchObject({ ok: false });
    expect(parseNarratorRequest({ design, workload: { rps: -1 } })).toEqual({ ok: false, reason: 'carga inválida' });
    expect(parseNarratorRequest({ design, workload, problemId: 'fantasma' })).toEqual({ ok: false, reason: 'desafio desconhecido' });
    expect(parseNarratorRequest({ design, workload, problemId: 42 })).toEqual({ ok: false, reason: 'desafio desconhecido' });
  });

  it('recusa design grande demais (mesmo limite das submissões)', () => {
    const nodes = Array.from({ length: 61 }, (_, i) => ({ id: `n${i}`, type: 'app_server', replicas: 1 }));
    expect(parseNarratorRequest({ design: { nodes, edges: [], entryNodeIds: ['n0'] }, workload })).toMatchObject({ ok: false });
  });
});

describe('parseWorkload', () => {
  const valid = { rps: 100, readWriteRatio: 0.8, payloadBytes: 1024, peakMultiplier: 1 };

  it('aceita uma carga válida e devolve só os campos conhecidos', () => {
    expect(parseWorkload({ ...valid, extra: 'x' })).toEqual(valid);
  });

  it.each([
    ['rps zero', { ...valid, rps: 0 }],
    ['rps acima do limite', { ...valid, rps: WORKLOAD_LIMITS.maxRps + 1 }],
    ['rps infinito', { ...valid, rps: Number.POSITIVE_INFINITY }],
    ['razão acima de 1', { ...valid, readWriteRatio: 1.5 }],
    ['payload negativo', { ...valid, payloadBytes: -1 }],
    ['pico zero', { ...valid, peakMultiplier: 0 }],
    ['pico acima do limite', { ...valid, peakMultiplier: WORKLOAD_LIMITS.maxPeakMultiplier + 1 }],
    ['texto no lugar de número', { ...valid, rps: '100' }],
  ])('recusa %s', (_label, raw) => {
    expect(parseWorkload(raw)).toBeNull();
  });

  it('recusa o que não é objeto', () => {
    expect(parseWorkload([1, 2])).toBeNull();
  });
});

describe('narratorCacheKey', () => {
  it('separa o mesmo design dentro e fora de um desafio', () => {
    expect(narratorCacheKey('abc', null)).toBe('abc:livre');
    expect(narratorCacheKey('abc', problem)).toBe('abc:url-shortener');
  });
});

describe('scoreContextFor', () => {
  it('fora de um desafio, sem orçamento nem custo de referência', () => {
    expect(scoreContextFor(null)).toEqual({ latencyBudgetMs: null, referenceCostUsd: null });
  });

  it('num desafio, o orçamento dele e o custo da própria referência na escala oficial', () => {
    expect(scoreContextFor(problem)).toEqual({
      latencyBudgetMs: problem.latencyBudgetMs,
      referenceCostUsd: simulate(design, workload).cost.monthlyTotal,
    });
  });
});
