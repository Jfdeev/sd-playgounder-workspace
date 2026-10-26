import { describe, expect, it } from 'vitest';
import { ALL_PROBLEM_IDS, getProblem } from '@sdp/problems';
import { DESIGN_LIMITS, validateSubmittedDesign } from '../../src/lib/gamification/design-validation';

function validDesign() {
  return {
    nodes: [
      { id: 'lb', type: 'load_balancer', replicas: 2 },
      { id: 'app', type: 'app_server', replicas: 2 },
      { id: 'cache', type: 'cache', replicas: 2, cacheHitRate: 0.8 },
      { id: 'db', type: 'sql_primary', replicas: 2 },
    ],
    edges: [
      { id: 'e1', from: 'lb', to: 'app', kind: 'read', weight: 1 },
      { id: 'e2', from: 'app', to: 'cache', kind: 'read', weight: 1 },
      { id: 'e3', from: 'cache', to: 'db', kind: 'read', weight: 1 },
    ],
    entryNodeIds: ['lb'],
  };
}

function reasonFor(mutate: (design: ReturnType<typeof validDesign>) => unknown): string | null {
  const result = validateSubmittedDesign(mutate(validDesign()));
  return result.ok ? null : result.reason;
}

describe('validateSubmittedDesign', () => {
  it('aceita um design válido e devolve só os campos do Design (descarta extras)', () => {
    const result = validateSubmittedDesign({ ...validDesign(), score: 100, result: { forged: true } });
    expect(result).toEqual({ ok: true, design: validDesign() });
  });

  it('descarta capacityFactor vindo do cliente (só uma falha aplicada pelo servidor define isso — M3)', () => {
    const result = validateSubmittedDesign({ ...validDesign(), nodes: validDesign().nodes.map((n) => ({ ...n, capacityFactor: 1000 })) });
    expect(result.ok && result.design.nodes.every((n) => !('capacityFactor' in n))).toBe(true);
  });

  it.each(ALL_PROBLEM_IDS)('aceita a solução de referência de "%s"', (problemId) => {
    expect(validateSubmittedDesign(getProblem(problemId)!.referenceSolution.design).ok).toBe(true);
  });

  it.each([null, 'x', [], { nodes: [], edges: [] }])('recusa algo que não tem a forma de um Design (%j)', (raw) => {
    expect(validateSubmittedDesign(raw).ok).toBe(false);
  });

  it('recusa design vazio e design acima dos limites', () => {
    expect(reasonFor((d) => ({ ...d, nodes: [] }))).toMatch(/sem componentes/);
    const manyNodes = Array.from({ length: DESIGN_LIMITS.maxNodes + 1 }, (_, i) => ({ id: `n${i}`, type: 'app_server', replicas: 2 }));
    expect(reasonFor((d) => ({ ...d, nodes: manyNodes }))).toMatch(/mais de/);
    const manyEdges = Array.from({ length: DESIGN_LIMITS.maxEdges + 1 }, (_, i) => ({ id: `e${i}`, from: 'lb', to: 'app', kind: 'read', weight: 1 }));
    expect(reasonFor((d) => ({ ...d, edges: manyEdges }))).toMatch(/mais de/);
  });

  it('recusa nó com id, tipo, réplicas ou taxa de acerto inválidos', () => {
    expect(reasonFor((d) => ({ ...d, nodes: [{ ...d.nodes[0], id: '' }, ...d.nodes.slice(1)] }))).toMatch(/id inválido/);
    expect(reasonFor((d) => ({ ...d, nodes: [{ ...d.nodes[0], type: 'mainframe' }, ...d.nodes.slice(1)] }))).toMatch(/tipo desconhecido/);
    expect(reasonFor((d) => ({ ...d, nodes: [{ ...d.nodes[0], type: 'client' }, ...d.nodes.slice(1)] }))).toMatch(/tipo desconhecido/);
    for (const replicas of [0, 1.5, DESIGN_LIMITS.maxReplicas + 1, '2']) {
      expect(reasonFor((d) => ({ ...d, nodes: [{ ...d.nodes[0], replicas }, ...d.nodes.slice(1)] }))).toMatch(/réplicas/);
    }
    for (const cacheHitRate of [-0.1, 1.1, Number.NaN]) {
      expect(reasonFor((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === 'cache' ? { ...n, cacheHitRate } : n)) }))).toMatch(/taxa de acerto/);
    }
  });

  it('recusa ids de componente ou de conexão repetidos', () => {
    expect(reasonFor((d) => ({ ...d, nodes: [...d.nodes, { id: 'app', type: 'worker', replicas: 2 }] }))).toMatch(/repetidos/);
    expect(reasonFor((d) => ({ ...d, edges: [...d.edges, { ...d.edges[0] }] }))).toMatch(/repetidos/);
  });

  it('recusa aresta malformada ou apontando pra componente inexistente', () => {
    expect(reasonFor((d) => ({ ...d, edges: [{ ...d.edges[0], kind: 'teleport' }] }))).toMatch(/tipo desconhecido/);
    expect(reasonFor((d) => ({ ...d, edges: [{ ...d.edges[0], weight: -1 }] }))).toMatch(/peso/);
    expect(reasonFor((d) => ({ ...d, edges: [{ ...d.edges[0], to: '' }] }))).toMatch(/extremidade/);
    expect(reasonFor((d) => ({ ...d, edges: [{ ...d.edges[0], to: 'fantasma' }] }))).toMatch(/inexistente/);
  });

  it('recusa uma conexão que o canvas não permitiria desenhar', () => {
    // sql_primary → app_server não existe na matriz (banco não chama servidor)
    expect(reasonFor((d) => ({ ...d, edges: [...d.edges, { id: 'e9', from: 'db', to: 'app', kind: 'read', weight: 1 }] }))).toMatch(/não é permitida/);
  });

  it('recusa entrada inexistente, que o Cliente não alcança, ou nenhuma entrada', () => {
    expect(reasonFor((d) => ({ ...d, entryNodeIds: ['fantasma'] }))).toMatch(/inexistente/);
    expect(reasonFor((d) => ({ ...d, entryNodeIds: ['db'] }))).toMatch(/Cliente não pode/);
    expect(reasonFor((d) => ({ ...d, entryNodeIds: [] }))).toMatch(/sem ponto de entrada/);
  });
});
