# Contract: Rotas de conta/autenticação (M0.5)

**Input**: [data-model.md](../data-model.md), [research.md](../research.md)

Rotas geridas pelo Auth.js (`/api/auth/*`, geradas automaticamente pelo handler — não documentadas
aqui, comportamento é o padrão do Auth.js v5 configurado em `src/auth.ts`) e duas rotas próprias.

## `POST /api/account/signup`

Cria conta por email/senha. **Necessário porque o Credentials provider do Auth.js só autentica, não
cria contas** (confirmado em research.md — Introdução).

**Request**:
```json
{ "email": "string", "password": "string" }
```

**Regras** (aplicadas nesta ordem):
1. Validar formato de `email` e política mínima de senha (`src/lib/password.ts`) — falha →
   `400` com mensagem específica por campo (FR-009).
2. Verificar se já existe `users.email` igual:
   - Se existe **e** `emailVerified` preenchido (conta confirmada, de qualquer método) → `409`,
     mensagem "email já cadastrado" (FR-009). **Não cria conta duplicada nem sobrescreve.**
   - Se existe **e** `emailVerified` é `null` (conta não confirmada, criada anteriormente e nunca
     confirmada) → `409` também — evita que um segundo signup reescreva a senha de uma conta em
     nome de outra pessoa (mesmo risco de sequestro do FR-013a, aplicado aqui simetricamente).
   - Se não existe → cria `users` com `passwordHash` (bcrypt), `emailVerified: null`.
3. Gera token em `verification_token` (expira em 24h) e envia email via Resend
   (`src/lib/email.ts`) — falha de envio é logada, **não** bloqueia a resposta (research.md §4).
4. Autentica a sessão imediatamente (sign-in automático pós-signup) — não espera confirmação
   (acceptance scenario 1, US2).

**Responses**:
- `201` — conta criada, sessão iniciada (cookie de sessão setado).
- `400` — email/senha inválidos (corpo: `{ "field": "email"|"password", "message": string }`).
- `409` — email já cadastrado.

## `GET /api/account/confirm-email?token=...`

Confirma posse do email a partir do link enviado no signup (FR-013a).

**Regras**:
1. Busca `verification_token` pelo `token`. Não encontrado ou `expires < now()` → `400`, mensagem
   genérica ("link inválido ou expirado") — não revela detalhes do token para terceiros.
2. Encontrado e válido → seta `users.emailVerified = now()` para o `identifier` correspondente,
   apaga o `verification_token` usado (uso único), redireciona para `/app` (ou `/entrar` se a sessão
   já expirou) com mensagem de sucesso.

**Responses**: `302` (redirect) nos dois casos — sucesso e erro se distinguem pela query string do
destino (`?confirmado=1` / `?erro=link_invalido`), não por status HTTP, porque é um link clicado
direto do email (navegação de topo, não uma chamada de API consumida por JS).

## `signIn` callback do Auth.js (`src/auth.ts`) — não é uma rota, mas é o contrato de decisão mais importante do marco

Chamado pelo Auth.js **antes** de qualquer lógica interna de linking (confirmado via Context7 —
`handleAuthorized` roda antes de `handleLoginOrRegister`, ver research.md §2). Só se aplica à
tentativa de login **Google** (Credentials não passa por decisão de vínculo aqui — ver
`POST /api/account/signup` para a checagem equivalente na criação). Delega a decisão a
`src/lib/account-linking.ts` (função pura, testada):

```ts
function decideAccountLinking(input: {
  existingUserByEmail: { id: string; emailVerified: Date | null } | null;
}): { action: "create" | "link" | "reject" }
```

- `existingUserByEmail === null` → `"create"` — `signIn` retorna `true` sem tocar em nada; o Auth.js
  segue seu fluxo padrão (cria usuário novo).
- `existingUserByEmail.emailVerified !== null` → `"link"` (funde, FR-013) — `signIn` chama
  `adapter.linkAccount({ provider: "google", providerAccountId, userId: existingUserByEmail.id, ...
  tokens })` **manualmente** e retorna `true`. O `getUserByAccount` que o core roda em seguida
  encontra esse vínculo recém-criado e nunca chega à branch de colisão por email — a flag
  `allowDangerousEmailAccountLinking` nunca é usada (research.md §2).
- `existingUserByEmail.emailVerified === null` → `"reject"` (FR-013a — mitigação de sequestro de
  conta) — `signIn` retorna `false`. Auth.js converte isso em `AccessDenied` e redireciona para a
  página de erro com mensagem clara ("já existe uma conta pendente de confirmação para este email").
  **Não** cria uma segunda conta com o mesmo email (violaria `unique` em `users.email`) — decisão
  confirmada com o autor durante este plano (ver Clarifications no spec).

## Rate limiting — não é uma rota, é uma verificação no `authorize()` do Credentials provider

Antes de validar a senha, `authorize()` chama `src/lib/rate-limit.ts` com
`(failedLoginAttempts, lockedUntil, now)`:
- Se `lockedUntil` está no futuro → rejeita imediatamente (mensagem genérica, FR-010), **sem**
  verificar a senha (evita que o rate limit em si vaze se a senha estaria certa).
- Senão, valida a senha normalmente:
  - Errada → incrementa `failedLoginAttempts`; se atingir 5, seta `lockedUntil = now + 15min`
    (FR-012).
  - Certa → zera `failedLoginAttempts` e `lockedUntil`.

Em ambos os casos de falha (senha errada, conta bloqueada, email inexistente), a mensagem visível ao
usuário é idêntica — "email ou senha inválidos" — nunca revela qual dos três motivos ocorreu
(FR-010/SC-003).
