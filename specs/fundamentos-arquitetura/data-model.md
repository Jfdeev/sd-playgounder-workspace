# Data Model: M2.6 — Fundamentos de arquitetura

Todos os tipos abaixo são dado puro — nenhum tem método, side effect, ou dependência de rede/UI.
Convenção: `packages/knowledge` só importa `Dimension` de `@sdp/engine` (mesma direção permitida já
usada por `packages/problems`); nada mais depende de `packages/knowledge` de forma circular.

## `packages/knowledge/src/source.ts`

```ts
export type Source = { book: string; author: string };

export const CLEAN_ARCHITECTURE: Source = {
  book: 'Clean Architecture',
  author: 'Robert C. Martin',
};

export const FUNDAMENTALS_OF_SOFTWARE_ARCHITECTURE: Source = {
  book: 'Fundamentals of Software Architecture',
  author: 'Mark Richards & Neal Ford',
};

export const PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE: Source = {
  book: 'Patterns of Enterprise Application Architecture',
  author: 'Martin Fowler',
};
```

As 3 constantes são a única forma válida de citação estruturada em todo o pacote — nenhuma ficha
escreve `{ book: '...', author: '...' }` solto, sempre reexporta uma destas três. Isso é o que torna
"toda citação vem de uma das 3 obras reais" verificável por identidade de referência num teste, não
por comparação de string frágil.

## `packages/knowledge/src/architecture-characteristic.ts`

```ts
import type { Dimension } from '@sdp/engine';
import type { Source } from './source.js';

export type Tradeoff = { against: Dimension; explanation: string };

export type ArchitectureCharacteristic = {
  dimension: Dimension;
  label: string;
  definition: string;
  /** Presente quando a característica não é uma "-ility" isolada e nomeada no livro-fonte — ver research.md §2. */
  note?: string;
  source: Source;
  tradeoffs: Tradeoff[]; // >= 1, exigido por FR-001
};

export const ARCHITECTURE_CHARACTERISTICS: Record<Dimension, ArchitectureCharacteristic> = {
  escalabilidade: { /* ... */ },
  disponibilidade: { /* ... */ },
  latencia: { /* ... */ },
  consistencia: { /* ... */ },
  custo: { /* ... */ },
  complexidade_operacional: { /* ... */ },
  seguranca: { /* ... */ },
};
```

`Record<Dimension, ArchitectureCharacteristic>` é exaustivo por construção: `Dimension` é uma união
fechada de 7 literais (`@sdp/engine`), então faltar uma entrada é erro de `tsc`, nunca um buraco
silencioso em runtime (mesmo padrão de `COMPONENT_CATALOG`/`CATEGORY_OF` em `packages/engine`).

## `packages/knowledge/src/architecture-style.ts`

```ts
import type { Source } from './source.js';

export type TemplateId = 'monolith' | 'three-tier' | 'microservices' | 'event-driven';

export type ArchitectureStyle = {
  templateId: TemplateId;
  label: string;
  whenToUse: string;
  tradeoffs: string[]; // >= 1, exigido por FR-002
  source: Source;
  /** Nota de leitura complementar sem virar citação estruturada — ver research.md §1.7/§3. */
  furtherReading?: string;
};

export const ARCHITECTURE_STYLES: Record<TemplateId, ArchitectureStyle> = {
  monolith: { /* ... */ },
  'three-tier': { /* ... */ },
  microservices: { /* ... */ },
  'event-driven': { /* ... */ },
};
```

`TemplateId` migra pra este arquivo (research.md §1.2) — `apps/web/src/lib/canvas-templates.ts`
importa `TemplateId` de `@sdp/knowledge` e usa em `ArchitectureTemplate.id` em vez de `string`.

## `packages/knowledge/src/index.ts`

Reexporta os três módulos acima — API pública do pacote, mesmo padrão de `packages/problems/src/index.ts`.

## `packages/problems/src/types.ts` (alteração)

```ts
export type Hint = {
  id: string;
  prompt: string;
  body: string;
  /** Presente só quando a dica cita um princípio da literatura — FR-003/FR-004. */
  source?: Source; // importado de '@sdp/knowledge'
};
```

Campo opcional, retrocompatível — hints de M1 sem `source` continuam válidas.

## `packages/narrator/src/schema.ts` (alteração)

```ts
export const EXPLAIN_RESULT_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { /* inalterado */ },
    bottleneck_explanation: { /* inalterado */ },
    recommendation: { /* inalterado */ },
    citation_id: {
      type: SchemaType.STRING,
      description: 'id de uma ficha de packages/knowledge relevante pro resultado, se houver uma',
      enum: [...ALL_CHARACTERISTIC_IDS, ...ALL_STYLE_TEMPLATE_IDS],
    },
  },
  required: ['summary', 'bottleneck_explanation'],
};

export type NarratorExplanation = {
  summary: string;
  bottleneck_explanation: string;
  recommendation?: string;
  citation_id?: string; // sempre um id de packages/knowledge, nunca solto — validado em parseNarratorExplanation
};
```

`parseNarratorExplanation` ganha uma verificação extra: se `citation_id` estiver presente,
`typeof === 'string'` **e** pertencer ao conjunto de ids conhecidos (import de `@sdp/knowledge`) —
caso contrário retorna `null` (mesmo tratamento de `INVALID_RESPONSE` já existente, research.md §1.6).

## `packages/narrator/src/prompt.ts` (alteração)

```ts
export const NARRATOR_PROMPT_VERSION = 2; // era implicitamente 1 antes de M2.6

export function selectRelevantKnowledge(result: SimulationResult): Array<ArchitectureCharacteristic | ArchitectureStyle> {
  // violations[].type → característica relacionada (ex. 'spof' → disponibilidade)
  // scores[dimension] < 40 → característica da própria dimensão
  // nunca lê Design/Workload — só SimulationResult (Contract Rule 2, contracts/narrator-contract.md)
}

export function buildNarratorPrompt(result: SimulationResult): string {
  // inalterado + bloco novo opcional com o conteúdo de selectRelevantKnowledge(result), quando não-vazio
}
```

## `packages/narrator/src/design-hash.ts` (alteração)

```ts
export async function hashDesign(
  design: Design,
  workload: Workload,
  promptVersion: number = NARRATOR_PROMPT_VERSION,
): Promise<string> {
  // promptVersion entra no material hasheado — cache antigo (M2, sem citação) nunca colide com
  // cache novo (M2.6, com possível citação) pro mesmo design/workload (research.md §1.6)
}
```

## `apps/web/src/lib/canvas-templates.ts` (alteração)

`ArchitectureTemplate.id: TemplateId` (importado de `@sdp/knowledge`) em vez de `id: string`.
Nenhuma outra mudança de shape.
