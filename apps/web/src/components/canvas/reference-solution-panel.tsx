'use client';

/**
 * Painel de solução de referência — apps/web/src/components/canvas/reference-solution-panel.tsx (M2, US3)
 *
 * Mostra o raciocínio autorado (`problem.referenceSolution.reasoning`) e um botão pra carregar o
 * design correspondente no canvas — `designToCanvas` (apps/web/src/lib/design-to-canvas.ts)
 * converte o `Design` puro (sem posição) num layout automático em camadas. Carregar é destrutivo:
 * mesmo tratamento de confirmação de `handleApplyTemplate` (canvas-workspace.tsx) — substitui o
 * design atual, mas entra no histórico do zundo (Ctrl/Cmd+Z desfaz).
 */

import { BookOpen } from 'lucide-react';
import type { Problem } from '@sdp/problems';
import { designToCanvas } from '@/lib/design-to-canvas';
import { useCanvasStore } from '@/stores/canvas-store';

export function ReferenceSolutionPanel({ problem }: { problem: Problem }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const loadDesign = useCanvasStore((s) => s.loadDesign);

  function handleLoad() {
    if (nodes.length > 0 || edges.length > 0) {
      const confirmed = window.confirm(
        'Carregar a solução de referência? Isso substitui todo o design atual do canvas (dá pra desfazer com Ctrl/Cmd+Z).',
      );
      if (!confirmed) return;
    }
    loadDesign(designToCanvas(problem.referenceSolution.design));
  }

  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <BookOpen className="size-3.5" aria-hidden />
        Solução de referência
      </h3>
      <p className="text-xs text-zinc-400">{problem.referenceSolution.reasoning}</p>
      <button
        type="button"
        onClick={handleLoad}
        className="mt-2 w-full rounded-lg border border-violet-700/50 bg-violet-950/30 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:border-violet-500 hover:bg-violet-950/60"
      >
        Carregar no canvas
      </button>
    </div>
  );
}
