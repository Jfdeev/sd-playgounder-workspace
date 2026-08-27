'use client';

/**
 * Card de desafio — apps/web/src/components/canvas/challenge-card.tsx
 *
 * Canto inferior esquerdo, igual ao site de inspiração (`sdplayground.vercel.app/#/playground`):
 * título, enunciado curto, checklist de rubrica À MOSTRA (decisão do autor — ver comentário de
 * `packages/problems/src/types.ts`) e dicas estáticas colapsáveis. Só renderiza quando existe um
 * desafio ativo — no canvas livre (sandbox) este componente nem monta.
 *
 * A rubrica é reavaliada a cada submissão — antes da primeira, cada critério aparece como "não
 * verificado ainda" (nem passou, nem falhou). Lê `lastResult`/`lastDesign` da store, sempre o par
 * exato que `simulate()` produziu junto — nunca recomputa `design` a partir dos `nodes`/`edges`
 * *atuais* (achado numa revisão do `advisor`: fazer isso emparelharia um design editado depois da
 * submissão com o resultado de antes, e um critério como "usa cache" poderia mudar de status sem
 * que a latência exibida refletisse mais esse design).
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Circle, LogOut, X } from 'lucide-react';
import type { Problem } from '@sdp/problems';
import { useCanvasStore } from '@/stores/canvas-store';

export function ChallengeCard({ problem, onLeave }: { problem: Problem; onLeave: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [openHintId, setOpenHintId] = useState<string | null>(null);

  const lastResult = useCanvasStore((s) => s.lastResult);
  const lastDesign = useCanvasStore((s) => s.lastDesign);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="absolute bottom-4 left-[240px] z-10 rounded-lg border border-zinc-800 bg-zinc-950/95 px-4 py-2 text-sm font-medium text-zinc-200 shadow-xl backdrop-blur hover:border-violet-500"
      >
        {problem.title}
        <ChevronUp className="ml-2 inline size-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-[240px] z-10 w-80 rounded-lg border border-zinc-800 bg-zinc-950/95 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Desafio</p>
          <h2 className="text-sm font-semibold text-zinc-100">{problem.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Recolher"
            title="Recolher"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onLeave}
            aria-label="Sair do desafio"
            title="Sair do desafio"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto px-4 py-3">
        <p className="text-xs text-zinc-400">{problem.statement}</p>

        <div className="mt-3">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Critérios</h3>
          <ul className="space-y-1">
            {problem.rubric.map((criterion) => {
              const status: 'pass' | 'fail' | 'unchecked' = !lastResult || !lastDesign
                ? 'unchecked'
                : criterion.evaluate(lastResult, lastDesign)
                  ? 'pass'
                  : 'fail';
              return (
                <li key={criterion.id} className="flex items-center gap-2 text-xs">
                  {status === 'pass' && <span className="text-emerald-400">✓</span>}
                  {status === 'fail' && <X className="size-3 text-red-400" aria-hidden />}
                  {status === 'unchecked' && <Circle className="size-2.5 text-zinc-600" aria-hidden />}
                  <span
                    className={
                      status === 'pass' ? 'text-emerald-300' : status === 'fail' ? 'text-red-300' : 'text-zinc-500'
                    }
                  >
                    {criterion.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-3 border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={() => setHintsOpen((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
          >
            Dicas
            {hintsOpen ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
          </button>
          {hintsOpen && (
            <ul className="mt-2 space-y-1.5">
              {problem.hints.map((hint) => (
                <li key={hint.id}>
                  <button
                    type="button"
                    onClick={() => setOpenHintId((id) => (id === hint.id ? null : hint.id))}
                    className="text-left text-xs text-violet-300 hover:text-violet-200"
                  >
                    {hint.prompt}
                  </button>
                  {openHintId === hint.id && <p className="mt-1 text-xs text-zinc-400">{hint.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
