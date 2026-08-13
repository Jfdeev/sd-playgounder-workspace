# Implementation Plan: M0.5 — Landing Page e Conta

**Branch**: `feature/001-landing-page-auth-m05` | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/landing-page-conta-m0-5/spec.md`

## Summary

Primeira UI real do produto: uma landing page pública (rota raiz) com hero, diferenciais e
comparação com concorrentes, e um sistema de conta (email/senha + Google OAuth via Auth.js,
persistido em Neon Postgres via Drizzle ORM) com login, logout, sessão de 30 dias, rate limiting
básico contra força bruta, e vínculo seguro de conta por email (só funde contas quando o email já
está confirmado — mitigação de sequestro de conta, decidida em `/speckit-clarify`). Ao final,
usuário autenticado vê uma tela placeholder "dentro do produto" — o canvas (M1) ainda não existe.

Abordagem técnica: `apps/web` passa a ser um app Next.js real (App Router) pela primeira vez —
ADR-001. Auth.js (ADR-007) com `DrizzleAdapter` sobre Neon (ADR-005), `session.strategy: "jwt"`
(exigido pelo Credentials provider — ver research.md §1). Endpoint próprio de signup (Auth.js
Credentials só valida, não cria conta). Confirmação de email via link com token, enviado por Resend.
Rate limiting e trava de conta persistidos no próprio Postgres (sem novo serviço externo).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, consistente com `packages/engine`), Node.js 20 LTS.

**Primary Dependencies**: Next.js 15 (App Router, ADR-001), Auth.js v5 (`next-auth`, ADR-007),
`@auth/drizzle-adapter`, Drizzle ORM (`drizzle-orm`, `drizzle-kit`) — D3, decisão do autor
(2026-08-12) —, `@neondatabase/serverless` (driver Neon, ADR-005), `bcryptjs` (hash de senha,
pure-JS — sem binding nativo, seguro em função serverless), `resend` (envio do email de confirmação
— ver research.md §4), `zod` (validação de formulário/payload, já é prática recomendada nos próprios
exemplos oficiais do Auth.js Credentials).

**Storage**: Postgres serverless via Neon (ADR-005). Schema gerenciado por Drizzle (`drizzle-kit
generate` + `migrate`). Tabelas Auth.js padrão (`users`, `accounts`, `verification_token`) mais
extensões do projeto (`emailConfirmedAt`, `passwordHash`, contadores de rate limit) — ver
data-model.md.

**Testing**: Vitest (mesmo runner do `packages/engine`, reaproveita config). Escopo de cobertura
**restrito aos módulos puros** (validação de senha, lógica de rate limiting, normalização/decisão de
vínculo de conta por email) — ver research.md §5 para o racional de não perseguir 80% em
`apps/web` inteiro nesta fase (código de integração com Auth.js/DB/OAuth não é testável de forma
significativa sem credenciais reais, e mocká-lo por completo testaria o mock, não o comportamento).

**Target Platform**: Web (Next.js, deploy-agnóstico neste marco — hospedagem não é uma decisão deste
plano).

**Project Type**: Web application — primeiro código real em `apps/web/` (Next.js), consumindo
`packages/ui` (ainda vazio; componentes da landing/formulários entram aqui) e não dependendo de
`packages/engine` neste marco (zero relação entre M0.5 e o motor de simulação).

**Performance Goals**: Não há meta numérica própria deste marco em `docs/product-context.md`; SC-001
("entender a landing e chegar ao fluxo de criação de conta em <1min") é sobre compreensão humana, não
performance técnica — sem meta de latência de página a validar automaticamente aqui.

**Constraints**: Zero custo de infraestrutura nova além de Neon (já decidido) e Resend (free tier —
ver research.md §4); nenhuma senha em texto puro em nenhum lugar (FR-008/SC-004); mensagens de erro
de login genéricas (FR-010/SC-003, mitigação de user enumeration).

**Scale/Scope**: Produto pessoal/gratuito, escala de poucos usuários neste marco — nenhuma decisão de
escala (índices avançados, cache, filas) é justificada agora.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

A constitution (`.specify/memory/constitution.md`) rege inteiramente `packages/engine` — motor de
simulação puro. M0.5 não toca `packages/engine`: nenhuma linha de código, nenhuma dependência nova
ali, nenhuma mudança de comportamento do motor.

| Princípio | Aplicável a M0.5? | Situação |
|---|---|---|
| I–VI (engine puro, determinismo, anti-decoreba, score multidimensional, fórmulas literais, camadas) | Não — específicos de `packages/engine` | N/A |
| VII — Fronteira de camadas (Engine / Aplicação / Narrador) | Sim | **Passa**: `apps/web` é a camada "Aplicação" — banco de dados, autenticação, UI e chamadas de rede são exatamente o que essa camada tem permissão de fazer. M0.5 não introduz nenhum motor de cálculo, nenhuma métrica, nenhuma pontuação — é conta e apresentação, fora do escopo do que a constitution regula. |

**Resultado**: nenhuma violação, nenhuma amplificação necessária. Sem `Complexity Tracking` a
preencher.

## Project Structure

### Documentation (this feature)

```text
specs/landing-page-conta-m0-5/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md          # Phase 1 output
├── contracts/
│   └── auth-api.md        # Phase 1 output
├── quickstart.md          # Phase 1 output
└── tasks.md               # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

