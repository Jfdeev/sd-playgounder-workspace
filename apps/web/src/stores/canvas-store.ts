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
 * Sem `zundo` (undo/redo) nem `persist` (autosave) ainda — adicionados em US2 (T030) e US3 (T032).
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
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

// Aresta nova, criada por onConnect, começa como 'read' — o usuário troca o tipo depois pelo
// próprio canvas (FR-003); nenhum peso explícito (peso implícito igual entre irmãs, ver
// canvas-to-design.ts).
const DEFAULT_NEW_EDGE_DATA: FlowEdgeData = { kind: 'read' };

export const useCanvasStore = create<CanvasState>()(
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
        state.edges = addEdge({ ...connection, data: DEFAULT_NEW_EDGE_DATA }, state.edges) as CanvasEdge[];
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
);
