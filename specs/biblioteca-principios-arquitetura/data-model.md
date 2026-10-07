# Data Model: M2.7 — Biblioteca de princípios de arquitetura

Tudo dado puro — sem método, side effect, rede ou banco. `packages/knowledge` continua sem depender
de nada além de `@sdp/engine` (só pelo tipo `Dimension`, já usado no M2.6).

## `packages/knowledge/src/library.ts` (novo)

```ts
import type { Source } from './source.js';

export type LibraryCategory = 'clean-architecture' | 'architecture-characteristics' | 'poeaa';

/** Só duas relações existem: a plataforma nunca calcula nenhum desses princípios (spec FR-004). */
export type TopologyRelation = { relation: 'analogia' | 'nenhuma'; note: string };

export type LibraryEntry = {
  id: string;            // kebab-case, único na biblioteca
  category: LibraryCategory;
  group: string;         // ex. 'Princípios de design (SOLID)', 'Operacionais', 'Concorrência offline'
  name: string;
  definition: string;
  source: Source;        // sempre uma das 3 constantes de source.ts (FR-002)
  /** Obrigatório quando category === 'clean-architecture' (FR-004). */
  topology?: TopologyRelation;
  /**
   * Obrigatório nas outras duas categorias — texto fixo que diz que a plataforma não calcula a
   * característica / que o padrão é só leitura (spec US2.2, FR-005).
   */
  platformNote?: string;
};

export const LIBRARY_ENTRIES: readonly LibraryEntry[] = [ /* 39 entradas — content-draft.md */ ];

export function getLibraryEntry(id: string): LibraryEntry | undefined;
export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string>;
```

`LibraryCategory` **é** uma união fechada, então `LIBRARY_CATEGORY_LABELS` usa `Record<LibraryCategory,
string>` (exaustivo por construção). As entradas em si ficam numa lista — ver `research.md` §2.2.

### Invariantes (viram teste em `packages/knowledge/test/library.spec.ts`)

1. `id` único em toda a lista.
2. `source` é uma das 3 constantes (identidade de referência, igual ao M2.6).
3. `category === 'clean-architecture'` ⇒ `topology` presente e `note` não vazia.
4. `category !== 'clean-architecture'` ⇒ `platformNote` presente.
5. A lista tem exatamente as entradas do inventário aprovado (39; 9/19/11 por categoria) — protege
   contra remoção silenciosa.
6. Nenhum `id` de característica coincide com uma `Dimension` (as 7 ficam fora, `research.md` §1).
7. As 5 entradas SOLID (`srp`, `ocp`, `lsp`, `isp`, `dip`) existem (FR-003).

## `packages/problems/src/types.ts` (alteração)

```ts
export type Hint = {
  id: string;
  prompt: string;
  body: string;
  source?: Source;
  /** M2.7, US4 — id de uma LibraryEntry; a dica oferece "Ler na biblioteca" quando presente. */
  libraryEntryId?: string;
};
```

Teste em `packages/problems/test/hints-library-link.spec.ts`: todo `libraryEntryId` de todo problema
resolve via `getLibraryEntry` (nunca link morto — US4 cenário 2).

## `apps/web/src/lib/library-search.ts` (novo)

```ts
export function filterLibraryEntries(entries: readonly LibraryEntry[], query: string): LibraryEntry[];
```

Casa por nome, id **e** grupo ("SOLID" só aparece no grupo — achado da verificação manual), sem acento, case-insensitive; `query` vazia devolve tudo; sem resultado
devolve `[]` (a UI mostra o estado vazio — edge case do spec).

## Fora do modelo

Nenhuma tabela, nenhuma migração, nenhuma mudança em `SimulationResult`, no engine ou no narrador.
