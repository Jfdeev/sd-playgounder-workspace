import type { LibraryEntry } from '@sdp/knowledge';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtro de busca da biblioteca (M2.7) — por nome ou id, sem acento e sem diferenciar maiúsculas.
 * `query` vazia devolve tudo; sem resultado devolve `[]` (a UI mostra o estado vazio).
 */
export function filterLibraryEntries(entries: readonly LibraryEntry[], query: string): LibraryEntry[] {
  const needle = normalize(query);
  if (needle === '') return [...entries];
  return entries.filter((entry) => normalize(entry.name).includes(needle) || normalize(entry.id).includes(needle));
}