Não existe `.specify/memory/patterns.md` neste projeto — estrutura abaixo é derivada diretamente do
monorepo já estabelecido em M0 (`CLAUDE.md`) e do ADR-001 (Next.js App Router).

```text
apps/web/                          # primeiro código real deste app (Next.js 15, App Router)
├── src/
│   ├── app/
│   │   ├── page.tsx                # landing page pública (rota raiz) — US1
│   │   ├── layout.tsx
│   │   ├── entrar/page.tsx          # form login (email/senha + botão Google) — US2/US3
│   │   ├── criar-conta/page.tsx     # form signup email/senha — US2
│   │   ├── app/page.tsx             # placeholder autenticado pós-login (Assumptions)
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts   # handlers Auth.js (GET/POST)
│   │       ├── account/signup/route.ts       # cria conta email/senha (FR-002/FR-008)
│   │       └── account/confirm-email/route.ts # confirma email via token (FR-013a)
│   ├── auth.ts                      # config central Auth.js (providers, callbacks, adapter)
│   ├── db/
│   │   ├── schema.ts                 # tabelas Drizzle (users/accounts/verification_token + extensões)
│   │   ├── client.ts                 # instância Drizzle sobre @neondatabase/serverless
│   │   └── migrations/               # geradas por drizzle-kit
│   └── lib/
│       ├── password.ts               # hash/validação de senha (puro, testado)
│       ├── rate-limit.ts             # lógica de bloqueio de tentativas (puro, testado)
│       ├── account-linking.ts        # decisão de vínculo por email (puro, testado)
│       └── email.ts                  # envio do email de confirmação (Resend, wrapper fino)
├── drizzle.config.ts
├── .env.example                      # DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, RESEND_API_KEY
├── package.json
└── test/
    ├── password.spec.ts
    ├── rate-limit.spec.ts
    └── account-linking.spec.ts

packages/ui/                        # componentes compartilhados da landing/forms (se algo for extraído)
```

**Structure Decision**: Web application dentro do monorepo pnpm já existente. `apps/web` deixa de
ser um README e passa a ser o app Next.js real. Módulos de lógica pura (`src/lib/*`) ficam
separados das rotas/integrações para permitir teste unitário sem mocks pesados — mesmo espírito de
`packages/engine` (isolar o que é cálculo/decisão do que é I/O), mas aplicado dentro de `apps/web`
porque essa lógica é específica de autenticação web, não pertence ao motor de simulação.
