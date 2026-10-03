import { LIBRARY_ENTRIES } from '@sdp/knowledge';
import { LibraryBrowser } from '@/components/library/library-browser';

// auth() já é verificado em apps/web/src/app/app/layout.tsx (envolve esta página) — nada a repetir
// aqui. `?entry=<id>` (link vindo de uma dica) abre a entrada correspondente; um id desconhecido é
// ignorado pelo navegador da biblioteca, nunca vira erro.
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string | string[] }>;
}) {
  const { entry } = await searchParams;
  const initialEntryId = typeof entry === 'string' ? entry : null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <LibraryBrowser entries={LIBRARY_ENTRIES} initialEntryId={initialEntryId} />
    </div>
  );
}
