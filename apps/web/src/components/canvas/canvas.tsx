'use client';

import { useCallback, useEffect, useState, type DragEvent } from 'react';
import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type IsValidConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Redo2, Trash2, Undo2 } from 'lucide-react';
import { simulate, type ComponentType } from '@sdp/engine';
import type { Problem } from '@sdp/problems';
import { toDesign, toWorkload } from '@/lib/canvas-to-design';
import { toFlowEdge, toFlowNode, type ClientVariant } from '@/lib/canvas-types';
import { connectableKindOf, isValidCanvasConnection } from '@/lib/connection-rules';
import { useCanvasStore, type CanvasEdge, type CanvasNode } from '@/stores/canvas-store';
import { ClientNode } from './nodes/client-node';
import { ComponentNode } from './nodes/component-node';
import { TypedEdge } from './edges/typed-edge';
import { Palette, buildNodeData, DRAG_MIME } from './palette';
import { ConfigPanel } from './config-panel';
import { ResultPanel } from './result-panel';

const nodeTypes = { component: ComponentNode, client: ClientNode };
const edgeTypes = { typed: TypedEdge };

function CanvasInner({ problem }: { problem: Problem }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const selectEdge = useCanvasStore((s) => s.selectEdge);
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);
  const applySimulationResult = useCanvasStore((s) => s.applySimulationResult);
  const lastResult = useCanvasStore((s) => s.lastResult);

  const { screenToFlowPosition } = useReactFlow();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // FR-010: desfazer/refazer — Ctrl/Cmd+Z e Ctrl/Cmd+Shift+Z, além dos botões abaixo (RNF-8).
  // Chamar undo()/redo() sem histórico é um no-op seguro (comportamento do próprio zundo), então
  // não é preciso rastrear pastStates/futureStates só pra desabilitar o botão.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (!isModifierPressed || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) {
        useCanvasStore.temporal.getState().redo();
      } else {
        useCanvasStore.temporal.getState().undo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Impede no canvas as ligações que o engine roda sem erro mas não fazem sentido arquitetural
  // (ex.: Load Balancer → SQL Primary) — regra pedagógica pura, vive em connection-rules.ts,
  // nunca em packages/engine (que não tem noção de topologia "certa"). React Flow chama isto a
  // cada tentativa de arrastar uma conexão; retornar false recusa antes de onConnect disparar.
  const isValidConnection = useCallback<IsValidConnection<CanvasEdge>>(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;
      return isValidCanvasConnection(connectableKindOf(sourceNode.data), connectableKindOf(targetNode.data));
    },
    [nodes],
  );

  // Drag-and-drop da paleta pro canvas (research.md §2) — o payload arrastado é "component:tipo"
  // ou "client:variante" (palette.tsx); screenToFlowPosition cuida de zoom/pan automaticamente.
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer.getData(DRAG_MIME);
      const [kind, typeOrVariant] = payload.split(':');
      if (!typeOrVariant) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const data =
        kind === 'component'
          ? buildNodeData('component', typeOrVariant as ComponentType)
          : buildNodeData('client', typeOrVariant as ClientVariant);
      const node: CanvasNode = { id: crypto.randomUUID(), type: data.kind, position, data };
      addNode(node);
    },
    [screenToFlowPosition, addNode],
  );

  // FR-008/FR-009/FR-029: submete o design atual pro engine e propaga status/gargalo de volta
  // pros nós (renderizado como destaque vermelho em ComponentNode). Canvas vazio (edge case do
  // spec) mostra uma mensagem clara em vez de chamar o engine sem feedback.
  function handleSubmit() {
    if (nodes.length === 0) {
      setSubmitError('Adicione componentes antes de submeter.');
      applySimulationResult(null);
      return;
    }
    setSubmitError(null);

    const flowNodes = nodes.map((n) => toFlowNode(n.id, n.position, n.data));
    const flowEdges = edges.map((e) => toFlowEdge(e.id, e.source, e.target, e.data ?? { kind: 'read' }));
    const design = toDesign(flowNodes, flowEdges);
    const workload = toWorkload(problem);
    const result = simulate(design, workload);

    applySimulationResult(result);
    for (const [nodeId, nodeResult] of Object.entries(result.nodes)) {
      updateNodeConfig(nodeId, {
        result: { status: nodeResult.status, isBottleneck: nodeId === result.path.bottleneckId },
      });
    }
  }

  // Lixeira do canvas (pedido direto do autor) — destrutivo, então pede confirmação antes; a
  // ação em si ainda é desfazível por Ctrl/Cmd+Z (clearCanvas entra no histórico do zundo).
  function handleClearCanvas() {
    if (nodes.length === 0 && edges.length === 0) return;
    const confirmed = window.confirm('Apagar todo o canvas? Remove todos os componentes e conexões (dá pra desfazer com Ctrl/Cmd+Z).');
    if (!confirmed) return;
    clearCanvas();
    setSubmitError(null);
  }

  return (
    <div className="flex min-h-0 flex-1">
      <Palette />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_, node) => selectNode(node.id)}
            onEdgeClick={(_, edge) => selectEdge(edge.id)}
            onPaneClick={() => selectNode(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'typed' }}
            fitView
          >
            <Background />
            <MiniMap pannable zoomable className="!bg-zinc-900" />
          </ReactFlow>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2">
          <div className="flex items-center gap-3">
            <p className="text-xs text-zinc-500">{nodes.length} nó(s) · {edges.length} conexão(ões)</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => useCanvasStore.temporal.getState().undo()}
                aria-label="Desfazer"
                title="Desfazer (Ctrl/Cmd+Z)"
                className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              >
                <Undo2 className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => useCanvasStore.temporal.getState().redo()}
                aria-label="Refazer"
                title="Refazer (Ctrl/Cmd+Shift+Z)"
                className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              >
                <Redo2 className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleClearCanvas}
                aria-label="Apagar todo o canvas"
                title="Apagar todo o canvas"
                className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-red-500 hover:text-red-400"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            <Play className="size-4" aria-hidden />
            Submeter
          </button>
        </div>
        <ResultPanel result={lastResult} submitError={submitError} />
      </div>
      <ConfigPanel />
    </div>
  );
}

export function Canvas({ problem }: { problem: Problem }) {
  return (
    <ReactFlowProvider>
      <CanvasInner problem={problem} />
    </ReactFlowProvider>
  );
}
