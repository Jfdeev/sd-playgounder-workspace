import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { LibraryEntry } from '@sdp/knowledge';
import type { ConceptProblemLink } from './library-browser';

const TOPOLOGY_LABEL = { analogia: 'Analogia com a topologia', nenhuma: 'Sem correspondência na topologia' } as const;

/**
 * Uma entrada da biblioteca (M2.7) — só texto do `@sdp/knowledge`: nunca um número, progresso ou
 * nota (FR-009/FR-010). Princípios citam obra + autor; conceitos (M4.3) citam também o capítulo e
 * mostram o trade-off e os desafios onde aparecem.
 */
export function LibraryEntryCard({
  entry,
  relatedEntries,
  onOpenEntry,
  problems,
}: {
  entry: LibraryEntry;
  relatedEntries: readonly LibraryEntry[];
  onOpenEntry: (id: string) => void;
  /** Só para conceitos: os desafios que o exercitam. */
  problems?: readonly ConceptProblemLink[];
}) {
  return (
    <div className="rounded-lg border border-violet-700/50 bg-violet-950/20 p-3 text-xs">
      <p className="text-zinc-300">{entry.definition}</p>

      {entry.tradeoff && (
        <p className="mt-2.5 text-zinc-400">
          <span className="font-medium text-zinc-300">Trade-off:</span> {entry.tradeoff}
        </p>
      )}

      {entry.topology && (
        <p className="mt-2.5 text-zinc-400">
          <span className="font-medium text-zinc-300">{TOPOLOGY_LABEL[entry.topology.relation]}:</span>{' '}
          {entry.topology.note}
        </p>
      )}

      {entry.platformNote && (
        <p className="mt-2.5 italic text-zinc-500">
          {entry.category === 'concepts' && <span className="font-medium not-italic text-zinc-400">Na plataforma: </span>}
          {entry.platformNote}
        </p>
      )}

      {problems && (
        <div className="mt-2.5">
          <p className="font-medium text-zinc-300">Aparece em</p>
          {problems.length === 0 ? (
            <p className="mt-1 text-zinc-500">Ainda não há desafio para este conceito.</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {problems.map((problem) => (
                <li key={problem.id}>
                  {problem.lockedBy ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-0.5 text-zinc-500"
                    >
                      <Lock className="size-3" aria-hidden /> {problem.title} · resolva um problema do nível {problem.lockedBy}
                    </span>
                  ) : (
                    <Link
                      href={`/app/${problem.id}`}
                      className="inline-flex rounded-md border border-zinc-700 px-2 py-0.5 text-violet-300 hover:border-violet-500"
                    >
                      {problem.title}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {relatedEntries.length > 0 && (
        <p className="mt-2.5 text-zinc-400">
          <span className="font-medium text-zinc-300">Na biblioteca:</span>{' '}
          {relatedEntries.map((related, index) => (
            <span key={related.id}>
              {index > 0 && ', '}
              <button type="button" onClick={() => onOpenEntry(related.id)} className="text-violet-300 hover:text-violet-200">
                {related.name}
              </button>
            </span>
          ))}
        </p>
      )}

      <p className="mt-2.5 text-zinc-500">
        Fonte: <span className="text-zinc-400">{entry.source.book}</span>, {entry.source.author}
        {entry.chapter && <>, {entry.chapter}</>}
      </p>
    </div>
  );
}
