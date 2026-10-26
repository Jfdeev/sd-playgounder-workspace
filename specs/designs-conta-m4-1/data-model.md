# Data Model: M4.1 — Designs na conta

## Tabelas (`apps/web/src/db/schema.ts`)

### `savedDesigns`

| coluna | tipo | regra |
|---|---|---|
| `id` | text PK (uuid) | |
| `userId` | text not null, FK `user.id` cascade | |
| `name` | text not null | 1–80 caracteres |
| `contextKind` | text not null | `'sandbox' \| 'challenge' \| 'incident'` |
| `contextId` | text, nullable | id do desafio/incidente |
| `shareToken` | text, unique, nullable | link ativo; `null` = não compartilhado |
| `createdAt` / `updatedAt` | timestamp | |

### `designVersions`

| coluna | tipo | regra |
|---|---|---|
| `id` | text PK (uuid) | |
| `designId` | text not null, FK `savedDesigns.id` cascade | |
| `number` | integer not null | 1, 2, 3… — **único `(designId, number)`** |
| `content` | jsonb not null | `SavedCanvas` (imutável) |
| `contentHash` | text not null | SHA-256 do conteúdo canonicalizado |
| `createdAt` | timestamp | |

Exclusão da conta → designs → versões (cascade). Limites: 50 designs/conta, 100 versões/design (gate 2).

## `SavedCanvas` (`lib/designs/saved-canvas.ts`)

```ts
type SavedCanvas = {
  nodes: { id: string; position: { x: number; y: number }; data: FlowNodeData /* sem result */ }[];
  edges: { id: string; source: string; target: string; data: FlowEdgeData }[];
  loadedPresetId: string | null;
};
```

`toSavedCanvas(canvasState)` e `fromSavedCanvas(saved)` puros; `contentHash(saved)` sobre o JSON
canonicalizado (nós e arestas ordenados por id).

## Visão compartilhada (`lib/designs/shared-view.ts`)

`{ name, contextKind, contextId, ownerNickname: string | null, version: { number, createdAt, content } }`
— montado campo a campo; nunca `userId`, e-mail ou token de outro design.
