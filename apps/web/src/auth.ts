import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { and, eq } from 'drizzle-orm';
import { db } from './db/client';
import { accounts, loginIpAttempts, sessions, users, verificationTokens } from './db/schema';
import { decideAccountLinking } from './lib/account-linking';
import {
  checkLoginAttempt,
  IP_LOGIN_POLICY,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from './lib/rate-limit';
import { verifyPassword } from './lib/password';
import { getClientIp } from './lib/client-ip';

const baseAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

const adapter = {
  ...baseAdapter,
  linkAccount: (account: Parameters<NonNullable<typeof baseAdapter.linkAccount>>[0]) =>
    baseAdapter.linkAccount!({
      userId: account.userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    }),
};

// Mensagem única para todas as causas de falha de login (senha errada, email inexistente, conta
// bloqueada) — nunca revela qual delas ocorreu (FR-010/SC-003, mitigação de user enumeration).
const GENERIC_LOGIN_ERROR = 'Email ou senha inválidos.';

/**
 * Registra uma tentativa de login malsucedida no nível de IP (camada secundária contra
 * credential spraying, `IP_LOGIN_POLICY`) — chamada em TODO caminho de falha do `authorize`
 * abaixo (senha errada, email inexistente, conta já bloqueada), não só senha errada, porque a
 * intenção aqui é contar volume de tentativas mal-sucedidas vindas do IP, independente do motivo.
 * Upsert (não há linha pra um IP na 1ª tentativa) — leitura+escrita não-atômica é aceitável para
 * uma camada secundária de rate limit (mesmo padrão já usado para o contador por conta).
 */
async function recordIpFailure(ip: string, now: Date): Promise<void> {
  const [current] = await db
    .select({
      failedAttempts: loginIpAttempts.failedAttempts,
      lockedUntil: loginIpAttempts.lockedUntil,
    })
    .from(loginIpAttempts)
    .where(eq(loginIpAttempts.ip, ip))
    .limit(1);

  const next = recordFailedAttempt(
    {
      failedLoginAttempts: current?.failedAttempts ?? 0,
      lockedUntil: current?.lockedUntil ?? null,
    },
    now,
    IP_LOGIN_POLICY,
  );

  await db
    .insert(loginIpAttempts)
    .values({ ip, failedAttempts: next.failedLoginAttempts, lockedUntil: next.lockedUntil })
    .onConflictDoUpdate({
      target: loginIpAttempts.ip,
      set: { failedAttempts: next.failedLoginAttempts, lockedUntil: next.lockedUntil },
    });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const email = typeof credentials?.email === 'string' ? credentials.email : null;
        const password = typeof credentials?.password === 'string' ? credentials.password : null;
        if (!email || !password) return null;

        const now = new Date();
        const ip = getClientIp(request.headers);

        // Camada de IP checada ANTES de qualquer consulta de conta — se o IP já está bloqueado
        // por volume (credential spraying), nega sem sequer olhar se o email existe.
        const [ipState] = await db
          .select({
            failedAttempts: loginIpAttempts.failedAttempts,
            lockedUntil: loginIpAttempts.lockedUntil,
          })
          .from(loginIpAttempts)
          .where(eq(loginIpAttempts.ip, ip))
          .limit(1);
        const ipCheck = checkLoginAttempt(
          { failedLoginAttempts: ipState?.failedAttempts ?? 0, lockedUntil: ipState?.lockedUntil ?? null },
          now,
        );
        if (!ipCheck.allowed) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user || !user.passwordHash) {
          await recordIpFailure(ip, now);
          return null;
        }

        const attemptCheck = checkLoginAttempt(
          { failedLoginAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil },
          now,
        );
        if (!attemptCheck.allowed) {
          await recordIpFailure(ip, now);
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
          await recordIpFailure(ip, now);
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
        const [alreadyLinked] = await db
          .select({ userId: accounts.userId })
          .from(accounts)
          .where(
            and(
              eq(accounts.provider, account.provider),
              eq(accounts.providerAccountId, account.providerAccountId),
            ),
          )
          .limit(1);

        if (alreadyLinked) {
          return true;
        }

        await adapter.linkAccount?.({
          userId: existing.id,
          type: 'oauth',
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });
      }

      return true;
    },
  },
  pages: {
    signIn: '/entrar',
    error: '/entrar',
  },
});

export { adapter, GENERIC_LOGIN_ERROR };
