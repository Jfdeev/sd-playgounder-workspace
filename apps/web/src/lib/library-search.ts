import type { LibraryEntry } from '@sdp/knowledge';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtro de busca da biblioteca (M2.7) — por nome, id ou grupo ("SOLID" só aparece no grupo), sem
 * acento e sem diferenciar maiúsculas.
 * `query` vazia devolve tudo; sem resultado devolve `[]` (a UI mostra o estado vazio).
 */
export function filterLibraryEntries(entries: readonly LibraryEntry[], query: string): LibraryEntry[] {
  const needle = normalize(query);
  if (needle === '') return [...entries];
  return entries.filter((entry) =>
    [entry.name, entry.id, entry.group].some((field) => normalize(field).includes(needle)),
  );
}
