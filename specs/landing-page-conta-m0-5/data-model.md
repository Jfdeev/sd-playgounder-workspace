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
| `refresh_token`, `access_token`, `expires_at`, `id_token`, `scope`, `session_state`, `token_type` | conforme padrão Auth.js | **colunas existem** (exigidas pelo tipo esperado pelo `@auth/drizzle-adapter`) mas **sempre `NULL`** — decisão do autor (2026-08-14): `linkAccount` do adapter é interceptado em `src/auth.ts` para nunca persistir tokens OAuth do Google. O produto usa Google só para autenticar, nunca chama API do Google depois do login — guardar um token que o app nunca lê é superfície de ataque sem benefício (minimização de dados); um vazamento do banco não deve incluir credencial utilizável de terceiros. Colunas mantidas (não removidas do schema) só por compatibilidade de tipo com o adapter — a garantia real está no código, não no schema. |

PK composta `(provider, providerAccountId)` — padrão do adapter.

## `verification_token`

Tabela padrão do adapter, **reaproveitada** para o token de confirmação de email (FR-013a) — o
mesmo mecanismo que o Auth.js usa para Email provider (magic link) serve como token de confirmação
de posse de email, sem inventar uma tabela nova.

**Checagem de segurança desse reaproveitamento**: o Auth.js só lê/consome (`useVerificationToken`)
esta tabela através de um provider do tipo `email` (ex.: `Nodemailer`, `Resend` como *provider* de
login). Este projeto usa apenas `Credentials` e `Google` como providers — nenhum provider `email` é
registrado em `src/auth.ts` — então nada no core do Auth.js jamais lê ou apaga linhas desta tabela
por conta própria; escrita e consumo são 100% controlados pelas rotas próprias
(`POST /api/account/signup` escreve, `GET /api/account/confirm-email` lê e apaga). **Se um provider
`email`/magic-link for adicionado em marco futuro, esta suposição quebra** — reavaliar nesse
momento (mover a confirmação para uma tabela própria em vez de compartilhar `verification_token`).

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

## Rate limiting (FR-012) — duas camadas, por conta e por IP

**Por conta**: colunas do próprio `users` (`failedLoginAttempts`, `lockedUntil`) — decisão de
simplicidade original (nenhuma necessidade de histórico de tentativas, só o contador atual e o
timestamp de desbloqueio), consistente com "nenhuma abstração antes de precisar".

**Por IP** (`loginIpAttempts`, decisão do autor, 2026-08-14 — endurecimento pós-implementação):
camada secundária contra *credential spraying* (uma tentativa em muitas contas diferentes, nenhuma
isolada bate o limite por conta). Precisa de tabela própria — um IP tentando emails que não
existem nunca teria uma linha de `users` pra guardar o estado.

| Coluna | Tipo | Regras |
|---|---|---|
| `ip` | `text`, PK | extraído de `x-forwarded-for`/`x-real-ip` (`src/lib/client-ip.ts`); `"unknown"` em dev local sem proxy — todas as tentativas locais compartilham esse bucket, limitação aceita |
| `failedAttempts` | `integer`, not null, default `0` | |
| `lockedUntil` | `timestamp`, nullable | |

Limite deliberadamente mais alto que o de conta (20 tentativas / 15min, vs. 5/15min por conta) —
evita punir IPs compartilhados legítimos (NAT, rede corporativa/escolar) enquanto ainda pega
volume de spray. Conta como falha de IP qualquer `authorize()` que retorna `null` (senha errada,
email inexistente, conta já bloqueada) — não só senha errada — porque o objetivo é medir volume
de tentativas mal-sucedidas vindas daquele IP, não o motivo específico de cada uma.

Ambas as camadas reaproveitam a mesma lógica pura em `src/lib/rate-limit.ts`
(`checkLoginAttempt`/`recordFailedAttempt`), parametrizada por uma `LoginAttemptPolicy`
(`ACCOUNT_LOGIN_POLICY` vs. `IP_LOGIN_POLICY`) — testada isoladamente (research.md §5), as rotas
só chamam essa função e persistem o resultado.
