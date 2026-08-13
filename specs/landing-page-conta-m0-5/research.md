# Research: M0.5 — Landing Page e Conta

**Input**: [spec.md](spec.md), `docs/product-context.md` §§8,10 (ADR-005/ADR-007), respostas às
perguntas D1/D3/credenciais feitas diretamente ao autor antes deste plano.

Nenhum agente especialista de domínio Vale (`senior-frontend-react-dev`, `senior-backend-dev`) foi
consultado — são especializados em stack Vale (.NET, MFE single-spa, `@vale/agata-components-react`)
que não existe neste projeto. As decisões abaixo foram tomadas diretamente, com apoio do Context7
para Auth.js e Drizzle ORM.

## 1. Auth.js: Credentials provider força `session.strategy: "jwt"`

**Contexto**: FR-002 exige login por email/senha (Credentials provider). FR-007 exige persistir
conta em Neon. Era preciso decidir a estratégia de sessão (`jwt` vs `database`) antes de desenhar
o schema.

**Decision**: `session.strategy: "jwt"`, com `DrizzleAdapter` usado apenas para persistir
`users`/`accounts`/`verification_token` — não para sessões. `Session` (Key Entity do spec) é
realizada como um cookie JWT assinado (HttpOnly), não como uma tabela no banco.

**Rationale**: verificado via Context7 (`/nextauthjs/next-auth`, `/websites/authjs_dev`) — a
documentação oficial do Credentials provider afirma explicitamente: *"Users authenticated this way
are not persisted in the database, so this provider requires JSON Web Tokens to be enabled for
sessions"*, e o Auth.js lança um erro dedicado (`UnsupportedStrategy`) se um Credentials provider
está configurado sem `strategy: "jwt"`. Não há alternativa dentro do Auth.js — usar Credentials
implica JWT.

**Alternatives considered**: `session.strategy: "database"` — rejeitada, é literalmente incompatível
com o Credentials provider (erro em tempo de configuração, não uma preferência).

**Consequência para FR-006 (sessão de 30 dias)**: implementado via `session.maxAge: 60*60*24*30` +
`session.updateAge` do Auth.js (renovação do JWT a cada uso — "rolling session"), não via expiração
de linha em tabela.

## 2. Vínculo de conta por email (FR-013/FR-013a) — implementação custom, não o linking automático do Auth.js

**Contexto**: `/speckit-clarify` decidiu que o vínculo automático só deve ocorrer quando o email da
conta existente já está confirmado, para evitar sequestro de conta.

**Decision**: **não** usar o linking automático nativo do Auth.js (a flag `allowDangerousEmailAccountLinking`
no provider OAuth) — implementar a decisão de vínculo explicitamente num callback `signIn`
customizado, chamando a lógica pura de `src/lib/account-linking.ts` (testável sem Auth.js/DB real):
dado `(emailDaTentativa, contaExistente?, contaExistenteEmailConfirmado?, métodoAtual)`, retorna
`{ vincular: boolean }`.

**Rationale**: confirmado via Context7 que o próprio nome da flag (`allowDangerousEmailAccountLinking`)
é um alerta deliberado dos mantenedores do Auth.js: a documentação afirma que a verificação de posse
do email varia por provedor OAuth e não é garantida, e que ativar a flag pode ser explorado para
sequestrar conta — exatamente o risco que o autor pediu para mitigar em `/speckit-clarify`. O
comportamento *default* do Auth.js sem a flag é lançar `OAuthAccountNotLinked` em vez de vincular —
mais seguro, mas não implementa a regra específica do produto (permitir vínculo quando o email JÁ
está confirmado). Por isso a lógica de decisão fica no `signIn` callback, não numa flag do provider.

**Alternatives considered**: `allowDangerousEmailAccountLinking: true` — rejeitada (vincularia
sempre, incluindo com email não confirmado, exatamente o risco identificado em `/speckit-clarify`).
Deixar o comportamento default (nunca vincular) — rejeitada, contradiz FR-013 (decisão explícita do
autor de que é a mesma conta).

## 3. ORM (D3): Drizzle

**Decision**: Drizzle ORM (`drizzle-orm` + `drizzle-kit`) com driver `@neondatabase/serverless`,
adapter oficial `@auth/drizzle-adapter` para as tabelas do Auth.js.

