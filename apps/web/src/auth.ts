import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db/client';
import { accounts, sessions, users, verificationTokens } from './db/schema';

// `const` nomeada (não inline) — reaproveitada dentro do callback `signIn` para vínculo manual de
// conta (research.md §2, contracts/auth-api.md). Precisa ser a mesma instância passada abaixo.
const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

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
      // segurança dentro do callback signIn (research.md §2, preenchido em T028/T029).
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // Preenchido em T035 (rate limiting + verificação de senha).
      authorize: async () => null,
    }),
  ],
  callbacks: {
    // Preenchido em T028 (decisão de vínculo de conta por email, FR-013/FR-013a).
    async signIn() {
      return true;
    },
  },
  pages: {
    signIn: '/entrar',
    error: '/entrar',
  },
});

export { adapter };
