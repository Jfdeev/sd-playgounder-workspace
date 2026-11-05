import Link from 'next/link';
import { getLibraryEntry } from '@sdp/knowledge';
import { weakestConcepts, type ConceptProgress } from '@/lib/gamification/concept-progress';

/**
 * Progresso por conceito (M4.3, US3) — só no painel do próprio usuário. Os números chegam derivados
 * (`conceptProgress`); aqui só se apresenta e se destacam os pontos fracos.
 */
export function ConceptProgressPanel({ progress, anySolved }: { progress: readonly ConceptProgress[]; anySolved: boolean }) {
  const weakest = anySolved ? weakestConcepts(progress) : [];
  const nameOf = (conceptId: string) => getLibraryEntry(conceptId)?.name ?? conceptId;
  const entryHref = (conceptId: string) => `/app/biblioteca?entry=${conceptId}`;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Por conceito</h2>
      {!anySolved ? (
        <p className="text-sm text-zinc-500">Resolva o primeiro desafio para ver em quais conceitos você está mais forte.</p>
      ) : (
        weakest.length > 0 && (
          <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-zinc-200">
            Você está mais fraco em{' '}
            {weakest.map((item, index) => (
              <span key={item.conceptId}>
                {index > 0 && (index === weakest.length - 1 ? ' e ' : ', ')}
                <Link href={entryHref(item.conceptId)} className="text-amber-200 hover:text-amber-100">
                  {nameOf(item.conceptId)}
                </Link>
              </span>
            ))}
            .
          </p>
        )
      )}
      <ul className="space-y-1.5">
        {progress.map((item) => (
          <li key={item.conceptId} className="rounded-md border border-zinc-800 px-3 py-2">
            <div className="flex items-baseline justify-between text-sm">
              <Link href={entryHref(item.conceptId)} className="text-zinc-200 hover:text-violet-300">
                {nameOf(item.conceptId)}
              </Link>
              <span className="text-xs text-zinc-500">
                {item.solved} de {item.total} {item.total === 1 ? 'desafio' : 'desafios'}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full bg-violet-500" style={{ width: `${(100 * item.solved) / item.total}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
