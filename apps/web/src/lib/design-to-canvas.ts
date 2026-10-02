/**
 * Design (engine) → canvas — apps/web/src/lib/design-to-canvas.ts
 *
 * Converte um `Design` (`@sdp/engine` — nodes/edges/entryNodeIds, sem posição visual) pro shape
 * que o canvas consome (`{ nodes: CanvasNode[]; edges: CanvasEdge[] }`, mesmo formato que
 * `instantiateTemplate` de `canvas-templates.ts` já produz — o que `loadDesign()` da store espera).
 * Usado pela solução de referência (M2, US3): `Problem.referenceSolution.design` é um `Design`
 * puro (packages/problems não conhece posição/Client — regra 3 do contrato
 * `canvas-engine-boundary.md`), então precisa de um layout automático pra virar algo visualizável.
 *
 * Layout por camadas via BFS a partir dos nós de entrada (mesma ideia de um diagrama de fluxo
 * horizontal, cliente à esquerda — convenção já estabelecida em `component-node.tsx`): a distância
 * (em saltos) de um nó até o nó de entrada mais próximo vira sua coluna; dentro da mesma coluna,
 * nós são empilhados em linhas. Um nó "Cliente" sintético é sempre adicionado na coluna 0,
 * conectado a cada `entryNodeIds` — o mesmo papel que o Cliente já tem no canvas (FR-006 de M1).
 */

import type { Design } from '@sdp/engine';
import type { CanvasEdge, CanvasNode } from '@/stores/canvas-store';

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 130;
const CLIENT_NODE_ID = 'reference-solution-client';

/** BFS a partir dos nós de entrada — devolve a coluna (distância em saltos + 1) de cada nó do design. Nós inalcançáveis a partir de nenhuma entrada (não deveria acontecer numa referência válida, mas o mapper nunca lança — FR-019) ficam numa coluna extra ao final, nunca sobrepostos aos alcançáveis. */
function computeColumns(design: Design): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  for (const edge of design.edges) {
    const targets = adjacency.get(edge.from) ?? [];
    targets.push(edge.to);
    adjacency.set(edge.from, targets);
  }

  const columnByNodeId = new Map<string, number>();
  let queue: string[] = [...design.entryNodeIds];
  let column = 1; // coluna 0 é reservada pro Cliente sintético
  while (queue.length > 0) {
    const nextQueue: string[] = [];
    for (const nodeId of queue) {
      if (columnByNodeId.has(nodeId)) continue;
      columnByNodeId.set(nodeId, column);
      nextQueue.push(...(adjacency.get(nodeId) ?? []));
    }
    queue = nextQueue;
    column += 1;
  }

  const unreachableColumn = column;
  for (const node of design.nodes) {
    if (!columnByNodeId.has(node.id)) columnByNodeId.set(node.id, unreachableColumn);
  }

  return columnByNodeId;
}

export function designToCanvas(design: Design): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const columnByNodeId = computeColumns(design);

  const rowCounterByColumn = new Map<number, number>();
  function nextRow(column: number): number {
    const row = rowCounterByColumn.get(column) ?? 0;
    rowCounterByColumn.set(column, row + 1);
    return row;
  }

  const clientNode: CanvasNode = {
    id: CLIENT_NODE_ID,
    type: 'client',
    position: { x: 0, y: nextRow(0) * ROW_HEIGHT },
    data: { kind: 'client', variant: 'web' },
  };

  const componentNodes: CanvasNode[] = design.nodes.map((node) => {
    const column = columnByNodeId.get(node.id) ?? 1;
    const position = { x: column * COLUMN_WIDTH, y: nextRow(column) * ROW_HEIGHT };
    return {
      id: node.id,
      type: 'component',
      position,
      data:
        node.type === 'cache' && node.cacheHitRate !== undefined
          ? { kind: 'component', componentType: node.type, replicas: node.replicas, cacheHitRate: node.cacheHitRate }
          : { kind: 'component', componentType: node.type, replicas: node.replicas },
    };
  });

  const clientEdges: CanvasEdge[] = design.entryNodeIds.map((entryNodeId) => ({
    id: `${CLIENT_NODE_ID}-${entryNodeId}`,
    source: CLIENT_NODE_ID,
    target: entryNodeId,
    type: 'typed',
    data: { kind: 'read' },
  }));

  const componentEdges: CanvasEdge[] = design.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: 'typed',
    data: edge.weight !== undefined ? { kind: edge.kind, weight: edge.weight } : { kind: edge.kind },
  }));

  return { nodes: [clientNode, ...componentNodes], edges: [...clientEdges, ...componentEdges] };
}
