import Link from 'next/link';
import type { ReactNode } from 'react';
import { isLegalInfoPending, LEGAL_UPDATED_AT } from '@/lib/legal';
import { LegalLinks } from './legal-links';

/** Casca das páginas legais (specs/conta-lgpd): título, data da versão e o aviso enquanto os dados do responsável não forem preenchidos. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16">
      <article className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-300 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <Link href="/" className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-300">
          System Design Playground
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-white">{title}</h1>
        <p className="text-xs text-zinc-500">Versão de {LEGAL_UPDATED_AT.split('-').reverse().join('/')}</p>
        {isLegalInfoPending() && (
          <p role="note" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100">
            Rascunho: o nome do responsável e o e-mail de contato ainda precisam ser preenchidos antes da publicação.
          </p>
        )}
        {children}
        <p className="mt-10 text-xs text-zinc-600">
          <LegalLinks />
        </p>
      </article>
    </main>
  );
}
