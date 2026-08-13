import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { accounts, sessions, users, verificationTokens } from './db/schema';
import { decideAccountLinking } from './lib/account-linking';
import { checkLoginAttempt, recordFailedAttempt, recordSuccessfulAttempt } from './lib/rate-limit';
import { verifyPassword } from './lib/password';

// `const` nomeada (não inline) — reaproveitada dentro do callback `signIn` para vínculo manual de
// conta (research.md §2, contracts/auth-api.md). Precisa ser a mesma instância passada abaixo.
const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

// Mensagem única para todas as causas de falha de login (senha errada, email inexistente, conta
// bloqueada) — nunca revela qual delas ocorreu (FR-010/SC-003, mitigação de user enumeration).
const GENERIC_LOGIN_ERROR = 'Email ou senha inválidos.';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  // Exigido pelo Credentials provider — Auth.js lança `UnsupportedStrategy` sem isto
  // (research.md §1). Sessão de 30 dias renovável a cada acesso (FR-006).
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  providers: [
    Google({
      // allowDangerousEmailAccountLinking NÃO é usado — vínculo é feito manualmente e com
      // segurança dentro do callback signIn abaixo (research.md §2).
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === 'string' ? credentials.email : null;
        const password = typeof credentials?.password === 'string' ? credentials.password : null;
        if (!email || !password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        // Email inexistente: segue o mesmo caminho de falha genérica abaixo (não revela
        // existência do email, FR-010) — não retorna cedo com uma causa diferenciável.
        if (!user || !user.passwordHash) return null;

        const now = new Date();
        const attemptCheck = checkLoginAttempt(
          { failedLoginAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil },
          now,
        );
        if (!attemptCheck.allowed) {
          // Bloqueado: nega sem sequer checar a senha (evita vazar se a senha estaria certa).
          return null;
        }

        const passwordCorrect = await verifyPassword(password, user.passwordHash);
        if (!passwordCorrect) {
          const nextState = recordFailedAttempt(
            { failedLoginAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil },
            now,
          );
          await db
            .update(users)
            .set({
              failedLoginAttempts: nextState.failedLoginAttempts,
              lockedUntil: nextState.lockedUntil,
            })
            .where(eq(users.id, user.id));
          return null;
        }

        const resetState = recordSuccessfulAttempt();
        await db
          .update(users)
          .set({
            failedLoginAttempts: resetState.failedLoginAttempts,
            lockedUntil: resetState.lockedUntil,
          })
          .where(eq(users.id, user.id));

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    // FR-013/FR-013a: decide vínculo de conta por email SÓ para o provider google — credentials
    // não passa por decisão de vínculo aqui (a checagem equivalente é feita no signup,
    // POST /api/account/signup). Roda ANTES de qualquer lógica interna de linking do Auth.js
    // (handleAuthorized → handleLoginOrRegister, research.md §2).
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.email) {
        return true;
      }

      const [existing] = await db
        .select({ id: users.id, emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      const decision = decideAccountLinking({ existingUserByEmail: existing ?? null });

      if (decision.action === 'reject') {
        // Não cria uma segunda conta com o mesmo email (violaria unique em users.email) — rejeita
        // com AccessDenied; a página de erro (pages.error, abaixo) orienta a confirmar a conta
        // pendente (decisão do autor, /speckit-plan).
        return false;
      }

      if (decision.action === 'link' && existing) {
        // Vínculo manual: getUserByAccount do core encontra esta linha recém-criada e nunca
        // chega à branch de colisão por email — allowDangerousEmailAccountLinking nunca é usado.
        // exactOptionalPropertyTypes exige omitir (não `undefined`-preencher) campos opcionais
        // ausentes — spread condicional em vez de atribuir `undefined` diretamente.
        await adapter.linkAccount?.({
          userId: existing.id,
          type: 'oauth',
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          ...(account.refresh_token !== undefined && { refresh_token: account.refresh_token }),
          ...(account.access_token !== undefined && { access_token: account.access_token }),
          ...(account.expires_at !== undefined && { expires_at: account.expires_at }),
          ...(account.token_type !== undefined && { token_type: account.token_type }),
          ...(account.scope !== undefined && { scope: account.scope }),
          ...(account.id_token !== undefined && { id_token: account.id_token }),
          ...(typeof account.session_state === 'string' && {
            session_state: account.session_state,
          }),
        });
      }

      // "create": nenhuma ação — o fluxo padrão do Auth.js cria o usuário normalmente.
      return true;
    },
  },
  pages: {
    signIn: '/entrar',
    error: '/entrar',
  },
});

export { adapter, GENERIC_LOGIN_ERROR };
