# Tasks: M0.5 — Landing Page e Conta

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/auth-api.md](contracts/auth-api.md), [quickstart.md](quickstart.md)

**Tests**: incluídas para os três módulos de lógica pura (`password.ts`, `rate-limit.ts`,
`account-linking.ts`) e para o wrapper de email — escopo de cobertura decidido em research.md §5
(não perseguir cobertura em `apps/web` inteiro; wiring de Auth.js/DB/OAuth é verificado
manualmente pelo autor via quickstart.md, com credenciais reais).

**Organização**: por user story (todas P1) — spec.md não define ordem de prioridade entre elas além
de todas serem P1, mas há uma dependência técnica real: US1 (landing) não depende de conta; US2
(criar conta) precisa do schema/Auth.js base; US3 (entrar numa conta existente/sair) reaproveita a
config de Auth.js que US2 estabelece. Ordem de implementação: Setup → Foundational → US1 → US2 → US3
→ Polish.

## Phase 1: Setup

- [X] T001 Criar app Next.js 15 (App Router, TypeScript strict) em `apps/web/` como workspace pnpm
      (`apps/web/package.json` com `name: "web"`, `apps/web/tsconfig.json` estendendo o strict mode
      já usado em `packages/engine/tsconfig.json`)
- [X] T002 Instalar dependências em `apps/web`: `next`, `react`, `react-dom`, `next-auth@beta`
      (Auth.js v5), `@auth/drizzle-adapter`, `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`,
      `bcryptjs`, `resend`, `zod`; devDependencies: `vitest`, `@vitest/coverage-v8`, `@types/node`,
      `@types/bcryptjs`, `typescript`
- [X] T003 [P] Configurar `apps/web/vitest.config.ts` (reaproveitando o padrão de
      `packages/engine/vitest.config.ts`, sem threshold global de cobertura — research.md §5)
