import { describe, expect, it } from 'vitest';
import type { Design, SimulationResult } from '@sdp/engine';
import { connects, latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../src/rubric-criteria.js';

// Fixtures mínimas: cada critério só lê o campo que importa, como em rubric.spec.ts.
const result = (overrides: Partial<SimulationResult>) => overrides as SimulationResult;
const NO_RESULT = {} as SimulationResult;
const design: Design = {
  nodes: [
    { id: 'rl', type: 'rate_limiter', replicas: 2 },
    { id: 'cache', type: 'cache', replicas: 2 },
    { id: 'app', type: 'app_server', replicas: 2 },
  ],
  edges: [
    { id: 'e1', from: 'rl', to: 'app', kind: 'read', weight: 1 },
    { id: 'e2', from: 'rl', to: 'cache', kind: 'read', weight: 1 },
    { id: 'e3', from: 'rl', to: 'fantasma', kind: 'read', weight: 1 },
  ],
  entryNodeIds: ['rl'],
};

describe('latencyWithin', () => {
  const criterion = latencyWithin(100, 'rótulo');

  it('usa o id fixo latency-p99 e o rótulo dado', () => {
    expect(criterion).toMatchObject({ id: 'latency-p99', label: 'rótulo' });
  });

  it('passa no limite e falha acima', () => {
    const at = (p99: number) => result({ path: { throughputRps: 1, bottleneckId: null, latency: { p50: 1, p95: 1, p99 } } });
    expect(criterion.evaluate(at(100), design)).toBe(true);
    expect(criterion.evaluate(at(100.01), design)).toBe(false);
  });
});

describe('NO_SATURATED_NODE', () => {
  const node = (status: 'healthy' | 'warning' | 'saturated') => ({ offeredLoad: 1, capacity: 1, utilization: 1, queueLatencyMs: 1, status });

  it('passa com nós saudáveis ou em alerta, falha com algum saturado', () => {
    expect(NO_SATURATED_NODE.evaluate(result({ nodes: { a: node('healthy'), b: node('warning') } }), design)).toBe(true);
    expect(NO_SATURATED_NODE.evaluate(result({ nodes: { a: node('healthy'), b: node('saturated') } }), design)).toBe(false);
  });
});

describe('NO_SPOF', () => {
  it('falha só com violação do tipo spof', () => {
    expect(NO_SPOF.evaluate(result({ violations: [{ type: 'orphan-node', nodeId: 'x', message: '' }] as never }), design)).toBe(true);
    expect(NO_SPOF.evaluate(result({ violations: [{ type: 'spof', nodeId: 'x', message: '' }] as never }), design)).toBe(false);
  });
});

describe('usesComponent', () => {
  it('passa se existe nó de algum dos tipos', () => {
    expect(usesComponent('x', 'X', 'nosql_kv', 'cache').evaluate(NO_RESULT, design)).toBe(true);
    expect(usesComponent('x', 'X', 'nosql_kv', 'queue').evaluate(NO_RESULT, design)).toBe(false);
  });
});

describe('connects', () => {
  it('passa se existe aresta do tipo de origem para o tipo de destino', () => {
    expect(connects('x', 'X', ['rate_limiter'], ['cache', 'nosql_kv']).evaluate(NO_RESULT, design)).toBe(true);
  });

  it('respeita a direção da aresta', () => {
    expect(connects('x', 'X', ['cache'], ['rate_limiter']).evaluate(NO_RESULT, design)).toBe(false);
  });

  it('ignora aresta que aponta para nó inexistente', () => {
    const onlyDangling: Design = { ...design, edges: [design.edges[2]!] };
    expect(connects('x', 'X', ['rate_limiter'], ['app_server', 'cache']).evaluate(NO_RESULT, onlyDangling)).toBe(false);
  });
});
