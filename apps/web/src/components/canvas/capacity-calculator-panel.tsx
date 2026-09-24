'use client';

/**
 * Calculadora de capacidade back-of-envelope — apps/web/src/components/canvas/capacity-calculator-panel.tsx (M2, US4)
 *
 * Ferramenta independente, sempre acessível (Clarifications 2026-09-23, spec.md) — não amarrada a
 * um desafio ativo. Reusa `averageRps`/`peakRps` de `capacity-formula.ts`, a mesma fórmula que
 * `toWorkload()` usa pra converter a escala de um `Problem` — nunca uma segunda conta duplicada
 * (research.md §4).
 */

import { useState } from 'react';
import { averageRps, peakRps } from '@/lib/capacity-formula';

function formatRps(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('pt-BR');
}

export function CapacityCalculatorPanel() {
  const [dau, setDau] = useState(10_000_000);
  const [requestsPerUserPerDay, setRequestsPerUserPerDay] = useState(5);
  const [peakMultiplier, setPeakMultiplier] = useState(3);

  const average = averageRps(dau, requestsPerUserPerDay);
  const peak = peakRps(average, peakMultiplier);

  return (
    <div className="w-72 space-y-3 p-3">
      <div>
        <label htmlFor="capacity-dau" className="mb-1 block text-xs text-zinc-500">
          Usuários ativos por dia (DAU)
        </label>
        <input
          id="capacity-dau"
          type="number"
          min={0}
          value={dau}
          onChange={(e) => setDau(Math.max(0, Number(e.target.value)))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
        />
      </div>
      <div>
        <label htmlFor="capacity-requests" className="mb-1 block text-xs text-zinc-500">
          Requisições por usuário/dia
        </label>
        <input
          id="capacity-requests"
          type="number"
          min={0}
          value={requestsPerUserPerDay}
          onChange={(e) => setRequestsPerUserPerDay(Math.max(0, Number(e.target.value)))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
        />
      </div>
      <div>
        <label htmlFor="capacity-peak" className="mb-1 block text-xs text-zinc-500">
          Multiplicador de pico
        </label>
        <input
          id="capacity-peak"
          type="number"
          min={1}
          step={0.5}
          value={peakMultiplier}
          onChange={(e) => setPeakMultiplier(Math.max(1, Number(e.target.value)))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">RPS médio</p>
          <p className="text-sm font-semibold text-zinc-100">{formatRps(average)}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">RPS de pico</p>
          <p className="text-sm font-semibold text-zinc-100">{formatRps(peak)}</p>
        </div>
      </div>
    </div>
  );
}
