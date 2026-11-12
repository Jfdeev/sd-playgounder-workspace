import { and, asc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { newToken, parseTokenIdentifier, tokenIdentifier, type TokenPurpose } from '../lib/account-tokens';
import { attemptKey } from '../lib/rate-limit';
import { hashToken } from '../lib/token-hash';
import { db } from './client';
import {
  activityDays,
  designVersions,
  loginIpAttempts,
  savedDesigns,
  scoringEvents,
  userProfiles,
  users,
  verificationTokens,
} from './schema';

/** Acesso ao banco da recuperação de conta e da LGPD (specs/conta-lgpd). Sem transação (`neon-http`). */

const ACCOUNT_FIELDS = { id: users.id, email: users.email, emailVerified: users.emailVerified };

/** Emite um token novo para o fluxo e apaga os anteriores do mesmo fluxo — só o último link vale. */
export async function issueToken(purpose: TokenPurpose, email: string, ttlMs: number): Promise<string> {
  const identifier = tokenIdentifier(purpose, email);
  const { token, hash } = newToken();
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
  await db.insert(verificationTokens).values({ identifier, token: hash, expires: new Date(Date.now() + ttlMs) });
  return token;
}

/**
 * Consome um token do fluxo pedido: devolve o e-mail se o token existe, é desse fluxo e não expirou.
 * Uso único — o token sai do banco mesmo quando expirado. Token de outro fluxo não é tocado.
 */
export async function consumeToken(purpose: TokenPurpose, token: string, now: Date): Promise<string | null> {
  const hash = hashToken(token);
  const [row] = await db.select().from(verificationTokens).where(eq(verificationTokens.token, hash)).limit(1);
  if (!row) return null;
  const parsed = parseTokenIdentifier(row.identifier);
  if (parsed.purpose !== purpose) return null;
  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, row.identifier), eq(verificationTokens.token, hash)));
  return row.expires > now ? parsed.email : null;
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select(ACCOUNT_FIELDS)
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return user ?? null;
}

export async function findUserById(userId: string) {
  const [user] = await db
    .select(ACCOUNT_FIELDS)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

export async function markEmailVerified(email: string): Promise<void> {
  await db.update(users).set({ emailVerified: new Date() }).where(sql`lower(${users.email}) = lower(${email})`);
}

/**
 * Senha nova pela redefinição: o link provou a posse do e-mail, então ele fica confirmado; contadores de
 * tentativa zeram e toda sessão aberta cai (`sessionVersion` + 1).
 */
export async function resetPassword(email: string, passwordHash: string): Promise<boolean> {
  const updated = await db
    .update(users)
    .set({
      passwordHash,
      emailVerified: sql`coalesce(${users.emailVerified}, now())`,
      failedLoginAttempts: 0,
      lockedUntil: null,
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(sql`lower(${users.email}) = lower(${email})`)
    .returning({ id: users.id });
  return updated.length > 0;
}

/** Tudo que a conta guarda, para "baixar meus dados" — nunca hash de senha, tokens ou contas OAuth. */
export async function exportAccountData(userId: string) {
  const [account] = await db
    .select({ email: users.email, name: users.name, emailVerified: users.emailVerified, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!account) return null;

  const [[profile], events, days, designs] = await Promise.all([
    db.select({ nickname: userProfiles.nickname, isPublic: userProfiles.isPublic }).from(userProfiles).where(eq(userProfiles.userId, userId)),
    db
      .select({ type: scoringEvents.type, eventKey: scoringEvents.eventKey, problemId: scoringEvents.problemId, xp: scoringEvents.xp, createdAt: scoringEvents.createdAt })
      .from(scoringEvents)
      .where(eq(scoringEvents.userId, userId))
      .orderBy(asc(scoringEvents.createdAt)),
    db.select({ day: activityDays.day }).from(activityDays).where(eq(activityDays.userId, userId)).orderBy(asc(activityDays.day)),
    db
      .select({ id: savedDesigns.id, name: savedDesigns.name, contextKind: savedDesigns.contextKind, contextId: savedDesigns.contextId, shared: sql<boolean>`${savedDesigns.shareToken} is not null`, createdAt: savedDesigns.createdAt, updatedAt: savedDesigns.updatedAt })
      .from(savedDesigns)
      .where(eq(savedDesigns.userId, userId)),
  ]);

  const versions = designs.length
    ? await db
        .select({ designId: designVersions.designId, number: designVersions.number, content: designVersions.content, createdAt: designVersions.createdAt })
        .from(designVersions)
        .where(inArray(designVersions.designId, designs.map((d) => d.id)))
        .orderBy(asc(designVersions.designId), asc(designVersions.number))
    : [];

  return {
    account,
    profile: profile ?? null,
    scoringEvents: events,
    activityDays: days.map((d) => d.day),
    designs: designs.map((design) => ({
      ...design,
      versions: versions.filter((v) => v.designId === design.id).map(({ designId: _designId, ...version }) => version),
    })),
  };
}

/**
 * Exclui a conta na hora (LGPD). As tabelas da conta apagam em cascata; tokens (por e-mail) e
 * contadores de tentativa da conta (`account-ip:<id>:*`) não têm chave estrangeira e saem aqui.
 */
export async function deleteAccount(userId: string, email: string): Promise<void> {
  await Promise.all([
    db
      .delete(verificationTokens)
      .where(
        or(
          sql`lower(${verificationTokens.identifier}) = lower(${tokenIdentifier('confirmation', email)})`,
          sql`lower(${verificationTokens.identifier}) = lower(${tokenIdentifier('password-reset', email)})`,
        ),
      ),
    db
      .delete(loginIpAttempts)
      .where(
        or(
          like(loginIpAttempts.ip, `${attemptKey.accountFromIp(userId, '')}%`),
          eq(loginIpAttempts.ip, attemptKey.confirmationResend(userId)),
        ),
      ),
  ]);
  await db.delete(users).where(eq(users.id, userId));
}
