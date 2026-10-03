import type { LibraryEntry } from '@sdp/knowledge';

const TOPOLOGY_LABEL = { analogia: 'Analogia com a topologia', nenhuma: 'Sem correspondência na topologia' } as const;

/**
 * Uma entrada da biblioteca (M2.7) — só texto do `@sdp/knowledge`: nunca um número, progresso ou
 * nota (FR-009/FR-010). A fonte é sempre obra + autor, nunca capítulo/página (FR-007).
 */
export function LibraryEntryCard({ entry }: { entry: LibraryEntry }) {
  return (
    <div className="rounded-lg border border-violet-700/50 bg-violet-950/20 p-3 text-xs">
      <p className="text-zinc-300">{entry.definition}</p>

      {entry.topology && (
        <p className="mt-2.5 text-zinc-400">
          <span className="font-medium text-zinc-300">{TOPOLOGY_LABEL[entry.topology.relation]}:</span>{' '}
          {entry.topology.note}
        </p>
      )}

      {entry.platformNote && <p className="mt-2.5 italic text-zinc-500">{entry.platformNote}</p>}

      <p className="mt-2.5 text-zinc-500">
        Fonte: <span className="text-zinc-400">{entry.source.book}</span>, {entry.source.author}
      </p>
    </div>
  );
}
