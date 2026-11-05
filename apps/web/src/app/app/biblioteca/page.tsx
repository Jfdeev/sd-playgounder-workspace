import { CONCEPT_ENTRIES, LIBRARY_ENTRIES } from '@sdp/knowledge';
import { ALL_PROBLEMS, problemsForConcept } from '@sdp/problems';
import { LibraryBrowser, type ConceptProblemLink } from '@/components/library/library-browser';
import { loadSolvedProblemIds } from '@/db/gamification';
import { blockingLevel, LEVEL_LABEL } from '@/lib/challenge-progression';
import { requireUserId } from '../_require-user-id';

// `?entry=<id>` (link vindo de uma dica, do card do desafio ou do progresso) abre a entrada
// correspondente; um id desconhecido é ignorado pelo navegador da biblioteca, nunca vira erro.
// M4.3: "aparece em" de cada conceito, com a trava calculada para esta conta (mesma regra do menu).
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string | string[] }>;
}) {
  const { entry } = await searchParams;
  const initialEntryId = typeof entry === 'string' ? entry : null;
  const solvedIds = await loadSolvedProblemIds(await requireUserId());

  const conceptProblems: Record<string, ConceptProblemLink[]> = Object.fromEntries(
    CONCEPT_ENTRIES.map((concept) => [
      concept.id,
      problemsForConcept(concept.id).map((problem) => {
        const blocking = blockingLevel(problem.id, ALL_PROBLEMS, solvedIds);
        return { id: problem.id, title: problem.title, lockedBy: blocking && LEVEL_LABEL[blocking] };
      }),
    ]),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <LibraryBrowser entries={LIBRARY_ENTRIES} initialEntryId={initialEntryId} conceptProblems={conceptProblems} />
    </div>
  );
}
