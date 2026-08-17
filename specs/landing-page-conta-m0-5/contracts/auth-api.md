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
0. Checar `Origin` do request contra a própria origem (`src/lib/csrf.ts`) — mitigação de CSRF
   (decisão do autor, 2026-08-14; esta rota não tem a proteção nativa que as rotas do Auth.js já
   têm). `Origin` presente e diferente → `403`. `Origin` ausente → segue (fora do escopo desta
   mitigação, que pressupõe um browser vítima).
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
- `201` — conta criada. Sessão **não** é iniciada por esta rota — o cliente autentica em seguida
  chamando `signIn("credentials", { email, password, redirect: false })` (ver T026/T030 em
  tasks.md; `signIn` do Auth.js v5 controla redirect e re-executa `authorize()`, então não compõe
  bem sendo chamado a partir de dentro de um route handler que já processou o cadastro).
- `403` — `Origin` do request não bate com a origem esperada (regra 0, CSRF).
- `400` — email/senha inválidos (corpo: `{ "field": "email"|"password", "message": string }`).
- `409` — email já cadastrado, com a mesma mensagem ("este email já está em uso") **independente**
  de a conta existente estar confirmada ou não. Nota deliberada sobre FR-010/SC-003: signup, ao
  contrário de login, precisa necessariamente informar que um email já está em uso (não dá para
  pedir para alguém "criar conta" com um email sem dizer que já existe) — essa divulgação é
  inerente ao próprio fluxo de cadastro, não uma violação de SC-003 (que é especificamente sobre
  **login**, nunca revelar se um email existe). O que se evita aqui é revelar o *motivo* (confirmado
  vs. não confirmado) — as duas situações retornam texto idêntico, para não sinalizar a terceiros
  qual conta está vulnerável a uma tentativa futura de vínculo.

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
  `adapter.linkAccount({ provider: "google", providerAccountId, userId: existingUserByEmail.id,
  type: "oauth" })` **manualmente** (só campos de identidade — nenhum token OAuth, ver nota de
  segurança abaixo) e retorna `true`. O `getUserByAccount` que o core roda em seguida encontra
  esse vínculo recém-criado e nunca chega à branch de colisão por email — a flag
  `allowDangerousEmailAccountLinking` nunca é usada (research.md §2).
- `existingUserByEmail.emailVerified === null` → `"reject"` (FR-013a — mitigação de sequestro de
  conta) — `signIn` retorna `false`. Auth.js converte isso em `AccessDenied` e redireciona para a
  página de erro com mensagem clara ("já existe uma conta pendente de confirmação para este email").
  **Não** cria uma segunda conta com o mesmo email (violaria `unique` em `users.email`) — decisão
  confirmada com o autor durante este plano (ver Clarifications no spec).

## Rate limiting — não é uma rota, é uma verificação no `authorize()` do Credentials provider

Duas camadas, ambas via `src/lib/rate-limit.ts` (`checkLoginAttempt`/`recordFailedAttempt`,
parametrizadas por `LoginAttemptPolicy` — decisão do autor, 2026-08-14):

1. **IP** (`ACCOUNT_LOGIN_POLICY` não se aplica aqui — usa `IP_LOGIN_POLICY`, 20 tentativas/15min):
   checado **primeiro**, antes de qualquer consulta a `users` — se o IP (`src/lib/client-ip.ts`,
   `x-forwarded-for`/`x-real-ip`) já está bloqueado, nega sem sequer olhar o email. Camada contra
   *credential spraying* (uma tentativa em muitas contas diferentes).
2. **Conta** (`ACCOUNT_LOGIN_POLICY`, 5 tentativas/15min, FR-012 original): checado depois de
   encontrar o usuário pelo email — se `lockedUntil` está no futuro, nega sem verificar a senha
   (evita que o rate limit em si vaze se a senha estaria certa).

Toda falha (`authorize` retorna `null`) — IP bloqueado, email inexistente, conta bloqueada, senha
errada — incrementa o contador de **IP**; só a senha errada incrementa também o contador de
**conta** (o único caso onde de fato existe uma conta e uma tentativa de senha para contar).

Em todos os casos de falha, a mensagem visível ao usuário é idêntica — "email ou senha inválidos"
— nunca revela qual motivo ocorreu (FR-010/SC-003).
