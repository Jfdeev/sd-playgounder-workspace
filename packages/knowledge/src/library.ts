import { ALL_DIMENSIONS } from '@sdp/engine';
import { CHARACTERISTICS_ENTRIES } from './library/characteristics.js';
import { CLEAN_ARCHITECTURE_ENTRIES } from './library/clean-architecture.js';
import { CONCEPT_ENTRIES } from './library/concepts.js';
import { POEAA_ENTRIES } from './library/poeaa.js';
import {
  CLEAN_ARCHITECTURE,
  DESIGNING_DATA_INTENSIVE_APPLICATIONS,
  FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE,
  type Source,
} from './source.js';

export type LibraryCategory = 'concepts' | 'clean-architecture' | 'architecture-characteristics' | 'poeaa';

/** Só duas relações existem: a plataforma nunca calcula nenhum desses princípios (spec FR-004). */
export type TopologyRelation = { relation: 'analogia' | 'nenhuma'; note: string };

export type LibraryEntry = {
  id: string;
  category: LibraryCategory;
  group: string;
  name: string;
  definition: string;
  source: Source;
  /** Obrigatório em `clean-architecture` (FR-004). */
  topology?: TopologyRelation;
  /** Obrigatório nas outras categorias (spec US2 cenário 2, FR-005). */
  platformNote?: string;
  /** Obrigatório em `concepts` (M4.3): o que se ganha e o que se paga. */
  tradeoff?: string;
  /** Obrigatório em `concepts` (M4.3): capítulo da obra citada — os princípios citam só obra + autor. */
  chapter?: string;
  /** Opcional (M4.3): outras entradas da biblioteca relacionadas a esta. */
  relatedEntryIds?: readonly string[];
};

/** A ordem das chaves é a ordem das seções na biblioteca. */
export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string> = {
  concepts: 'Conceitos de system design',
  'clean-architecture': 'Clean Architecture',
  'architecture-characteristics': 'Características de arquitetura',
  poeaa: 'Padrões de aplicações corporativas (PoEAA)',
};

export const LIBRARY_ENTRIES: readonly LibraryEntry[] = [
  ...CONCEPT_ENTRIES,
  ...CLEAN_ARCHITECTURE_ENTRIES,
  ...CHARACTERISTICS_ENTRIES,
  ...POEAA_ENTRIES,
];

/** Os conceitos de system design (M4.3), na ordem da biblioteca. */
export { CONCEPT_ENTRIES };

export function getLibraryEntry(id: string): LibraryEntry | undefined {
  return LIBRARY_ENTRIES.find((entry) => entry.id === id);
}

const KNOWN_SOURCES: readonly Source[] = [
  CLEAN_ARCHITECTURE,
  FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE,
  PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE,
  DESIGNING_DATA_INTENSIVE_APPLICATIONS,
];

/**
 * Devolve as violações dos invariantes da biblioteca (data-model.md) — `[]` quando válida. Pura, para
 * poder ser testada com entradas inválidas (um teste que só olha o dado real passaria no vácuo).
 */
export function validateLibraryEntries(entries: readonly LibraryEntry[]): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();
  const dimensionIds = new Set<string>(ALL_DIMENSIONS);
  const allIds = new Set(entries.map((entry) => entry.id));

  for (const entry of entries) {
    if (seenIds.has(entry.id)) problems.push(`${entry.id}: id duplicado`);
    seenIds.add(entry.id);

    if (dimensionIds.has(entry.id)) {
      problems.push(`${entry.id}: coincide com uma dimensão de score (já tem ficha no M2.6)`);
    }
    if (!KNOWN_SOURCES.includes(entry.source)) problems.push(`${entry.id}: fonte fora das 4 obras`);
    if (entry.definition.trim() === '') problems.push(`${entry.id}: definição vazia`);

    if (entry.category === 'clean-architecture') {
      if (!entry.topology || entry.topology.note.trim() === '') {
        problems.push(`${entry.id}: Clean Architecture exige a relação com a topologia (FR-004)`);
      }
    } else if (!entry.platformNote || entry.platformNote.trim() === '') {
      problems.push(`${entry.id}: exige platformNote`);
    }

    if (entry.category === 'concepts') {
      if (!entry.tradeoff || entry.tradeoff.trim() === '') problems.push(`${entry.id}: conceito exige trade-off`);
      if (!entry.chapter || entry.chapter.trim() === '') problems.push(`${entry.id}: conceito exige o capítulo da fonte`);
    }
    for (const relatedId of entry.relatedEntryIds ?? []) {
      if (relatedId === entry.id || !allIds.has(relatedId)) problems.push(`${entry.id}: entrada relacionada inválida "${relatedId}"`);
    }
  }

  return problems;
}
