import { describe, expect, it } from 'vitest';
import { calculateScores, type CalculateScoresParams } from '../../src/scores/calculate.js';
import type { Design, NodeResult, Violation } from '../../src/types.js';

function nodeResult(overrides: Partial<NodeResult> = {}): NodeResult {
  return { offeredLoad: 100, capacity: 200, utilization: 0.5, queueLatencyMs: 1, status: 'healthy', ...overrides };
}

function baseParams(overrides: Partial<CalculateScoresParams> = {}): CalculateScoresParams {
  const design: Design = {
    entryNodeIds: ['app-1'],
    nodes: [{ id: 'app-1', type: 'app_server', replicas: 2 }],
    edges: [],
  };
  return {
    design,
    pathNodeIds: ['app-1'],
    nodes: { 'app-1': nodeResult() },
    violations: [],
    cost: { monthlyTotal: 60, byNode: { 'app-1': 60 } },
    latencyP99Ms: 80,
    latencyBudgetMs: null,
    referenceCostUsd: null,
    ...overrides,
  };
}

describe('calculateScores — Escalabilidade', () => {
  it('utilização mais baixa no caminho pontua mais alto', () => {
    const low = calculateScores(baseParams({ nodes: { 'app-1': nodeResult({ utilization: 0.2 }) } }));
    const high = calculateScores(baseParams({ nodes: { 'app-1': nodeResult({ utilization: 0.9 }) } }));
    expect(low.escalabilidade).toBeGreaterThan(high.escalabilidade);
  });

  it('utilização 0 pontua 100; utilização 1 (saturado) pontua 0', () => {
    expect(calculateScores(baseParams({ nodes: { 'app-1': nodeResult({ utilization: 0 }) } })).escalabilidade).toBe(100);
    expect(calculateScores(baseParams({ nodes: { 'app-1': nodeResult({ utilization: 1 }) } })).escalabilidade).toBe(0);
  });

  it('usa o MAIOR ρ entre os nós do caminho, não uma média', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'app_server', replicas: 2 },
        { id: 'b', type: 'app_server', replicas: 2 },
      ],
      edges: [],
    };
    const result = calculateScores(
      baseParams({
        design,
        pathNodeIds: ['a', 'b'],
        nodes: { a: nodeResult({ utilization: 0.1 }), b: nodeResult({ utilization: 0.8 }) },
      }),
    );
    expect(result.escalabilidade).toBe(20); // 100 - 80
  });

  it('caminho vazio pontua 100 — nada limitando', () => {
    expect(calculateScores(baseParams({ pathNodeIds: [] })).escalabilidade).toBe(100);
  });
});

describe('calculateScores — Disponibilidade', () => {
  it('mais réplicas no nó do caminho aumenta a disponibilidade', () => {
    const design2: Design = { entryNodeIds: ['a'], nodes: [{ id: 'a', type: 'app_server', replicas: 2 }], edges: [] };
    const design5: Design = { entryNodeIds: ['a'], nodes: [{ id: 'a', type: 'app_server', replicas: 5 }], edges: [] };
    const with2 = calculateScores(baseParams({ design: design2 }));
    const with5 = calculateScores(baseParams({ design: design5 }));
    expect(with5.disponibilidade).toBeGreaterThanOrEqual(with2.disponibilidade);
  });

  it('um nó marcado SPOF zera a disponibilidade do caminho', () => {
    const violations: Violation[] = [{ type: 'spof', nodeIds: ['app-1'], message: 'spof' }];
    expect(calculateScores(baseParams({ violations })).disponibilidade).toBe(0);
  });

  it('caminho vazio pontua 100 — produto vazio', () => {
    expect(calculateScores(baseParams({ pathNodeIds: [] })).disponibilidade).toBe(100);
  });
});

describe('calculateScores — Latência', () => {
  it('sem latencyBudgetMs (fora de um desafio) retorna 0', () => {
    expect(calculateScores(baseParams({ latencyBudgetMs: null })).latencia).toBe(0);
  });

  it('p99 igual ao limiar pontua 100', () => {
    expect(calculateScores(baseParams({ latencyP99Ms: 100, latencyBudgetMs: 100 })).latencia).toBe(100);
  });

  it('p99 acima do limiar cai proporcionalmente, nunca abaixo de 0', () => {
    const result = calculateScores(baseParams({ latencyP99Ms: 200, latencyBudgetMs: 100 }));
    expect(result.latencia).toBe(0); // 100 - (200/100 - 1)*100 = 100 - 100 = 0
  });

  it('p99 abaixo do limiar não ultrapassa 100', () => {
    expect(calculateScores(baseParams({ latencyP99Ms: 50, latencyBudgetMs: 100 })).latencia).toBe(100);
  });
});

