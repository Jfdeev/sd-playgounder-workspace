import { describe, expect, it } from 'vitest';
import { findCriticalPath } from '../../src/graph/critical-path.js';
import type { Design, NodeId } from '../../src/types.js';

describe('findCriticalPath', () => {
  it('retorna o caminho linear único quando não há ramificação', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'app-1', type: 'app_server', replicas: 1 },
        { id: 'db-1', type: 'sql_primary', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 100 },
        { id: 'e2', from: 'app-1', to: 'db-1', kind: 'read', weight: 100 },
      ],
    };

    expect(findCriticalPath(design, () => 1)).toEqual(['lb-1', 'app-1', 'db-1']);
  });

  it('escolhe o ramo de maior peso acumulado em um fan-out (não soma os dois ramos)', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'app-rapido', type: 'app_server', replicas: 1 },
        { id: 'app-lento', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'lb-1', to: 'app-rapido', kind: 'read', weight: 50 },
        { id: 'e2', from: 'lb-1', to: 'app-lento', kind: 'read', weight: 50 },
      ],
    };

    const weight: Record<NodeId, number> = { 'lb-1': 1, 'app-rapido': 5, 'app-lento': 50 };
    const path = findCriticalPath(design, (id) => weight[id]!);

    expect(path).toEqual(['lb-1', 'app-lento']);
  });

  it('nunca inclui nó órfão no caminho', () => {
    const design: Design = {
      entryNodeIds: ['lb-1'],
      nodes: [
        { id: 'lb-1', type: 'load_balancer', replicas: 1 },
        { id: 'app-1', type: 'app_server', replicas: 1 },
        { id: 'orfao', type: 'app_server', replicas: 1 },
      ],
      edges: [{ id: 'e1', from: 'lb-1', to: 'app-1', kind: 'read', weight: 100 }],
    };

    const path = findCriticalPath(design, () => 1);
    expect(path).not.toContain('orfao');
  });

  it('retorna array vazio quando nenhum nó de entrada é alcançável', () => {
    const design: Design = {
      entryNodeIds: [],
      nodes: [{ id: 'app-1', type: 'app_server', replicas: 1 }],
      edges: [],
    };

    expect(findCriticalPath(design, () => 1)).toEqual([]);
  });

  it('limitação conhecida: nó dentro de um ciclo pode ficar fora do caminho crítico', () => {
    // a → x → y, y → x (ciclo x↔y). A ordem de nós no design coloca 'y' antes de 'x' na lista de
    // nós — isso faz a ordenação topológica (que anexa nós de ciclo em ordem arbitrária) colocar
    // 'y' antes de 'x', então a DP nunca chega a relaxar 'y' via 'x' (edge x→y não é seguida
    // porque 'y' aparece antes de 'x' na ordem). Documentado em graph/critical-path.ts: ciclo em
    // si já é sinalizado como Violation por static-analysis.ts — este módulo só garante que não
    // trava, não que o caminho por dentro do ciclo é completo.
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'app_server', replicas: 1 },
        { id: 'y', type: 'app_server', replicas: 1 },
        { id: 'x', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'x', kind: 'read', weight: 100 },
        { id: 'e2', from: 'x', to: 'y', kind: 'read', weight: 100 },
        { id: 'e3', from: 'y', to: 'x', kind: 'read', weight: 100 },
      ],
    };

    expect(() => findCriticalPath(design, () => 1)).not.toThrow();
    const path = findCriticalPath(design, () => 1);
    expect(path[0]).toBe('a');
  });

  it('não trava em grafo cíclico', () => {
    const design: Design = {
      entryNodeIds: ['a'],
      nodes: [
        { id: 'a', type: 'app_server', replicas: 1 },
        { id: 'b', type: 'app_server', replicas: 1 },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'b', kind: 'read', weight: 100 },
        { id: 'e2', from: 'b', to: 'a', kind: 'read', weight: 100 },
      ],
    };

    expect(() => findCriticalPath(design, () => 1)).not.toThrow();
  });
});
