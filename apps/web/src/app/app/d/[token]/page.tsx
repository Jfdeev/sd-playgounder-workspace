import { SharedDesignViewer } from '@/components/designs/shared-design-viewer';
import { loadSharedDesign } from '@/db/designs';
import { loadSolvedProblemIds } from '@/db/gamification';
import { toSharedDesignView } from '@/lib/designs/shared-view';
import { requireUserId } from '../../_require-user-id';

export const metadata = { robots: { index: false } };

// Design compartilhado por link (M4.1, US3). Só pra quem está logado — sem sessão vai pro login e volta
// pra cá. Link revogado e link inexistente dão a mesma página. Nunca expõe o e-mail do dono.
export default async function SharedDesignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewerId = await requireUserId(`/app/d/${token}`);
  const shared = await loadSharedDesign(token);

  if (!shared) {
    return <p className="mx-auto mt-16 text-sm text-zinc-400">Design não encontrado.</p>;
  }

  const view = toSharedDesignView(shared);
  // O dono não leva aviso de spoiler no próprio design.
  const spoiler =
    view.contextKind === 'challenge' && shared.ownerId !== viewerId && !(await loadSolvedProblemIds(viewerId)).includes(view.contextId ?? '');
  return <SharedDesignViewer view={view} spoiler={spoiler} />;
}
