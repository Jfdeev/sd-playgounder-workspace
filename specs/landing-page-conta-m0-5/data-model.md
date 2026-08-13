# Data Model: M0.5 — Landing Page e Conta

**Input**: [spec.md](spec.md) Key Entities, [research.md](research.md) §§1-2.

Schema Drizzle (`apps/web/src/db/schema.ts`), Postgres via Neon. Nomenclatura de tabela/coluna segue
o padrão esperado pelo `@auth/drizzle-adapter` (Context7, `authjs.dev/getting-started/adapters/drizzle`)
para `users`/`accounts`/`verification_token`, estendido com as colunas específicas do produto.

## `users` (Account / Conta, no vocabulário do spec)

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `text` (uuid), PK | gerado |
| `name` | `text`, nullable | opcional (perfil Google pode trazer) |
| `email` | `text`, **unique**, not null | chave de identidade e de vínculo (FR-013) |
| `emailVerified` | `timestamp`, nullable | **campo exigido pelo Auth.js adapter**; reaproveitado como `emailConfirmedAt` do spec — não-nulo = "email confirmado" (FR-013a). Preenchido automaticamente na criação para contas Google (research.md §1); preenchido só após clique no link de confirmação para contas email/senha |
| `image` | `text`, nullable | avatar (Google) |
| `passwordHash` | `text`, nullable | **extensão do produto**, não faz parte do schema padrão do Auth.js. `null` para contas que só usam Google. Hash via `bcryptjs` (FR-008) — nunca a senha em texto puro (SC-004) |
| `failedLoginAttempts` | `integer`, not null, default `0` | **extensão do produto** (FR-012) |
| `lockedUntil` | `timestamp`, nullable | **extensão do produto** (FR-012) — bloqueado enquanto `now() < lockedUntil` |
| `createdAt` | `timestamp`, not null, default `now()` | |

**Validação/regras**:
- Um `email` corresponde a no máximo um registro `users` (constraint `unique`) — nunca duas contas
  para o mesmo email (FR-013).
- `passwordHash` só é gravado por `POST /api/account/signup` (contrato em `contracts/auth-api.md`) —
  Auth.js Credentials **não** cria usuário, só autentica (Context7, confirmado em research do plan).

## `accounts` (vínculo de método de login — nome padrão do Auth.js; **não confundir com `users`/Account do spec**)

Tabela padrão do `@auth/drizzle-adapter` — um `users.id` pode ter múltiplas linhas aqui (uma por
provedor: `credentials`, `google`). É o mecanismo técnico do Auth.js para "múltiplos métodos, mesma
conta" depois que `signIn` callback decide vincular (research.md §2).

| Coluna | Tipo | Regras |
|---|---|---|
| `userId` | `text`, FK → `users.id` | |
| `type` | `text` | `"oauth"` \| `"credentials"` |
| `provider` | `text` | `"google"` \| `"credentials"` |
| `providerAccountId` | `text` | id do usuário no provedor (Google `sub`, ou o próprio `users.id` para credentials) |
| `refresh_token`, `access_token`, `expires_at`, `id_token`, `scope`, `session_state`, `token_type` | conforme padrão Auth.js | preenchidos só para `google` |

PK composta `(provider, providerAccountId)` — padrão do adapter.

## `verification_token`

Tabela padrão do adapter, **reaproveitada** para o token de confirmação de email (FR-013a) — o
mesmo mecanismo que o Auth.js usa para Email provider (magic link) serve como token de confirmação
de posse de email, sem inventar uma tabela nova.

| Coluna | Tipo | Regras |
|---|---|---|
| `identifier` | `text` | o email a confirmar |
| `token` | `text` | token opaco, gerado em `POST /api/account/signup` |
| `expires` | `timestamp` | validade curta (24h — prática padrão, sem impacto de escopo) |

PK composta `(identifier, token)`.

## Sessão (Key Entity "Session" do spec)

**Não é uma tabela.** Conforme research.md §1, o Credentials provider força `session.strategy: "jwt"`
— a sessão é um cookie JWT assinado e HttpOnly, com `maxAge` de 30 dias e renovação a cada acesso
(`updateAge`), nunca uma linha em `sessions` (tabela que o adapter provê mas que este projeto não
usa, já que não há `session.strategy: "database"`).

## Máquina de estados — `users.emailVerified` / vínculo (FR-013/FR-013a)

```text
[conta criada via email/senha] --emailVerified: null--> [funcional, mas NÃO vinculável]
        | usuário clica no link de confirmação (token válido, não expirado)
        v
[emailVerified: now()] --> [vinculável: um login Google com o mesmo email FUNDE nesta conta]

[conta criada via Google] --emailVerified: preenchido na criação--> [vinculável desde o início]
```

Nenhuma outra transição de estado existe neste marco (sem "desvincular", sem "reenviar confirmação"
— fora de escopo, não pedido pela spec).

## Rate limiting (FR-012) — não é uma entidade separada

Implementado como colunas do próprio `users` (`failedLoginAttempts`, `lockedUntil`) em vez de uma
tabela de tentativas separada — decisão de simplicidade (nenhuma necessidade de histórico de
tentativas, só o contador atual e o timestamp de desbloqueio), consistente com "nenhuma abstração
antes de precisar". A lógica pura de decisão (quando incrementar, quando bloquear, quando resetar)
vive em `src/lib/rate-limit.ts` e é testada isoladamente (research.md §5) — as rotas só chamam essa
função e persistem o resultado.
