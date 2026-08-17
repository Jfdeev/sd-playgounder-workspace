# Quickstart: `apps/web` (M0.5)

## 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha (nunca commitado, nunca colado em chat):

```bash
DATABASE_URL=            # connection string do seu projeto Neon
AUTH_SECRET=              # gerar com: npx auth secret
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=           # opcional nesta fase — sem ela, contas continuam funcionando,
                           # só o email de confirmação não é enviado (research.md §4)
```

## 2. Instalar dependências e aplicar o schema no Neon

```bash
pnpm install
pnpm --filter web db:generate
pnpm --filter web db:migrate
```

## 3. Rodar os testes automatizados (módulos puros — research.md §5)

```bash
pnpm --filter web test
```

Critério de saída automatizável: `password.spec.ts`, `rate-limit.spec.ts` e
`account-linking.spec.ts` passam — cobrem FR-008/FR-009 (senha), FR-012 (rate limit) e
FR-013/FR-013a (vínculo de conta), as três áreas de lógica pura deste marco.

## 4. Rodar a aplicação e validar manualmente (o autor, com credenciais reais)

```bash
pnpm --filter web dev
```

Abra `http://localhost:3000` e confirme, **manualmente** (não automatizado neste marco — ver
research.md §5):

- [ ] Landing page carrega na rota raiz, sem exigir login (US1/FR-001).
- [ ] Criar conta com email/senha, ver a sessão ativa e a tela placeholder `/app` (US2).
- [ ] Email de confirmação chega (se `RESEND_API_KEY` configurada) e o link confirma a conta.
- [ ] Entrar com Google cria conta nova (se o email não bate com nenhuma existente) ou funde numa
      conta email/senha já confirmada (se bater) — e **não** funde numa não confirmada. Se aparecer
      "Erro 401: invalid_client" do Google, era um bug real (corrigido): `src/auth.ts` chamava
      `Google({})` sem `clientId`/`clientSecret` explícitos, e o Auth.js v5 só infere
      `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` automaticamente — não `GOOGLE_CLIENT_ID`/
      `GOOGLE_CLIENT_SECRET` (os nomes documentados aqui). Agora passados explicitamente.
- [ ] Entrar com Google **uma segunda vez** (mesma conta Google, sessão encerrada e login de novo)
      funciona normalmente — não falha com erro genérico na 2ª tentativa em diante (regressão real
      encontrada e corrigida durante `/speckit-implement`: o vínculo manual de conta tentava
      inserir a mesma linha de novo a cada login, violando a constraint de `accounts`).
- [ ] Errar a senha 5 vezes seguidas bloqueia por 15 minutos (FR-012), com mensagem genérica.
- [ ] Logout funciona; fechar e reabrir o navegador mantém a sessão (dentro de 30 dias).

Este passo **é o critério de saída de M0.5** (`docs/product-context.md` §10: "uma pessoa consegue
criar conta, fazer login e logout") — só o autor pode confirmá-lo, com o Neon e o Google OAuth reais
já em mãos.