**Rationale**: D3 era uma decisão reservada ao autor (`docs/product-context.md` §13); perguntada e
respondida diretamente antes deste plano — Drizzle escolhido por ser TypeScript-first, sem client
gerado separadamente (ao contrário do Prisma), e ter adapter oficial de primeira classe do Auth.js
(`@auth/drizzle-adapter`, confirmado via Context7) com suporte nativo ao driver serverless da Neon.

**Alternatives considered**: Prisma — também tem adapter oficial do Auth.js, mas exige um passo de
geração de client (`prisma generate`) como build step extra; rejeitado pela mesma lógica de "nenhuma
abstração antes de precisar" já usada em M0 (research.md do M0, decisão 1).

## 4. Envio do email de confirmação (FR-013a)

**Decision**: Resend (`resend` SDK) para o envio transacional do email de confirmação.

**Rationale**: free tier suficiente para a escala deste marco (produto pessoal/gratuito), SDK
TypeScript simples (uma chamada `resend.emails.send(...)`), integração de primeira classe com
Next.js/Vercel — não é uma decisão reservada ao autor (D1-D5), é um detalhe de implementação de
baixo risco (a spec já registrou isso explicitamente em Assumptions). Requer `RESEND_API_KEY` em
`.env.local`, documentado em `.env.example`; **o autor ainda não confirmou ter essa credencial** (só
confirmou Neon + Google OAuth) — ver quickstart.md para o comportamento de degradação graciosa
quando a chave não está configurada.

**Rationale de degradação graciosa**: como FR-013a já especifica que uma conta sem email confirmado
continua totalmente funcional (só não se torna vinculável), uma falha no envio do email (chave
ausente/inválida, serviço fora do ar) é tratada como não-fatal — logada, sem bloquear a criação de
conta nem o login.

**Alternatives considered**: Nodemailer com SMTP genérico — mais configuração (credenciais SMTP de
terceiro), sem vantagem sobre Resend para este volume; Auth.js Email provider (magic link) —
resolveria "verificação" de forma diferente (login sem senha), mas o produto já decidiu ter
email+senha como método explícito (FR-002), então reaproveitar o fluxo de Email provider misturaria
dois conceitos (login sem senha vs. confirmação de uma conta com senha).

## 5. Estratégia de testes: escopo restrito a módulos puros

**Decision**: cobertura automatizada (Vitest) apenas para `src/lib/password.ts`,
`src/lib/rate-limit.ts` e `src/lib/account-linking.ts` — funções puras sem I/O. Nenhum threshold de
cobertura é aplicado a `apps/web` como um todo.

**Rationale**: diferente de `packages/engine` (M0), que é 100% função pura e permitiu 80%+ de
cobertura quase de graça, M0.5 é majoritariamente *wiring* — configuração do Auth.js, adapter de
banco, callback OAuth, rotas Next.js. Testar isso exigiria mockar o Auth.js inteiro, o driver Neon e
o fluxo OAuth do Google — o teste resultante validaria o mock, não o comportamento real (evidência
não-confiável, custo alto). A superfície onde bugs realmente importam e são testáveis sem infra viva
é: regra de senha (FR-009), contagem/janela de rate limit (FR-012), e a decisão de vínculo de conta
(FR-013/FR-013a, a lógica de segurança mais sensível deste marco) — todas puras, todas testadas.

**Consequência explícita**: o fluxo de ponta a ponta (criar conta → confirmar email → logar → Google
OAuth → logout) só é verificável de fato pelo autor rodando a aplicação com credenciais reais
(Neon + Google OAuth já confirmadas; Resend pendente) — não por este plano. Ver quickstart.md e o
relatório final do `/speckit-implement` para o que fica marcado como "verificado" vs. "pendente de
execução manual".

**Alternatives considered**: mockar Auth.js/DB/OAuth extensivamente para perseguir uma métrica de
cobertura em `apps/web` — rejeitado (falso senso de segurança, alto custo de manutenção do mock a
cada mudança de versão do Auth.js).

## Resumo — todas as incógnitas do Technical Context resolvidas

Nenhum `NEEDS CLARIFICATION` remanescente no Technical Context do `plan.md`. D3 (ORM) foi resolvida
diretamente com o autor antes deste research (não durante — já chegou decidida). D1 (nome do
produto) também já respondida (mantém "System Design Playground") — sem impacto técnico neste
research, só no conteúdo da landing page.