describe('calculateScores — Custo', () => {
  it('sem referenceCostUsd (fora de um desafio) retorna 0', () => {
    expect(calculateScores(baseParams({ referenceCostUsd: null })).custo).toBe(0);
  });

  it('custo igual ao de referência pontua 100', () => {
    const cost = { monthlyTotal: 100, byNode: {} };
    expect(calculateScores(baseParams({ cost, referenceCostUsd: 100 })).custo).toBe(100);
  });

  it('mais caro que a referência cai proporcionalmente', () => {
    const cost = { monthlyTotal: 150, byNode: {} };
    expect(calculateScores(baseParams({ cost, referenceCostUsd: 100 })).custo).toBe(50); // 100 - 50%
  });

  it('mais barato que a referência não ultrapassa 100', () => {
    const cost = { monthlyTotal: 50, byNode: {} };
    expect(calculateScores(baseParams({ cost, referenceCostUsd: 100 })).custo).toBe(100);
  });
});

describe('calculateScores — Consistência', () => {
  it('sem aresta de replicação pontua 100 (consistência forte)', () => {
    expect(calculateScores(baseParams()).consistencia).toBe(100);
  });

  it('com aresta de replicação pontua 60 (consistência eventual)', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'sql_primary', replicas: 2 },
        { id: 'b', type: 'sql_replica', replicas: 2 },
      ],
      edges: [{ id: 'e1', from: 'a', to: 'b', kind: 'replication', weight: 1 }],
    };
    expect(calculateScores(baseParams({ design })).consistencia).toBe(60);
  });
});

describe('calculateScores — Complexidade operacional', () => {
  it('mais nós no design reduz o score', () => {
    const small: Design = { entryNodeIds: ['a'], nodes: [{ id: 'a', type: 'app_server', replicas: 2 }], edges: [] };
    const big: Design = {
      entryNodeIds: ['a'],
      nodes: Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, type: 'app_server' as const, replicas: 2 })),
      edges: [],
    };
    const smallScore = calculateScores(baseParams({ design: small })).complexidade_operacional;
    const bigScore = calculateScores(baseParams({ design: big })).complexidade_operacional;
    expect(bigScore).toBeLessThan(smallScore);
  });

  it('cada violação reduz o score em mais 5 pontos', () => {
    const withoutViolations = calculateScores(baseParams({ violations: [] })).complexidade_operacional;
    const withOneViolation = calculateScores(
      baseParams({ violations: [{ type: 'orphan-node', nodeIds: ['x'], message: 'm' }] }),
    ).complexidade_operacional;
    expect(withOneViolation).toBe(withoutViolations - 5);
  });

  it('nunca fica abaixo de 0', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: Array.from({ length: 50 }, (_, i) => ({ id: `n${i}`, type: 'app_server' as const, replicas: 2 })),
      edges: [],
    };
    expect(calculateScores(baseParams({ design })).complexidade_operacional).toBe(0);
  });
});

describe('calculateScores — Segurança', () => {
  it('sem nenhum componente de segurança pontua 10, nunca 0', () => {
    expect(calculateScores(baseParams()).seguranca).toBe(10);
  });

  it('cada componente de segurança presente soma 30 pontos', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'waf', replicas: 2 },
        { id: 'b', type: 'rate_limiter', replicas: 2 },
      ],
      edges: [],
    };
    expect(calculateScores(baseParams({ design })).seguranca).toBe(60);
  });

  it('nunca ultrapassa 100 mesmo com 3+ componentes de segurança', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'waf', replicas: 2 },
        { id: 'b', type: 'rate_limiter', replicas: 2 },
        { id: 'c', type: 'auth_service', replicas: 2 },
      ],
      edges: [],
    };
    expect(calculateScores(baseParams({ design })).seguranca).toBe(90);
  });
});

describe('calculateScores — shape', () => {
  it('todas as 7 dimensões vêm sempre entre 0 e 100', () => {
    const scores = calculateScores(baseParams());
    for (const value of Object.values(scores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
