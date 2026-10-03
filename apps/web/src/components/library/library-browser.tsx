'use client';

/**
 * Navegador da biblioteca de princípios — apps/web/src/components/library/library-browser.tsx (M2.7)
 *
 * Busca por nome/id (`filterLibraryEntries`), categorias → grupos, uma entrada aberta por vez. Sem
 * nenhum estado de usuário, progresso ou ranking (FR-010 — progresso por conceito é do M4).
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { LIBRARY_CATEGORY_LABELS, type LibraryCategory, type LibraryEntry } from '@sdp/knowledge';
import { filterLibraryEntries } from '@/lib/library-search';
import { LibraryEntryCard } from './library-entry-card';

const CATEGORY_ORDER = Object.keys(LIBRARY_CATEGORY_LABELS) as LibraryCategory[];

/** Agrupa preservando a ordem de aparição dos grupos dentro da categoria. */
function groupByGroup(entries: readonly LibraryEntry[]): Array<[string, LibraryEntry[]]> {
  const groups = new Map<string, LibraryEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.group);
    if (bucket) bucket.push(entry);
    else groups.set(entry.group, [entry]);
  }
  return [...groups.entries()];
}

export function LibraryBrowser({
  entries,
  initialEntryId,
}: {
  entries: readonly LibraryEntry[];
  initialEntryId: string | null;
}) {
  const [query, setQuery] = useState('');
  // Um id desconhecido (?entry=xyz) é ignorado — nunca quebra a página.
  const [openId, setOpenId] = useState<string | null>(
    initialEntryId !== null && entries.some((entry) => entry.id === initialEntryId) ? initialEntryId : null,
  );
  const openRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (initialEntryId !== null) openRef.current?.scrollIntoView({ block: 'center' });
    // só ao montar: o link de uma dica deve levar o usuário até a entrada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = filterLibraryEntries(entries, query);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <Link
        href="/app"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Voltar ao canvas
      </Link>

      <h1 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
        <BookOpen className="size-5 text-violet-400" aria-hidden />
        Biblioteca de princípios
      </h1>
      <p className="mt-1 text-xs text-zinc-500">
        Princípios, características e padrões da literatura clássica de arquitetura — só leitura, sem
        pontuação. Nenhum deles é calculado pela plataforma.
      </p>

      <label className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 focus-within:border-violet-500">
        <Search className="size-4 text-zinc-500" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome (ex.: SOLID, lock, recuperabilidade)"
          aria-label="Buscar na biblioteca"
          className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
        />
      </label>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-zinc-500">
          Nenhuma entrada encontrada para “{query.trim()}”.
        </p>
      )}

      {CATEGORY_ORDER.map((category) => {
        const inCategory = filtered.filter((entry) => entry.category === category);
        if (inCategory.length === 0) return null;
        return (
          <section key={category} className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {LIBRARY_CATEGORY_LABELS[category]}{' '}
              <span className="font-normal normal-case text-zinc-600">({inCategory.length})</span>
            </h2>
            {groupByGroup(inCategory).map(([group, groupEntries]) => (
              <div key={group} className="mt-3">
                <h3 className="mb-1.5 text-xs font-medium text-zinc-400">{group}</h3>
                <ul className="space-y-1.5">
                  {groupEntries.map((entry) => {
                    const isOpen = openId === entry.id;
                    return (
                      <li key={entry.id} ref={isOpen ? openRef : undefined} id={entry.id}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpenId(isOpen ? null : entry.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                            isOpen
                              ? 'border-violet-600/60 bg-violet-950/30 text-violet-200'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-violet-500'
                          }`}
                        >
                          {entry.name}
                        </button>
                        {isOpen && (
                          <div className="mt-1.5">
                            <LibraryEntryCard entry={entry} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
