'use client';

import { AlertTriangle, DollarSign, Gauge, TrendingUp } from 'lucide-react';
import type { SimulationResult } from '@sdp/engine';
import { NODE_STATUS_UI, COMPONENT_UI } from '@/lib/canvas-ui-catalog';
import { formatViolationMessage } from '@/lib/violation-messages';
import { useCanvasStore } from '@/stores/canvas-store';

/**
 * Painel de resultado (FR-008) — mostra exatamente o que o engine calcula: utilização/status por
 * nó, latência do caminho crítico, throughput, custo, violações. FR-013: NUNCA renderiza nenhum
 * campo de nota/score/veredito — SimulationResult.scores é placeholder até M2 e não é lido aqui.
 */
export function ResultPanel({ result, actionError }: { result: SimulationResult | null; actionError: string | null }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const nodeLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node && node.data.kind === 'component' ? COMPONENT_UI[node.data.componentType].label : nodeId;
  };

  if (actionError) {
    return (
      <section className="border-t border-zinc-800 bg-zinc-950 p-4 text-sm text-amber-400">{actionError}</section>
    );
  }

  if (!result) {
    return (
      <section className="border-t border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
        Monte um design e clique em "Simular" (carga livre) ou "Submeter" (desafio ativo) para ver o resultado do engine.
      </section>
    );
  }

  return (
    <section className="max-h-72 overflow-y-auto border-t border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <TrendingUp className="size-3.5" aria-hidden /> Throughput
          </div>
          <p className="mt-1 text-lg font-semibold text-zinc-100">{Math.round(result.path.throughputRps)} rps</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Gauge className="size-3.5" aria-hidden /> Latência (p50 / p95 / p99)
          </div>
          <p className="mt-1 text-sm font-semibold text-zinc-100">
            {result.path.latency.p50.toFixed(1)} / {result.path.latency.p95.toFixed(1)} / {result.path.latency.p99.toFixed(1)} ms
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <DollarSign className="size-3.5" aria-hidden /> Custo mensal
          </div>
          <p className="mt-1 text-lg font-semibold text-zinc-100">${result.cost.monthlyTotal}</p>
        </div>
      </div>

      {result.path.bottleneckId && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-red-400">
          <AlertTriangle className="size-4" aria-hidden />
          Gargalo: <span className="font-medium">{nodeLabel(result.path.bottleneckId)}</span>
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(result.nodes).map(([nodeId, nodeResult]) => (
          <div key={nodeId} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs">
            <p className="truncate font-medium text-zinc-200">{nodeLabel(nodeId)}</p>
            <p className={`mt-0.5 ${NODE_STATUS_UI[nodeResult.status].colorClass.split(' ')[1]}`}>
              {NODE_STATUS_UI[nodeResult.status].label} · ρ={nodeResult.utilization.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {result.violations.length > 0 && (
        <div className="space-y-1.5">
          {result.violations.map((violation, i) => (
            <p key={i} className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {formatViolationMessage(violation.message, violation.nodeIds, nodeLabel)}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
