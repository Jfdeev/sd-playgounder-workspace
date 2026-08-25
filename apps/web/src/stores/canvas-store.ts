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
 * desfazer/refazer (research.md §3). `persist` (autosave local, FR-011) salva só `nodes`/`edges`
 * em `localStorage`, chaveado por problema — neste marco há só 1 problema (`url-shortener`), então
 * a chave é literal em vez de vir de um store-factory por `problemId`; quando M4 trouxer a
 * biblioteca de problemas, revisitar isso (virar `createCanvasStore(problemId)`).
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, type PersistOptions } from 'zustand/middleware';
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
  selectedEdgeId: string | null;
  lastResult: SimulationResult | null;
  onNodesChange: (changes: NodeChange<CanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CanvasEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: CanvasNode) => void;
  updateNodeConfig: (nodeId: string, patch: Partial<FlowNodeData>) => void;
  updateEdgeConfig: (edgeId: string, patch: Partial<FlowEdgeData>) => void;
  clearEdgeWeight: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  applySimulationResult: (result: SimulationResult | null) => void;
};

// Só nodes/edges entram no histórico de undo/redo e no autosave — selectedNodeId/lastResult são
// efêmeros (research.md §3).
type PersistedCanvasState = Pick<CanvasState, 'nodes' | 'edges'>;

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

// FR-011: chave de autosave local. Literal (não um factory por problemId) por decisão de escopo —
// ver o comentário no topo do arquivo.
const AUTOSAVE_STORAGE_KEY = 'sdp-canvas-url-shortener';

// Store base (Immer + zundo) definida à parte — permite que `persist`, logo abaixo, infira sua
// lista de mutators (`temporal`/`immer`) a partir do tipo desta constante, em vez de precisar
// declarar manualmente os 4 parâmetros de tipo de `persist<...>` (o que, especificado à mão,
// apaga a inferência de mutators e quebra `useCanvasStore.temporal`).
const canvasStoreCreator = temporal(
  immer<CanvasState>((set) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
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

    // FR-003: fecha o gap de o tipo da aresta (leitura/escrita/assíncrona/replicação) e o peso
    // (FR-004) nunca terem tido um jeito de ser alterados depois de criar a conexão — toda aresta
    // nascia (e ficava pra sempre) 'read', apesar do comentário de DEFAULT_NEW_EDGE_DATA acima já
    // prometer "o usuário troca o tipo depois pelo próprio canvas".
    updateEdgeConfig: (edgeId, patch) =>
      set((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (!edge || !edge.data) return;
        Object.assign(edge.data, patch);
      }),

    // Volta ao peso implícito (igual entre irmãs) — `delete`, não `Object.assign({weight:
    // undefined})`, porque `exactOptionalPropertyTypes` (tsconfig) distingue "propriedade ausente"
    // de "propriedade presente com valor undefined"; um patch genérico não conseguiria expressar
    // essa remoção sem violar o tipo de `FlowEdgeData['weight']` (`number`, não `number|undefined`).
    clearEdgeWeight: (edgeId) =>
      set((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (!edge?.data) return;
        delete edge.data.weight;
      }),

    // Seleção de nó e de aresta são sempre mutuamente exclusivas (inclusive ao limpar seleção —
    // selectNode(null) no clique do pane vazio também limpa uma aresta selecionada) — o
    // ConfigPanel mostra um ou outro, nunca os dois ao mesmo tempo.
    selectNode: (nodeId) =>
      set((state) => {
        state.selectedNodeId = nodeId;
        state.selectedEdgeId = null;
      }),

    selectEdge: (edgeId) =>
      set((state) => {
        state.selectedEdgeId = edgeId;
        state.selectedNodeId = null;
      }),

    applySimulationResult: (result) =>
      set((state) => {
        state.lastResult = result;
      }),
  })),
  {
    partialize: (state): PersistedCanvasState => ({ nodes: state.nodes, edges: state.edges }),
    handleSet: (handleSet) => debounce<Parameters<typeof handleSet>>((...args) => handleSet(...args), 300),
  },
);

// Tipada à parte por PersistOptions<CanvasState, PersistedCanvasState> explicitamente — TS não
// consegue inferir o 2º parâmetro de `persist` (o tipo persistido, via `partialize`) quando ele
// já está combinado com os mutators de `temporal`/`immer` (limitação conhecida da composição de
// middlewares do Zustand); declarar o tipo aqui evita ter que especificar os 4 parâmetros de tipo
// de `persist<...>` manualmente (o que apagaria a inferência de `useCanvasStore.temporal`).
const persistOptions: PersistOptions<CanvasState, PersistedCanvasState> = {
  name: AUTOSAVE_STORAGE_KEY,
  // Edge case do spec: localStorage indisponível/cheio (ex. navegação privada com restrições)
  // não deve quebrar o canvas — só degrada sem persistência entre sessões nessa sessão.
  storage: {
    getItem: (key) => {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // silencioso — autosave é best-effort, nunca deve interromper a edição do canvas
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // idem
      }
    },
  },
  partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
};

export const useCanvasStore = create<CanvasState>()(persist(canvasStoreCreator, persistOptions));
