# Data Model: M2.5 — Arquiteturas de referência

Tudo dado puro — sem método, rede ou banco. `packages/knowledge` continua dependendo só de
`@sdp/engine` (tipos `Design`, `ComponentType`, `EdgeKind`).

## `packages/knowledge/src/reference-architectures.ts` (novo)

```ts
import type { ComponentType, Design, EdgeKind } from '@sdp/engine';

/** Fonte web — distinta do `Source` do M2.6 (livro + autor). */
export type WebSource = {
  id: string;            // único dentro do preset, ex. 'partition'
  title: string;
  publisher: string;     // publicador primário; vendor/terceiro só se declarado como tal
  url: string;
  accessedAt: string;    // ISO date — a fonte pode mudar ou sair do ar
};

export type PresetNode = {
  id: string;                    // vira o id do nó no canvas (designToCanvas preserva)
  type: ComponentType;
  replicas: number;
  label: string;
  sourceIds: readonly string[];  // >= 1
  /** Quando o tipo do catálogo é só uma aproximação do componente real. */
  approximation?: string;
  /** Réplicas são ilustrativas por padrão; só ficam false se uma fonte der o número. */
  replicasIllustrative: boolean;
  replicasSourceId?: string;     // obrigatório quando replicasIllustrative === false
  explanation: { text: string; sourceIds: readonly string[] };
};

export type PresetEdge = {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  weight: number;
  basis: 'afirmada' | 'inferida';
  sourceIds: readonly string[];  // obrigatório (>= 1) quando basis === 'afirmada'
  note?: string;                 // por que é inferida / o que colapsa
};

export type ReferenceArchitecture = {
  id: string;                    // 'github', 'discord', ...
  company: string;
  summary: string;               // pt-br
  sources: readonly WebSource[];
  nodes: readonly PresetNode[];
  edges: readonly PresetEdge[];
  entryNodeIds: readonly string[];
  /** O que o simulador não modela / simplificou — sempre >= 1 item, exibido no preset. */
  limitations: readonly string[];
};

export const REFERENCE_ARCHITECTURES: readonly ReferenceArchitecture[];
export function getReferenceArchitecture(id: string): ReferenceArchitecture | undefined;
export function toDesign(preset: ReferenceArchitecture): Design;   // projeção pura
```

`toDesign` projeta nós/arestas para o `Design` do engine (descarta explicação, fonte, `basis`);
é a única ponte entre o dado do preset e `designToCanvas`/`simulate`.

### Invariantes (testes em `packages/knowledge/test/reference-architectures.spec.ts`)

1. `id` de preset, de nó e de aresta únicos dentro do preset.
2. Todo `sourceIds` referencia uma `WebSource` do próprio preset; todo nó tem `sourceIds` e
   `explanation.text` não vazios (FR-003, FR-006 — "nenhum componente sem explicação").
3. Toda aresta tem `basis`; `afirmada` ⇒ `sourceIds` não vazio; `inferida` ⇒ `note` não vazia.
4. Toda aresta `inferida` aparece em `limitations` (o texto da limitação a cita pelo id).
5. `limitations` não vazio; `entryNodeIds` ⊆ ids de nós.
6. `replicasIllustrative === false` ⇒ `replicasSourceId` presente e existente.
7. `WebSource.url` é `https://` e `accessedAt` é uma data ISO válida.

### Teste em `apps/web/test/reference-architectures.spec.ts` (a matriz de conexões mora lá)

Para cada preset: toda aresta passa em `isValidCanvasConnection(tipoDe(from), tipoDe(to))`; e
`simulate(toDesign(preset), workloadIlustrativa)` devolve **zero** violações (FR-002, SC-003).

## `apps/web` — estado do canvas

`canvas-store`: campo `loadedPresetId: string | null`, definido ao carregar um preset e **limpo**
em qualquer outro `loadDesign`, no "apagar tudo" e ao trocar de desafio. Alimenta (a) o aviso de
valores ilustrativos no painel de resultado e (b) a explicação no painel do nó selecionado.

## Fora do modelo

Nenhuma tabela, migração, rota de API, mudança em `SimulationResult`, no engine ou no narrador.
