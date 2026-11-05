# Relatório de segurança — ajustes gerais (2026-11-05)

**Status**: só relatório (decisão do autor). Nada abaixo foi corrigido; cada item espera "corrigir / aceitar".

**Escopo**: `apps/web` (rotas `/api/*`, Auth.js, middleware, páginas de `/app`), dependências de produção
(`pnpm audit --prod`) e configuração do Next. Método: leitura do código de cada rota e de `src/auth.ts`,
`src/lib/csrf.ts`, `src/lib/client-ip.ts`, `next.config.ts`, mais o audit. Sem teste de intrusão contra
ambiente hospedado.

## Resumo

| # | Severidade | Pilar | Achado |
|---|---|---|---|
| 1 | **Crítica** | Dependências | Next.js 15.5.23 e Auth.js 5.0.0-beta.25 com CVEs críticos (RCE, auth "fail open") |
| 2 | **Alta** | Integridade / injeção | Narrador confia no `result` enviado pelo navegador e grava a explicação num cache compartilhado (envenenamento entre usuários + injeção de prompt) |
| 3 | **Alta** | Disponibilidade / custo | Narrador sem limite de requisições e sem limite de tamanho do corpo |
| 4 | **Alta** | Dependências | drizzle-orm 0.38 (SQL injection por identificadores), zod 3 (exaustão de memória), postcss, sharp |
| 5 | Média | Cabeçalhos HTTP | Nenhum cabeçalho de segurança (CSP, `frame-ancestors`/X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy) |
| 6 | Média | Abuso / rate limit | Cadastro sem limite de taxa: criação em massa e e-mail de confirmação disparado para qualquer endereço |
| 7 | Média | Autenticação | Bloqueio por IP usa o 1º valor de `X-Forwarded-For`, que o cliente controla se a plataforma não sobrescrever |
| 8 | Baixa | Exposição de dados | Cadastro revela se um e-mail existe ("Este email já está em uso"), ao contrário do login |
| 9 | Baixa | Autenticação | E-mail não é normalizado (maiúsculas/minúsculas viram contas diferentes) |
| 10 | Baixa | Autenticação | Conta não confirmada bloqueia para sempre o login Google do dono real do e-mail |
| 11 | Baixa | Autenticação | Bloqueio por conta permite travar a conta de outra pessoa errando a senha de propósito |
| 12 | Baixa | Sessão | JWT de 30 dias sem revogação (trocar senha não derruba sessões abertas) |
| 13 | Baixa | Segredos | Token de confirmação de e-mail guardado em texto puro no banco |

## O que está bem (conferido)

- **Autorização/IDOR**: rotas de designs exigem dono (404 para design alheio — verificado no browser no
  M4.1); submissões, incidentes e perfil usam o `userId` da sessão, nunca do corpo.
- **XP só pelo servidor**: submissão e fix reexecutam o engine; a trava de nível também vale no servidor.
- **Injeção SQL**: tudo via Drizzle parametrizado; os `sql\`\`` crus só interpolam colunas e constantes.
- **XSS**: nenhum `dangerouslySetInnerHTML`; conteúdo do usuário (apelido, nome de design) sai escapado pelo React.
- **CSRF**: rotas que mudam estado checam `Origin` (`isSameOriginRequest`); Auth.js tem a proteção própria.
- **Open redirect**: `/entrar?voltar=` passa por `safeReturnPath` (testado com `//evil.com`).
- **Login**: mensagem genérica, bcrypt, bloqueio por conta e por IP; pré-sequestro de conta via Google mitigado (conta não confirmada não é fundida).
- **Segredos**: `.env` fora do git; segredos só no servidor (nenhum `NEXT_PUBLIC_` sensível).
- **Incidentes**: a causa plantada só existe em `@sdp/problems/server`.

## Detalhe e recomendação

**1. Dependências críticas** — Next.js 15.5.23: RCE não autenticado na Image Optimization (AVIF/SVG) e em
servidores Windows; DoS com Server Actions; cache poisoning (corrigido em ≥15.5.28). Auth.js beta.25 /
@auth/core: checagem de auth que pode "falhar aberta" com erro de configuração, normalizador de e-mail
burlável por homóglifo, cookies de OAuth não vinculados ao provedor (corrigido em ≥5.0.0-beta.32 /
@auth/core ≥0.41.3). *Recomendo*: atualizar `next` para ≥15.5.28 e `next-auth` para ≥5.0.0-beta.32,
rodar testes e verificar login (senha e Google) no browser.

**2. Narrador — cache envenenável** — `POST /api/narrator` recebe `{ design, workload, result }`, monta o
prompt com o `result` do cliente e grava a resposta em `narratorExplanations`, indexada só pelo hash de
`(design, workload)`. Qualquer conta logada pode mandar um `result` falso (ou texto de injeção de prompt
dentro dele) para um design comum — a explicação fica no cache e é servida a todos que simularem o mesmo
design. Fere também a regra do produto de que "o narrador nunca contradiz o engine". *Recomendo*: o
servidor recalcula `simulate(design, workload)` e ignora o `result` do corpo; validar o design com o mesmo
`validateSubmittedDesign` das submissões.

**3. Narrador — sem limite** — sem rate limit por conta nem limite de tamanho, uma conta esgota a cota do
Gemini (20 req/dia no free tier) para todo mundo, ou manda um design gigante para ocupar CPU. *Recomendo*:
reaproveitar `consumeSubmissionQuota` (ou uma cota própria) e validar o design antes de tudo.

**4. Outras dependências altas** — drizzle-orm <0.45.2 (SQL injection por identificadores mal escapados —
o app não monta identificadores a partir de entrada do usuário, então o risco prático é baixo, mas vale
atualizar); zod 3 (exaustão de memória com coleções grandes — usado no cadastro); postcss/source-map-js
(build-time); sharp (só se a otimização de imagem for usada). *Recomendo*: atualizar junto com o item 1.

**5. Cabeçalhos** — sem `headers()` no `next.config.ts`. *Recomendo*: `Content-Security-Policy` (com
`frame-ancestors 'none'`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima.

**6. Cadastro sem limite** — `POST /api/account/signup` não tem rate limit: dá para criar contas em massa
e fazer o app mandar e-mails de confirmação para endereços de terceiros (spam e custo no Resend).
*Recomendo*: limite por IP (mesmo mecanismo do login) e, opcionalmente, CAPTCHA.

**7. IP de `X-Forwarded-For`** — `getClientIp` usa o primeiro valor do cabeçalho; se a hospedagem não
sobrescrever, quem ataca troca o valor a cada tentativa e escapa do bloqueio por IP. *Recomendo*: usar o
cabeçalho que a plataforma garante (na Vercel, `x-real-ip`/`x-vercel-forwarded-for`) ou o último salto confiável.

**8–13** — baixos; recomendações: resposta neutra no cadastro ("se o e-mail for válido, você receberá um
link"); normalizar e-mail (`trim().toLowerCase()`) no cadastro e no login; permitir que o dono real do
e-mail recupere a conta (reenviar confirmação / reset); bloqueio progressivo com atraso em vez de trava
dura; versão de sessão no JWT para revogar ao trocar senha; guardar o hash do token de confirmação.
