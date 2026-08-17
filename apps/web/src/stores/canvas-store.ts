'use client';

/**
 * Store do canvas — apps/web/src/stores/canvas-store.ts
 *
 * Zustand + Immer (ADR-004). `nodes`/`edges` usam os tipos nativos do React Flow
 * (`Node<FlowNodeData>`/`Edge<FlowEdgeData>`) — é o padrão recomendado pela documentação oficial
 * do React Flow para integração com uma store externa (research.md §2): position/seleção/drag
 * ficam como campos de topo do próprio React Flow (única fonte de verdade), nunca duplicados
 * dentro de `data`.
 *
 * `zundo` (undo/redo, FR-010) envolve a store rastreando só `nodes`/`edges` (via `partialize`) —
 * `selectedNodeId`/`lastResult` não fazem parte do "design" em si e nunca entram no histórico de
 * desfazer/refazer (research.md §3). `persist` (autosave, FR-011) ainda não foi adicionado — US3
 * (T032).
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import type { SimulationResult } from '@sdp/engine';
import type { FlowEdgeData, FlowNodeData } from '@/lib/canvas-types';

export type CanvasNode = Node<FlowNodeData>;
export type CanvasEdge = Edge<FlowEdgeData>;

export type CanvasState = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  lastResult: SimulationResult | null;
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: CanvasNode) => void;
  updateNodeConfig: (nodeId: string, patch: Partial<FlowNodeData>) => void;
  selectNode: (nodeId: string | null) => void;
  applySimulationResult: (result: SimulationResult | null) => void;
};

// Só nodes/edges entram no histórico de undo/redo — selectedNodeId/lastResult são efêmeros
// (research.md §3).
type TemporalCanvasState = Pick<CanvasState, 'nodes' | 'edges'>;

/**
 * Debounce mínimo (sem dependência nova) para o `handleSet` do zundo — sem isso, arrastar um nó
 * dispara `onNodesChange` a cada pixel, e cada um viraria um passo de histórico próprio
 * ("desfazer" ficaria inútil, um passo por frame de mouse). Padrão documentado pelo próprio
 * zundo (README, seção `handleSet`), normalmente resolvido com uma lib de throttle/debounce —
 * aqui a função é pequena o bastante pra não justificar uma dependência nova.
 */
function debounce<Args extends unknown[]>(fn: (...args: Args) => void, waitMs: number): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), waitMs);
  };
}

// Aresta nova, criada por onConnect, começa como 'read' — o usuário troca o tipo depois pelo
// próprio canvas (FR-003); nenhum peso explícito (peso implícito igual entre irmãs, ver
// canvas-to-design.ts).
const DEFAULT_NEW_EDGE_DATA: FlowEdgeData = { kind: 'read' };

export const useCanvasStore = create<CanvasState>()(
  temporal(
    immer((set) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      lastResult: null,

      onNodesChange: (changes) =>
        set((state) => {
          state.nodes = applyNodeChanges(changes, state.nodes) as CanvasNode[];
        }),

      onEdgesChange: (changes) =>
        set((state) => {
          state.edges = applyEdgeChanges(changes, state.edges) as CanvasEdge[];
        }),

      onConnect: (connection) =>
        set((state) => {
          state.edges = addEdge(
            { ...connection, type: 'typed', data: DEFAULT_NEW_EDGE_DATA },
            state.edges,
          ) as CanvasEdge[];
        }),

      addNode: (node) =>
        set((state) => {
          state.nodes.push(node);
        }),

      updateNodeConfig: (nodeId, patch) =>
        set((state) => {
          const node = state.nodes.find((n) => n.id === nodeId);
          if (!node) return;
          Object.assign(node.data, patch);
        }),

      selectNode: (nodeId) =>
        set((state) => {
          state.selectedNodeId = nodeId;
        }),

      applySimulationResult: (result) =>
        set((state) => {
          state.lastResult = result;
        }),
    })),
    {
      partialize: (state): TemporalCanvasState => ({ nodes: state.nodes, edges: state.edges }),
      handleSet: (handleSet) => debounce<Parameters<typeof handleSet>>((...args) => handleSet(...args), 300),
    },
  ),
);
