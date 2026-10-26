# Contrato: API de designs salvos (M4.1)

Todas: `auth()` (401); escrita com mesma origem (403); o dono é sempre o da sessão — design de outra
conta responde **404** (nunca 403, pra não revelar que existe).

| rota | corpo | resposta |
|---|---|---|
| `GET /api/designs` | — | `[{ id, name, contextKind, contextId, updatedAt, versionCount, shared }]` |
| `POST /api/designs` | `{ name, contextKind, contextId, content }` | `201 { id, version: 1 }` · `400 INVALID_CONTENT` · `409 LIMIT_REACHED` |
| `GET /api/designs/[id]` | — | `{ id, name, contextKind, contextId, shareUrl, versions: [{ number, createdAt }], latest: { number, content } }` |
| `GET /api/designs/[id]?version=N` | — | o mesmo, com `latest` = versão N (restaurar) |
| `PATCH /api/designs/[id]` | `{ name }` | `200` |
| `DELETE /api/designs/[id]` | — | `204` |
| `POST /api/designs/[id]/versions` | `{ content }` | `201 { version }` · `200 { version, unchanged: true }` · `409 LIMIT_REACHED` |
| `POST /api/designs/[id]/share` | — | `{ shareUrl }` (gera token novo se não houver) |
| `DELETE /api/designs/[id]/share` | — | `204` (revoga) |

`/app/d/[token]` (Server Component): sem sessão → `/entrar?voltar=/app/d/<token>`; token inexistente
ou revogado → "design não encontrado"; senão a visão compartilhada (sem e-mail).
