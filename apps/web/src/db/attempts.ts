import { eq } from 'drizzle-orm';
import { checkLoginAttempt, recordFailedAttempt, type LoginAttemptPolicy } from '../lib/rate-limit';
import { db } from './client';
import { loginIpAttempts } from './schema';

/**
 * Contadores de tentativa por chave textual (`attemptKey` em lib/rate-limit.ts) — IP do login, conta + IP
 * e IP do cadastro usam a mesma tabela, cada um com sua chave. Leitura + escrita não atômicas: aceitável
 * para um limite de abuso (mesmo padrão de antes, quando a chave era só o IP).
 */

async function loadState(key: string) {
  const [row] = await db
    .select({ failedAttempts: loginIpAttempts.failedAttempts, lockedUntil: loginIpAttempts.lockedUntil })
    .from(loginIpAttempts)
    .where(eq(loginIpAttempts.ip, key))
    .limit(1);
  return { failedLoginAttempts: row?.failedAttempts ?? 0, lockedUntil: row?.lockedUntil ?? null };
}

export async function isAttemptAllowed(key: string, now: Date): Promise<boolean> {
  return checkLoginAttempt(await loadState(key), now).allowed;
}

export async function recordAttempt(key: string, now: Date, policy: LoginAttemptPolicy): Promise<void> {
  const next = recordFailedAttempt(await loadState(key), now, policy);
  await db
    .insert(loginIpAttempts)
    .values({ ip: key, failedAttempts: next.failedLoginAttempts, lockedUntil: next.lockedUntil })
    .onConflictDoUpdate({
      target: loginIpAttempts.ip,
      set: { failedAttempts: next.failedLoginAttempts, lockedUntil: next.lockedUntil },
    });
}

export async function resetAttempts(key: string): Promise<void> {
  await db.delete(loginIpAttempts).where(eq(loginIpAttempts.ip, key));
}
