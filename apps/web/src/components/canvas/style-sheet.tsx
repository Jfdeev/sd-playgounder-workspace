'use client';

/**
 * Ficha de estilo de arquitetura — apps/web/src/components/canvas/style-sheet.tsx (M2.6, US2)
 *
 * Conteúdo 100% de `@sdp/knowledge` (dado autorado, aprovado pelo autor) — este componente só
 * renderiza, nunca gera texto.
 */

import type { TemplateId } from '@sdp/knowledge';
import { ARCHITECTURE_STYLES } from '@sdp/knowledge';

export function StyleSheet({ templateId }: { templateId: TemplateId }) {
  const style = ARCHITECTURE_STYLES[templateId];

  return (
    <div className="mx-1.5 mb-1.5 rounded-lg border border-violet-700/50 bg-violet-950/20 p-3 text-xs">
      <p className="font-semibold text-violet-300">Quando usar</p>
      <p className="mt-0.5 text-zinc-300">{style.whenToUse}</p>
      <p className="mt-2 font-semibold text-violet-300">Trade-offs</p>
      <ul className="mt-0.5 list-disc space-y-1 pl-4 text-zinc-400">
        {style.tradeoffs.map((tradeoff) => (
          <li key={tradeoff}>{tradeoff}</li>
        ))}
      </ul>
      <p className="mt-2.5 text-zinc-500">
        Fonte: <span className="text-zinc-400">{style.source.book}</span>, {style.source.author}
      </p>
      {style.furtherReading && <p className="mt-1 text-zinc-500">Leitura recomendada: {style.furtherReading}</p>}
    </div>
  );
}
