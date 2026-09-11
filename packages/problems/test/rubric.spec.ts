import { describe, expect, it } from 'vitest';
import type { Design, Dimension, SimulationResult } from '@sdp/engine';
import { getProblem } from '../src/index.js';
import { isProblemSolved } from '../src/types.js';

// SimulationResult.scores é placeholder (M0, FR-020) — @sdp/engine não exporta ALL_DIMENSIONS
// como valor (só o tipo Dimension), então a fixture de teste lista as 7 dimensões diretamente.
const ZERO_SCORES: Record<Dimension, number> = {
  escalabilidade: 0,
  disponibilidade: 0,
  latencia: 0,
  consistencia: 0,
  custo: 0,
  complexidade_operacional: 0,
  seguranca: 0,
};

/**
 * Rubrica à mostra (Clarifications desta sessão — ver comentário de types.ts): cada critério é
 * uma função pura sobre `SimulationResult`/`Design` já calculados pelo engine, então os testes
 * aqui constroem fixtures mínimas desses dois tipos — nunca chamam `simulate()` de verdade (isso
 * já é coberto por `apps/web/test/bottleneck-scenario.spec.ts`); o objetivo é provar que cada
 * critério lê o campo certo e compara com o limiar certo.
 */

function makeResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    nodes: {},
    path: { throughputRps: 100, bottleneckId: null, latency: { p50: 10, p95: 20, p99: 50 } },
    violations: [],
    cost: { monthlyTotal: 0, byNode: {} },
    scores: ZERO_SCORES,
    ...overrides,
  };
}

function makeDesign(overrides: Partial<Design> = {}): Design {
  return { nodes: [], edges: [], entryNodeIds: [], ...overrides };
}

describe('rubrica do Encurtador de URL', () => {
  const problem = getProblem('url-shortener');
  if (!problem) throw new Error('problema "url-shortener" não encontrado — catálogo quebrado');

  const criterion = (id: string) => {
    const found = problem.rubric.find((c) => c.id === id);
    if (!found) throw new Error(`critério "${id}" não encontrado na rubrica`);
    return found;
  };

  it('latency-p99: passa com p99 <= 100ms, falha acima', () => {
    const c = criterion('latency-p99');
    expect(c.evaluate(makeResult({ path: { throughputRps: 1, bottleneckId: null, latency: { p50: 1, p95: 2, p99: 100 } } }), makeDesign())).toBe(true);
    expect(c.evaluate(makeResult({ path: { throughputRps: 1, bottleneckId: null, latency: { p50: 1, p95: 2, p99: 100.1 } } }), makeDesign())).toBe(false);
  });

  it('no-saturated-node: passa se nenhum nó está saturado, falha se algum está', () => {
    const c = criterion('no-saturated-node');
    const healthy = makeResult({ nodes: { a: { offeredLoad: 1, capacity: 10, utilization: 0.1, queueLatencyMs: 1, status: 'healthy' } } });
    const saturated = makeResult({ nodes: { a: { offeredLoad: 10, capacity: 10, utilization: 1, queueLatencyMs: 999, status: 'saturated' } } });
    expect(c.evaluate(healthy, makeDesign())).toBe(true);
    expect(c.evaluate(saturated, makeDesign())).toBe(false);
    expect(c.evaluate(makeResult({ nodes: {} }), makeDesign())).toBe(true); // vazio = vacuously true
  });

  it('uses-cache: passa se algum nó do Design é cache, falha se nenhum', () => {
    const c = criterion('uses-cache');
    expect(c.evaluate(makeResult(), makeDesign({ nodes: [{ id: 'n1', type: 'cache', replicas: 1 }] }))).toBe(true);
    expect(c.evaluate(makeResult(), makeDesign({ nodes: [{ id: 'n1', type: 'app_server', replicas: 1 }] }))).toBe(false);
  });

  it('has-database: passa com sql_primary/sql_replica/nosql_kv, falha sem nenhum', () => {
    const c = criterion('has-database');
    expect(c.evaluate(makeResult(), makeDesign({ nodes: [{ id: 'n1', type: 'sql_primary', replicas: 1 }] }))).toBe(true);
    expect(c.evaluate(makeResult(), makeDesign({ nodes: [{ id: 'n1', type: 'nosql_kv', replicas: 1 }] }))).toBe(true);
    expect(c.evaluate(makeResult(), makeDesign({ nodes: [{ id: 'n1', type: 'app_server', replicas: 1 }] }))).toBe(false);
  });

  it('no-spof: passa sem violação spof, falha com uma', () => {
    const c = criterion('no-spof');
    expect(c.evaluate(makeResult({ violations: [] }), makeDesign())).toBe(true);
    expect(
      c.evaluate(makeResult({ violations: [{ type: 'spof', nodeIds: ['n1'], message: 'SPOF' }] }), makeDesign()),
    ).toBe(false);
    expect(
      c.evaluate(makeResult({ violations: [{ type: 'cycle', nodeIds: ['n1'], message: 'ciclo' }] }), makeDesign()),
    ).toBe(true); // outro tipo de violação não afeta este critério
  });

  it('isProblemSolved: só true quando TODOS os critérios passam', () => {
    const allPass = makeResult({
      path: { throughputRps: 1, bottleneckId: null, latency: { p50: 1, p95: 2, p99: 50 } },
      nodes: { a: { offeredLoad: 1, capacity: 10, utilization: 0.1, queueLatencyMs: 1, status: 'healthy' } },
      violations: [],
    });
    const goodDesign = makeDesign({
      nodes: [
        { id: 'cache-1', type: 'cache', replicas: 1 },
        { id: 'db-1', type: 'sql_primary', replicas: 1 },
      ],
    });
    expect(isProblemSolved(problem, allPass, goodDesign)).toBe(true);

    const missingCacheDesign = makeDesign({ nodes: [{ id: 'db-1', type: 'sql_primary', replicas: 1 }] });
    expect(isProblemSolved(problem, allPass, missingCacheDesign)).toBe(false);
  });
});

describe('hints do Encurtador de URL', () => {
  const problem = getProblem('url-shortener');
  if (!problem) throw new Error('problema "url-shortener" não encontrado — catálogo quebrado');

  it('tem pelo menos 1 dica, cada uma com prompt e corpo não-vazios, ids únicos', () => {
    expect(problem.hints.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const hint of problem.hints) {
      expect(hint.prompt.length).toBeGreaterThan(0);
      expect(hint.body.length).toBeGreaterThan(20);
      expect(ids.has(hint.id)).toBe(false);
      ids.add(hint.id);
    }
  });
});
