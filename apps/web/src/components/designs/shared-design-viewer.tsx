'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, AlertTriangle, Copy } from 'lucide-react';
import { simulate } from '@sdp/engine';
import { canvasDesignOf, toManualWorkload } from '@/lib/canvas-to-design';
import { fromSavedCanvas } from '@/lib/designs/saved-canvas';
import { writePendingOpen } from '@/lib/designs/pending-open';
import type { SharedDesignView } from '@/lib/designs/shared-view';
import { CanvasStoreProvider, useCanvasStore } from '@/stores/canvas-store';
import { edgeTypes, nodeTypes } from '../canvas/canvas';
import { ResultPanel } from '../canvas/result-panel';

/**
 * Visualização de um design compartilhado (M4.1, US3): só leitura (não arrasta, não conecta, não edita
 * o original), com "Simular" e "abrir uma cópia no meu canvas". Design de desafio que quem abre ainda não
 * resolveu mostra antes um aviso de spoiler.
 */

function Viewer({ view }: { view: SharedDesignView }) {
  const router = useRouter();
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const loadDesign = useCanvasStore((s) => s.loadDesign);
  const lastResult = useCanvasStore((s) => s.lastResult);
  const applySimulationResult = useCanvasStore((s) => s.applySimulationResult);
  const [rps, setRps] = useState(1000);

  useEffect(() => {
    loadDesign(fromSavedCanvas(view.version.content), { presetId: view.version.content.loadedPresetId });
  }, [view, loadDesign]);

  function runSimulation() {
    const design = canvasDesignOf(nodes, edges);
    const workload = toManualWorkload(rps);
    applySimulationResult(simulate(design, workload), design, workload);
  }

  function openCopy() {
    try {
      writePendingOpen(sessionStorage, { canvas: view.version.content, contextKind: 'sandbox', contextId: null, openDesign: null });
    } catch {
      // sem sessionStorage a cópia não atravessa a página
    }
    router.push('/app');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodesDraggable={false} nodesConnectable={false} fitView>
          <Background />
        </ReactFlow>
      </div>
      <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-950 px-4 py-2">
        <label className="text-xs text-zinc-500" htmlFor="shared-rps">
          Requisições/s
        </label>
        <input
          id="shared-rps"
          type="number"
          min={1}
          value={rps}
          onChange={(e) => setRps(Math.max(1, Number(e.target.value) || 1))}
          className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
        />
        <button type="button" onClick={runSimulation} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:border-violet-500">
          <Activity className="size-4" aria-hidden /> Simular
        </button>
        <button type="button" onClick={openCopy} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500">
          <Copy className="size-4" aria-hidden /> Abrir uma cópia no meu canvas
        </button>
      </div>
      <ResultPanel result={lastResult} actionError={null} />
    </div>
  );
}

export function SharedDesignViewer({ view, spoiler }: { view: SharedDesignView; spoiler: boolean }) {
  const [revealed, setRevealed] = useState(!spoiler);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-800 px-6 py-3">
        <p className="text-xs text-zinc-500">
          Design compartilhado{view.ownerNickname ? ' por ' : ''}
          {view.ownerNickname && (
            <Link href={`/app/u/${view.ownerNickname}`} className="text-violet-300 hover:text-violet-200">
              @{view.ownerNickname}
            </Link>
          )}{' '}
          · versão {view.version.number} · só leitura
        </p>
        <h1 className="text-lg font-semibold text-zinc-100">{view.name}</h1>
      </div>
      {revealed ? (
        <ReactFlowProvider>
          <CanvasStoreProvider storageKey="sdp-canvas-shared-view">
            <Viewer view={view} />
          </CanvasStoreProvider>
        </ReactFlowProvider>
      ) : (
        <div className="mx-auto mt-16 max-w-md rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 size-6 text-amber-300" aria-hidden />
          <p className="font-semibold text-zinc-100">Spoiler</p>
          <p className="mt-1 text-sm text-zinc-300">Este design é uma resposta de um desafio que você ainda não resolveu.</p>
          <button type="button" onClick={() => setRevealed(true)} className="mt-4 rounded-lg border border-amber-500/40 px-4 py-1.5 text-sm text-amber-200 hover:bg-amber-500/10">
            Ver mesmo assim
          </button>
        </div>
      )}
    </div>
  );
}
