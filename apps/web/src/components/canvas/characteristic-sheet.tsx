'use client';

/**
 * Ficha de característica de arquitetura — apps/web/src/components/canvas/characteristic-sheet.tsx (M2.6, US1)
 *
 * Conteúdo 100% de `@sdp/knowledge` (dado autorado, aprovado pelo autor — Constitution VI, mesmo
 * gate das fórmulas de score) — este componente só renderiza, nunca gera texto.
 */

import type { Dimension } from '@sdp/engine';
import { ARCHITECTURE_CHARACTERISTICS } from '@sdp/knowledge';
import { DIMENSION_UI } from '@/lib/canvas-ui-catalog';

export function CharacteristicSheet({ dimension }: { dimension: Dimension }) {
  const characteristic = ARCHITECTURE_CHARACTERISTICS[dimension];

  return (
    <div className="rounded-lg border border-violet-700/50 bg-violet-950/20 p-3 text-xs">
      <p className="text-zinc-300">{characteristic.definition}</p>
      {characteristic.note && <p className="mt-1.5 italic text-zinc-500">{characteristic.note}</p>}
      <p className="mt-2.5 text-zinc-500">
        Fonte: <span className="text-zinc-400">{characteristic.source.book}</span>, {characteristic.source.author}
      </p>
      <ul className="mt-2 space-y-1">
        {characteristic.tradeoffs.map((tradeoff) => (
          <li key={tradeoff.against} className="text-zinc-400">
            <span className="font-medium text-zinc-300">Trade-off vs. {DIMENSION_UI[tradeoff.against].label}:</span>{' '}
            {tradeoff.explanation}
          </li>
        ))}
      </ul>
    </div>
  );
}
