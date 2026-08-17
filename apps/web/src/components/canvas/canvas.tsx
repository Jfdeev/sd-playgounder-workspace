'use client';

import { useCallback, useState, type DragEvent } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play } from 'lucide-react';
import { simulate, type ComponentType } from '@sdp/engine';
import type { Problem } from '@sdp/problems';
import { toDesign, toWorkload } from '@/lib/canvas-to-design';
import { toFlowEdge, toFlowNode, type ClientVariant } from '@/lib/canvas-types';
import { useCanvasStore, type CanvasNode } from '@/stores/canvas-store';
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
  const selectNode = useCanvasStore((s) => s.selectNode);
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);
  const applySimulationResult = useCanvasStore((s) => s.applySimulationResult);
  const lastResult = useCanvasStore((s) => s.lastResult);

  const { screenToFlowPosition } = useReactFlow();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

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
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'typed' }}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2">
          <p className="text-xs text-zinc-500">{nodes.length} nó(s) · {edges.length} conexão(ões)</p>
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
