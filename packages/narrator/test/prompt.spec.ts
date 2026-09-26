import { describe, expect, it } from 'vitest';
import { buildNarratorPrompt, selectRelevantKnowledge } from '../src/prompt.js';
import type { Dimension, SimulationResult } from '@sdp/engine';

function result(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    nodes: {
      'app-1': { offeredLoad: 900, capacity: 1000, utilization: 0.9, queueLatencyMs: 5, status: 'warning' },
    },
    path: { throughputRps: 900, bottleneckId: 'app-1', latency: { p50: 10, p95: 20, p99: 30 } },
    violations: [],
    cost: { monthlyTotal: 120, byNode: { 'app-1': 120 } },
    scores: {
      escalabilidade: 50,
      disponibilidade: 90,
      latencia: 0,
      consistencia: 100,
      custo: 0,
      complexidade_operacional: 95,
      seguranca: 10,
    },
    ...overrides,
  };
}

const HEALTHY_SCORES: Record<Dimension, number> = {
  escalabilidade: 80,
  disponibilidade: 90,
  latencia: 70,
  consistencia: 100,
  custo: 60,
  complexidade_operacional: 95,
  seguranca: 85,
};

describe('selectRelevantKnowledge', () => {
  it('sem violação mapeada e com todos os scores saudáveis, não seleciona nenhuma ficha', () => {
    expect(selectRelevantKnowledge(result({ scores: HEALTHY_SCORES }))).toEqual([]);
  });

  it('violação "spof" seleciona a ficha de Disponibilidade', () => {
    const characteristics = selectRelevantKnowledge(
      result({
        scores: HEALTHY_SCORES,
        violations: [{ type: 'spof', nodeIds: ['app-1'], message: 'app-1 é um ponto único de falha' }],
      }),
    );
    expect(characteristics.map((c) => c.dimension)).toEqual(['disponibilidade']);
  });

  it('dimensão com score abaixo de 40 seleciona a ficha da própria dimensão', () => {
    const characteristics = selectRelevantKnowledge(
      result({ scores: { ...HEALTHY_SCORES, custo: 10 } }),
    );
    expect(characteristics.map((c) => c.dimension)).toEqual(['custo']);
  });

  it('nunca lê Design/Workload — assinatura de tipo só aceita SimulationResult', () => {
    // Garantia de compilação, não de runtime: `selectRelevantKnowledge` não tem parâmetro
    // algum além de `SimulationResult` (contracts/narrator-contract.md Regra 2).
    expect(selectRelevantKnowledge.length).toBe(1);
  });
});

describe('buildNarratorPrompt', () => {
  it('com todos os scores saudáveis e sem violação, nunca menciona "Contexto adicional"', () => {
    const prompt = buildNarratorPrompt(result({ scores: HEALTHY_SCORES }));
    expect(prompt).not.toContain('Contexto adicional');
  });

  it('com uma dimensão de score baixo, inclui a ficha correspondente com a fonte', () => {
    const prompt = buildNarratorPrompt(result({ scores: { ...HEALTHY_SCORES, seguranca: 5 } }));
    expect(prompt).toContain('Contexto adicional');
    expect(prompt).toContain('id "seguranca"');
    expect(prompt).toContain('Fundamentals of Software Architecture');
  });

  it('cita o throughput, o gargalo, a latência e o custo já calculados', () => {
    const prompt = buildNarratorPrompt(result());
    expect(prompt).toContain('900 rps');
    expect(prompt).toContain('app-1');
    expect(prompt).toContain('10.0/20.0/30.0 ms');
    expect(prompt).toContain('$120');
  });

  it('sem gargalo, cita "nenhum" em vez de um id inventado', () => {
    const prompt = buildNarratorPrompt(result({ path: { throughputRps: 500, bottleneckId: null, latency: { p50: 1, p95: 2, p99: 3 } } }));
    expect(prompt).toContain('Gargalo: nenhum');
  });

  it('sem violações, indica isso explicitamente em vez de omitir a seção', () => {
    const prompt = buildNarratorPrompt(result({ violations: [] }));
    expect(prompt).toContain('Nenhuma violação estrutural.');
  });

  it('com violações, lista o tipo e a mensagem de cada uma', () => {
    const prompt = buildNarratorPrompt(
      result({ violations: [{ type: 'spof', nodeIds: ['app-1'], message: 'app-1 é um ponto único de falha' }] }),
    );
    expect(prompt).toContain('spof');
    expect(prompt).toContain('app-1 é um ponto único de falha');
  });

  it('sem nenhum nó no design, indica isso em vez de uma lista vazia silenciosa', () => {
    const prompt = buildNarratorPrompt(result({ nodes: {} }));
    expect(prompt).toContain('(nenhum nó no design)');
  });

  it('instrui explicitamente o modelo a nunca inventar número', () => {
    const prompt = buildNarratorPrompt(result());
    expect(prompt.toLowerCase()).toContain('nunca invente');
  });
});