- [X] T004 [P] Criar `apps/web/.env.example` documentando `DATABASE_URL`, `AUTH_SECRET`,
      `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (com comentário indicando que
      `RESEND_API_KEY` é opcional — degradação graciosa, research.md §4)
- [X] T005 [P] Criar `apps/web/drizzle.config.ts` apontando para `src/db/schema.ts` e
      `src/db/migrations/`, dialect `postgresql`, credenciais via `DATABASE_URL`

**Checkpoint**: `pnpm --filter web install` e `pnpm --filter web typecheck` rodam sem erro (app
vazio, sem rotas ainda).

## Phase 2: Foundational (bloqueia todas as user stories)

- [X] T006 Criar `apps/web/src/db/schema.ts` com as tabelas `users`, `accounts`,
      `verification_token` (Drizzle `pg-core`) conforme data-model.md — incluindo as colunas de
      extensão do produto (`passwordHash`, `failedLoginAttempts`, `lockedUntil` em `users`)
- [X] T007 Criar `apps/web/src/db/client.ts` — instância Drizzle sobre `@neondatabase/serverless`
      lendo `DATABASE_URL` (research.md, contrato do `drizzle-team/drizzle-orm-docs` para Neon)
- [X] T008 Gerar a primeira migration (`drizzle-kit generate` a partir de T006) e documentar em
      `apps/web/src/db/migrations/` (aplicação real (`drizzle-kit migrate`) fica para o autor rodar
      com o `DATABASE_URL` real — ver quickstart.md)
- [X] T009 Criar `apps/web/src/auth.ts` — config base do Auth.js v5: `DrizzleAdapter(db, schema)`,
      `session: { strategy: "jwt", maxAge: 60*60*24*30, updateAge: 60*60*24 }` (FR-006, research.md
      §1), providers `Google` e `Credentials` registrados (sem lógica de `authorize`/`signIn` ainda
      — preenchida nas fases US2/US3), export de `handlers, auth, signIn, signOut`
- [X] T010 Criar `apps/web/src/app/api/auth/[...nextauth]/route.ts` exportando `GET`/`POST` de
      `handlers` (T009)
- [X] T011 [P] Criar `apps/web/src/app/layout.tsx` (layout raiz mínimo, sem conteúdo de produto)

**Checkpoint**: `pnpm --filter web dev` sobe sem erro; `/api/auth/session` responde (sessão vazia).
Nenhuma user story ainda é utilizável — é o alicerce comum.

## Phase 3: User Story 1 — Visitante entende o produto e decide criar conta (P1)

**Goal**: landing page pública na rota raiz com hero, diferenciais, comparação e CTA (FR-001).

**Independent Test**: acessar `/` sem estar autenticado; hero, diferenciais (Modo Campanha, Modo
Incidente, Budget forçado + Pareto, Import/export) e comparação (concorrentes de
`docs/product-context.md` §1) visíveis; CTA leva a `/entrar`.

- [X] T012 [US1] Ler `docs/product-context.md` §§1-2 e `docs/foundational-doc.md` §7.1-7.4
      integralmente antes de escrever qualquer copy (evitar parafrasear de memória — texto vai ao
      ar como conteúdo público)
- [X] T013 [US1] Criar `apps/web/src/app/page.tsx` — Server Component: se `auth()` retorna sessão
      ativa, `redirect("/app")` (FR-011); senão, renderiza a landing page
- [X] T014 [P] [US1] Criar seção Hero em `apps/web/src/app/_components/hero.tsx` — proposta de
      valor central (`docs/product-context.md` §2: momento "aha"), nome do produto "System Design
      Playground" (D1, decisão do autor), CTA principal para `/entrar`. **Revisado em
      2026-08-13** (ver spec.md, Session 2026-08-13): badge "engine determinístico vs. LLM como
      juiz" removido do hero; `ArchitecturePreview` (mockup de canvas) substituído por
      `LoadCurvePreview` (curva de latência × carga) — visual anterior ficou parecido demais com
      um site de referência mostrado pelo autor.
- [X] T015 [P] [US1] Criar seção Diferenciais em
      `apps/web/src/app/_components/differentiators.tsx` — os 4 itens ⭐ de
      `docs/foundational-doc.md` §7.1-7.4 (Modo Campanha, Modo Incidente, Budget forçado +
      fronteira de Pareto, Import/export)
- [X] ~~T016 [P] [US1] Criar seção Comparação em `apps/web/src/app/_components/comparison.tsx`~~ —
      **removida em 2026-08-13** a pedido do autor (ver spec.md, Session 2026-08-13, FR-001
      atualizado): a landing passou a liderar com a experiência do produto, não com o argumento
      técnico "determinístico vs. LLM". Arquivo `comparison.tsx` deletado.
- [X] T017 [US1] Compor `hero` e `differentiators` dentro de `page.tsx` (T013) — sem `comparison`
      (ver T016)

**Checkpoint**: `/` renderiza a landing completa para visitante não autenticado; US1 é
demonstrável isoladamente (sem nenhuma conta existir ainda).

## Phase 4: User Story 2 — Criar conta e entrar pela primeira vez (P1)

**Goal**: criar conta por email/senha ou Google, com confirmação de email e vínculo seguro
(FR-002/003/007/008/009/013/013a).

**Independent Test**: criar conta por email/senha → autenticado imediatamente, senha nunca em texto
puro, email de confirmação enviado (ou falha logada sem bloquear); criar conta via Google →
autenticado; tentar signup com email já cadastrado (confirmado) → erro claro.

- [X] T018 [P] [US2] Criar `apps/web/src/lib/password.ts` — `hashPassword(plain): Promise<string>`
      (bcrypt), `verifyPassword(plain, hash): Promise<boolean>`, `validatePasswordPolicy(plain):
      { valid: boolean; message?: string }` (mínimo 8 caracteres — Assumptions do spec, FR-009)
- [X] T019 [US2] `apps/web/test/password.spec.ts` — cenários: senha válida passa a política; senha
      curta é rejeitada com mensagem; hash nunca igual à senha em texto puro; `verifyPassword` aceita
      hash correto e rejeita incorreto
- [X] T020 [US2] Coverage pass: `password.ts` — para cada decisão em `validatePasswordPolicy`
      (comprimento mínimo) e `verifyPassword`, garantir teste que quebra se a linha for mutada
- [X] T021 [P] [US2] Criar `apps/web/src/lib/account-linking.ts` — `decideAccountLinking(input: {
      existingUserByEmail: { id: string; emailVerified: Date | null } | null }): { action: "create"
      | "link" | "reject" }` conforme contracts/auth-api.md
- [X] T022 [US2] `apps/web/test/account-linking.spec.ts` — os 3 casos (nenhum usuário existente →
      `create`; usuário existente confirmado → `link`; usuário existente não confirmado → `reject`)
- [X] T023 [US2] Coverage pass: `account-linking.ts` — garantir que os 3 branches de
      `decideAccountLinking` têm teste dedicado (não só o caminho feliz)
- [X] T024 [P] [US2] Criar `apps/web/src/lib/email.ts` — `sendConfirmationEmail(to, token):
      Promise<void>` via Resend; captura erro do SDK e loga (`console.error`) sem relançar —
      degradação graciosa (research.md §4)
- [X] T025 [US2] `apps/web/test/email.spec.ts` — com o client do Resend mockado: chamada com sucesso
      resolve; chamada que rejeita é capturada e não propaga (a Promise de `sendConfirmationEmail`
      resolve mesmo assim)
- [X] T026 [US2] Implementar `apps/web/src/app/api/account/signup/route.ts` (`POST`) conforme
      contracts/auth-api.md: valida `email`/`password` (T018), verifica email existente
      (`emailVerified` preenchido → `409`; `emailVerified` null → `409` também, mensagem de conta
      pendente), cria `users` com `passwordHash`, gera `verification_token` (24h), chama
      `sendConfirmationEmail` (T024) e retorna `201` (**não** chama `signIn` do lado servidor —
      `signIn` do Auth.js v5 espera controlar o redirect e re-executaria `authorize()`
      desnecessariamente; o form de `criar-conta/page.tsx`, T030, faz a autenticação chamando
      `signIn("credentials", { email, password, redirect: false })` no cliente logo após o `201`,
      dois round-trips, cada rota fazendo uma única coisa)
- [X] T027 [US2] Implementar `apps/web/src/app/api/account/confirm-email/route.ts` (`GET`) —
      valida token/expiração, seta `users.emailVerified = now()`, apaga o `verification_token`
      usado, redireciona conforme contracts/auth-api.md
- [X] T028 [US2] Completar `signIn` callback em `apps/web/src/auth.ts` para o provider `google`:
      chama `decideAccountLinking` (T021) consultando `users` por email; `"link"` → `adapter.
      linkAccount(...)` manual + `return true`; `"reject"` → `return false`; `"create"` → `return
      true` sem ação (research.md §2, contracts/auth-api.md). Requer que o `DrizzleAdapter(db,
      schema)` (T009) seja atribuído a uma `const adapter` nomeada — passada tanto para `adapter:`
      na config do `NextAuth(...)` quanto usada diretamente dentro do `signIn` callback
- [X] T029 [US2] Configurar provider `Google` em `apps/web/src/auth.ts` com `GOOGLE_CLIENT_ID`/
      `GOOGLE_CLIENT_SECRET` — **sem** `allowDangerousEmailAccountLinking` (research.md §2)
- [X] T030 [P] [US2] Criar `apps/web/src/app/criar-conta/page.tsx` — form email/senha: `POST
      /api/account/signup` (T026) e, em caso de `201`, chama `signIn("credentials", { email,
      password, redirect: false })` no cliente para autenticar a sessão, depois navega para `/app`;
      botão "Entrar com Google" (`signIn("google")`); exibe erros de `400`/`409` por campo (FR-009)
- [X] T031 [P] [US2] Criar `apps/web/src/app/app/page.tsx` — placeholder autenticado ("dentro do
      produto", Assumptions do spec); Server Component que faz `redirect("/entrar")` se `auth()` não
      retorna sessão

**Checkpoint**: criar conta por email/senha ou Google funciona de ponta a ponta contra Neon real
(verificação manual do autor, quickstart.md — não automatizada, research.md §5); os 3 módulos puros
têm 100% dos branches de decisão testados.

## Phase 5: User Story 3 — Entrar numa conta existente e sair (P1)

**Goal**: login por email/senha ou Google, mensagens de erro genéricas, rate limiting, logout,
sessão persistente de 30 dias (FR-004/005/006/010/012).

**Independent Test**: logar com credenciais corretas → sessão criada; senha errada → mensagem
genérica (não revela existência do email); 5 tentativas erradas seguidas → bloqueio de 15min; logout
→ volta a visitante; fechar/reabrir navegador dentro de 30 dias → continua autenticado.

- [X] T032 [P] [US3] Criar `apps/web/src/lib/rate-limit.ts` — `checkLoginAttempt(state: {
      failedLoginAttempts: number; lockedUntil: Date | null }, now: Date): { allowed: boolean }` e
      `recordFailedAttempt(state, now): { failedLoginAttempts: number; lockedUntil: Date | null }`
      (bloqueia no 5º erro consecutivo por 15min, FR-012) e `recordSuccessfulAttempt(): {
      failedLoginAttempts: 0; lockedUntil: null }`
- [X] T033 [US3] `apps/web/test/rate-limit.spec.ts` — cenários: tentativas abaixo do limite
      permitidas; 5ª tentativa errada ativa o bloqueio; tentativa durante bloqueio é negada sem
      contar como nova tentativa; bloqueio expira exatamente em 15min; sucesso reseta o contador
- [X] T034 [US3] Coverage pass: `rate-limit.ts` — garantir teste para cada comparação de limite/
      janela (5 tentativas, 15 minutos, `now < lockedUntil`)
- [X] T035 [US3] Completar `authorize()` do provider `Credentials` em `apps/web/src/auth.ts`:
      busca `users` por email; se não encontrado OU `lockedUntil` no futuro (T032) OU senha incorreta
      (`verifyPassword`, T018) → retorna `null` (mensagem genérica única em todos os 3 casos,
      FR-010/SC-003) e, quando a causa foi senha incorreta, persiste `recordFailedAttempt`; se
      correta, persiste `recordSuccessfulAttempt` e retorna o usuário
- [X] T036 [P] [US3] Criar `apps/web/src/app/entrar/page.tsx` — form email/senha (`signIn(
      "credentials", ...)`), botão "Entrar com Google", exibe a mensagem de erro genérica em caso de
      falha, botão de logout quando já autenticado é irrelevante aqui (fica em `/app`)
- [X] T037 [US3] Adicionar botão "Sair" em `apps/web/src/app/app/page.tsx` (T031) chamando
      `signOut()` (FR-005)

**Checkpoint**: login/logout/persistência de sessão/rate limiting verificados manualmente pelo autor
(quickstart.md) contra Neon + Google OAuth reais.

## Phase 6: Polish

- [X] T038 [P] Rodar `pnpm --filter @sdp/engine test` após o install de `apps/web` — confirmar que
      os 121 testes e o `no-runtime-deps.spec.ts` do M0 continuam passando sem regressão de
      resolução de workspace (recomendação registrada durante `/speckit-plan`)
- [X] T039 [P] Adicionar `apps/web/README.md` — como preencher `.env.local`, como rodar
      `drizzle-kit generate`/`migrate`, como rodar `pnpm --filter web test` e `pnpm --filter web dev`
      (resumo do quickstart.md)
- [X] T040 Rodar `pnpm --filter web test` com cobertura e confirmar que os 3 módulos puros
      (`password.ts`, `rate-limit.ts`, `account-linking.ts`) estão exercitados em todos os branches
      de decisão (coverage passes T020/T023/T034)
- [X] T041 Revisar `specs/landing-page-conta-m0-5/spec.md` — status permanece `Ready` (não `Done`):
      SC-001/SC-002 exigem verificação humana com credenciais reais que este `/speckit-implement`
      não pode executar (research.md §5, quickstart.md §4) — registrar isso explicitamente no
      relatório final do implement, não promover o Status sem essa verificação

## Dependencies

- **Setup (T001-T005)** → bloqueia tudo.
- **Foundational (T006-T011)** → bloqueia US1/US2/US3 (schema, client, auth.ts base, layout).
- **US1 (T012-T017)** → independente de US2/US3 (não toca contas) — pode ser feita em paralelo com
  elas depois do Foundational, mas está sequenciada primeiro por ser a mais simples de verificar.
- **US2 (T018-T031)** → depende do Foundational; T028/T029 (callback `signIn`, provider Google)
  precisam de T021 (`account-linking.ts`) pronto.
- **US3 (T032-T037)** → depende de T018 (`password.ts`, para `verifyPassword` em T035) e do
  Foundational; independente de US2 no sentido de que a lógica de rate limit não depende de signup,
  mas T035 modifica o mesmo arquivo (`auth.ts`) que T028/T029 — fazer US2 antes de US3 evita editar
  `authorize()`/`signIn()` fora de ordem no mesmo arquivo.
- **Polish (T038-T041)** → depende de US1+US2+US3 completos.

## Parallel Example

Dentro do Foundational, após T006 (schema): T007 e T011 podem rodar em paralelo (arquivos
diferentes). Dentro de US1: T014, T015, T016 são paralelas entre si (componentes independentes),
convergindo em T017. Dentro de US2: T018, T021, T024 (os três módulos puros) são paralelos entre si
antes de T026-T029 (rotas que os consomem).

## Implementation Strategy

**MVP scope**: US1 sozinha já é demonstrável (landing pública) mas não cumpre o critério de saída de
M0.5 (`docs/product-context.md` §10: precisa de conta funcional). O MVP real deste marco é
**Setup + Foundational + US1 + US2 + US3** — as três user stories são P1 e juntas formam o critério
de saída; não há uma fatia menor que o satisfaça.

**Incremental delivery**: implementar e commitar por fase (Setup → Foundational → US1 → US2 → US3 →
Polish), na ordem deste documento — cada checkpoint acima é um ponto seguro para parar/retomar.

**Ordem de execução real (ajustada no `/speckit-implement`)**: dentro de US2, os três módulos puros
e seus testes (T018-T025) são implementados e commitados **antes** de T012-T017 (copy da landing),
apesar da numeração — são a única parte deste marco verificável de fato nesta sessão (sem
credenciais reais de Neon/Google), então ficam primeiro para que uma interrupção deixe algo durável
e comprovadamente correto, não apenas copy de marketing sem lógica testada por trás.
