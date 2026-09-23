'use client';

/**
 * Painel de score por dimensão — apps/web/src/components/canvas/score-panel.tsx (M2, US1)
 *
 * As 7 dimensões de `SimulationResult.scores`, sempre separadas — em NENHUM lugar somadas,
 * combinadas ou reduzidas a uma nota única (Constitution V). Mesmo padrão de fechável/fecha-por-
 * padrão de `result-panel.tsx` (pedido direto do autor naquele componente: não reabrir sozinho a
 * cada nova simulação, só quando o usuário clicar).
 */

import { useState } from 'react';
import { ChevronUp, X } from 'lucide-react';
import type { SimulationResult } from '@sdp/engine';
import { DIMENSION_UI } from '@/lib/canvas-ui-catalog';

const DIMENSION_ORDER = [
  'escalabilidade',
  'disponibilidade',
  'latencia',
  'consistencia',
  'custo',
  'complexidade_operacional',
  'seguranca',
] as const;

function barColorClass(value: number): string {
  if (value >= 70) return 'bg-emerald-500';
  if (value >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function ScorePanel({ result }: { result: SimulationResult | null }) {
  const [collapsed, setCollapsed] = useState(true);

  if (!result) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex w-full items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-500 transition hover:text-zinc-300"
      >
        Ver score por dimensão
        <ChevronUp className="size-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <section className="border-t border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Score por dimensão</p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Fechar score"
          title="Fechar score"
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DIMENSION_ORDER.map((dimension) => {
          const { label, icon: Icon } = DIMENSION_UI[dimension];
          const value = result.scores[dimension];
          return (
            <div key={dimension} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </span>
                <span className="font-medium text-zinc-200">{value}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className={`h-full rounded-full ${barColorClass(value)}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
