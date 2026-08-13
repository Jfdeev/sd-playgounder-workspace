# apps/web

Next.js (App Router): landing page pública, conta (email/senha + Google OAuth via Auth.js),
persistência em Neon Postgres via Drizzle. A partir de M1, também abriga o canvas/problemas/
resultado.

## Setup

```bash
cp .env.example .env.local
# preencha DATABASE_URL (Neon), AUTH_SECRET (npx auth secret), GOOGLE_CLIENT_ID/SECRET
# RESEND_API_KEY é opcional — sem ela, contas continuam funcionando, só o email de
# confirmação não é enviado (ver specs/landing-page-conta-m0-5/research.md §4)

pnpm install
pnpm --filter web db:generate   # gera migrations a partir de src/db/schema.ts (só se o schema mudou)
pnpm --filter web db:migrate    # aplica no Neon real (precisa de DATABASE_URL válida)
```

## Rodando

```bash
pnpm --filter web dev            # http://localhost:3000
pnpm --filter web test           # testes dos módulos puros (src/lib/**) — ver escopo abaixo
pnpm --filter web test:coverage  # mesma coisa, com relatório de cobertura
pnpm --filter web typecheck      # tsc --noEmit
pnpm --filter web build          # build de produção (Next.js)
```

## Escopo de teste automatizado

Cobertura automatizada (Vitest) é restrita a `src/lib/**` — os módulos puros sem I/O
(`password.ts`, `rate-limit.ts`, `account-linking.ts`, `email.ts`). Rotas, `auth.ts` e páginas
(wiring de Next.js/Auth.js/DB/OAuth) **não** têm cobertura automatizada — verificação é manual,
pelo autor, com credenciais reais de Neon/Google/Resend. Ver
`specs/landing-page-conta-m0-5/research.md` §5 para o racional completo, e
`specs/landing-page-conta-m0-5/quickstart.md` para o checklist de verificação manual.
