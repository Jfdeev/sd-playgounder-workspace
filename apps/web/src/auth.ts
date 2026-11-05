import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { isAttemptAllowed, recordAttempt, resetAttempts } from './db/attempts';
import { db } from './db/client';
import { accounts, sessions, users, verificationTokens } from './db/schema';
import { decideAccountLinking } from './lib/account-linking';
import { normalizeEmail } from './lib/email-address';
import {
  ACCOUNT_LOGIN_POLICY,
  ACCOUNT_WIDE_LOGIN_POLICY,
  attemptKey,
  checkLoginAttempt,
  IP_LOGIN_POLICY,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from './lib/rate-limit';
import { verifyPassword } from './lib/password';
import { getClientIp } from './lib/client-ip';
import { isSessionCurrent, sessionCheckNeeded } from './lib/session-version';

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

/** Conta pelo e-mail sem diferenciar maiúsculas — contas antigas podem ter sido gravadas sem normalizar (item 9). */
const sameEmail = (email: string) => sql`lower(${users.email}) = ${normalizeEmail(email)}`;

async function loadSessionVersion(userId: string): Promise<number | null> {
  const [row] = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.sessionVersion ?? null;
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
        const email = typeof credentials?.email === 'string' ? normalizeEmail(credentials.email) : null;
        const password = typeof credentials?.password === 'string' ? credentials.password : null;
        if (!email || !password) return null;

        const now = new Date();
        const ip = getClientIp(request.headers, process.env.CLIENT_IP_HEADER);
        const ipKey = attemptKey.ip(ip);

        // Camada de IP checada ANTES de qualquer consulta de conta — se o IP já está bloqueado
        // por volume (credential spraying), nega sem sequer olhar se o email existe.
        if (!(await isAttemptAllowed(ipKey, now))) return null;
        const failFromIp = () => recordAttempt(ipKey, now, IP_LOGIN_POLICY);

        const [user] = await db.select().from(users).where(sameEmail(email)).limit(1);
        if (!user || !user.passwordHash) {
          await failFromIp();
          return null;
        }

        // Item 11: as 5 tentativas (FR-012) contam por conta + IP — errar a senha de outra pessoa de
        // propósito só trava quem erra. O teto da conta inteira (50) segura força bruta distribuída.
        const sourceKey = attemptKey.accountFromIp(user.id, ip);
        const accountWide = { failedLoginAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil };
        if (!checkLoginAttempt(accountWide, now).allowed || !(await isAttemptAllowed(sourceKey, now))) {
          await failFromIp();
          return null;
        }

        if (!(await verifyPassword(password, user.passwordHash))) {
          const next = recordFailedAttempt(accountWide, now, ACCOUNT_WIDE_LOGIN_POLICY);
          await Promise.all([
            db
              .update(users)
              .set({ failedLoginAttempts: next.failedLoginAttempts, lockedUntil: next.lockedUntil })
              .where(eq(users.id, user.id)),
            recordAttempt(sourceKey, now, ACCOUNT_LOGIN_POLICY),
            failFromIp(),
          ]);
          return null;
        }

        const reset = recordSuccessfulAttempt();
        await Promise.all([
          db
            .update(users)
            .set({ failedLoginAttempts: reset.failedLoginAttempts, lockedUntil: reset.lockedUntil })
            .where(eq(users.id, user.id)),
          resetAttempts(sourceKey),
        ]);

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    // FR-013/FR-013a: decide vínculo de conta por email SÓ para o provider google — credentials
    // não passa por decisão de vínculo aqui (a checagem equivalente é feita no signup,
    // POST /api/account/signup). Roda ANTES de qualquer lógica interna de linking do Auth.js
    // (handleAuthorized → handleLoginOrRegister, research.md §2).
    //
    // BUGFIX (2026-08-25): um login de RETORNO com uma identidade Google já vinculada caía na
    // mesma decisão de fusão de FR-013/FR-013a — e como `emailVerified` nunca era de fato
    // carimbado na criação de uma conta via Google (ver abaixo), `decideAccountLinking` via
    // `emailVerified: null` e sempre devolvia 'reject', travando pra sempre o segundo login em
    // diante com "conta pendente de confirmação" numa conta que, na verdade, já era a própria
    // conta Google do usuário. Corrigido checando primeiro se este (provider, providerAccountId)
    // já está vinculado a algum usuário — se estiver, é só um login de retorno, sem decisão de
    // fusão nenhuma a tomar, e a checagem via `decideAccountLinking` (que existe pra decidir se
    // uma conta Google NOVA deve se fundir com uma conta email/senha existente) nem entra em jogo.
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google' || !user.email) {
        return true;
      }

      const [linkedAccount] = await db
        .select({ userId: accounts.userId })
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, account.provider),
            eq(accounts.providerAccountId, account.providerAccountId),
          ),
        )
        .limit(1);

      if (!linkedAccount) {
        const [existing] = await db
          .select({ id: users.id, emailVerified: users.emailVerified })
          .from(users)
          .where(sameEmail(user.email))
          .limit(1);

        const decision = decideAccountLinking({
          existingUserByEmail: existing ?? null,
          googleEmailVerified: profile?.['email_verified'] === true,
        });

        if (decision.action === 'reject') {
          // Não cria uma segunda conta com o mesmo email (violaria unique em users.email) —
          // rejeita com AccessDenied; a página de erro (pages.error, abaixo) orienta a confirmar
          // a conta pendente (decisão do autor, /speckit-plan).
          return false;
        }

        if (decision.action === 'claim' && existing) {
          // Item 10: o Google provou a posse do email; quem criou a conta pendente não. A senha dela deixa
          // de valer e toda sessão aberta com ela cai (sessionVersion + 1) — depois vincula como no "link".
          await db
            .update(users)
            .set({
              passwordHash: null,
              emailVerified: new Date(),
              failedLoginAttempts: 0,
              lockedUntil: null,
              sessionVersion: sql`${users.sessionVersion} + 1`,
            })
            .where(eq(users.id, existing.id));
        }

        if ((decision.action === 'link' || decision.action === 'claim') && existing) {
          await adapter.linkAccount?.({
            userId: existing.id,
            type: 'oauth',
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          });
        }
      }

      // FR-013a: "uma Account criada/entrada via Google OAuth é considerada com email confirmado
      // automaticamente" — mas o adapter padrão do Auth.js NÃO carimba `emailVerified` sozinho ao
      // criar o usuário; é responsabilidade do app ler `profile.email_verified` (a checagem que o
      // próprio Google já fez) e persistir isso (authjs.dev/getting-started/providers/google,
      // confirmado via Context7). Sem este passo, FR-013a nunca era cumprida de fato — é a causa
      // raiz do bug acima. Idempotente (`isNull`): nunca sobrescreve uma data de confirmação já
      // registrada por outro caminho.
      if (profile?.['email_verified'] && user.id) {
        await db
          .update(users)
          .set({ emailVerified: new Date() })
          .where(and(eq(users.id, user.id), isNull(users.emailVerified)));
      }

      return true;
    },
    // M2.8: o callback padrão do Auth.js só devolve name/email/image — o progresso no servidor
    // precisa do id da conta, que na estratégia JWT já está em `token.sub`.
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    // Item 12: o token carrega a sessionVersion da conta; de tempos em tempos (session-version.ts) ela é
    // conferida no banco, e uma versão diferente (ou conta apagada) derruba a sessão.
    async jwt({ token, user }) {
      const now = Date.now();
      if (user?.id) {
        token.sv = await loadSessionVersion(user.id);
        token.svAt = now;
        return token;
      }
      if (!token.sub || sessionCheckNeeded(token.svAt, now) === 'skip') return token;
      if (!isSessionCurrent(token.sv, await loadSessionVersion(token.sub))) return null;
      token.svAt = now;
      return token;
    },
  },
  pages: {
    signIn: '/entrar',
    error: '/entrar',
  },
});

export { adapter, GENERIC_LOGIN_ERROR };
