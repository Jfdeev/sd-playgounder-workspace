import type { ReactNode } from 'react';
import { AppPageNav } from './app-page-nav';

/**
 * Casca das telas de /app fora do canvas (Progresso, Biblioteca, Ranking, perfil) — mesma barra e
 * mesmo vocabulário visual do canvas (ajustes gerais, US4), no lugar do "Voltar ao canvas" solto de
 * cada página.
 */
export function AppPage({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppPageNav />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-6">
          <h1 className="text-lg font-semibold text-zinc-100">{title}</h1>
          {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
