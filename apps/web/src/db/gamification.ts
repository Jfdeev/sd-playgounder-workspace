import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { ALL_PROBLEM_IDS } from '@sdp/problems';
import { achievementsUnlockedBy, type AchievementId } from '@/lib/gamification/achievements';
import { buildProgress, type Progress } from '@/lib/gamification/progress';
import { toLocalDay } from '@/lib/gamification/streak';
import { ACHIEVEMENT_XP, SUBMISSION_RATE_LIMIT, achievementEventKey } from '@/lib/gamification/scoring';
import type { RankingEntry } from '@/lib/gamification/ranking';
import { db } from './client';
import { activityDays, scoringEvents, submissionRateLimits, userProfiles, type ScoringEventType } from './schema';

/**
 * Acesso ao banco do M2.8. Toda escrita é um único comando idempotente — o driver `neon-http` não
 * tem transação (research.md §2) —, e nada aqui guarda contador: XP, nível, ranking etc. são
 * derivados dos eventos imutáveis por `buildProgress`. Fica fora de `src/lib/` de propósito (mesma
 * regra de `src/db/client.ts`): é wiring de banco, não regra testável sem ele.
 */

/**
 * Conta uma submissão na janela do usuário; `false` = passou do limite (FR-014). Um upsert só, sem
 * corrida. A janela usa só o relógio do banco, em UTC explícito: um `Date` do JS passado cru num
 * `sql` vira hora local com offset, que o Postgres descarta ao comparar com `timestamp` sem fuso — a
 * janela ficava 3 h deslocada e nunca vencia (achado na verificação manual).
 */
const DB_NOW_UTC = sql`(now() at time zone 'utc')`;

export async function consumeSubmissionQuota(userId: string): Promise<boolean> {
  const windowExpired = sql`${submissionRateLimits.windowStart} <= ${DB_NOW_UTC} - ${SUBMISSION_RATE_LIMIT.windowMs / 1000} * interval '1 second'`;
  const [row] = await db
    .insert(submissionRateLimits)
    .values({ userId, windowStart: DB_NOW_UTC, count: 1 })
    .onConflictDoUpdate({
      target: submissionRateLimits.userId,
      set: {
        windowStart: sql`case when ${windowExpired} then ${DB_NOW_UTC} else ${submissionRateLimits.windowStart} end`,
        count: sql`case when ${windowExpired} then 1 else ${submissionRateLimits.count} + 1 end`,
      },
    })
    .returning({ count: submissionRateLimits.count });
  return (row?.count ?? 1) <= SUBMISSION_RATE_LIMIT.maxSubmissions;
}

/** Credita um evento; `true` só pra quem de fato inseriu (repetido ou concorrente → `false`, FR-003). */
export async function creditEvent(
  userId: string,
  event: { eventKey: string; type: ScoringEventType; problemId: string | null; xp: number },
): Promise<boolean> {
  const inserted = await db
    .insert(scoringEvents)
    .values({ userId, ...event })
    .onConflictDoNothing({ target: [scoringEvents.userId, scoringEvents.eventKey] })
    .returning({ id: scoringEvents.id });
  return inserted.length > 0;
}

/** O usuário já tem este evento (ex.: diagnóstico de um incidente acertado)? */
export async function hasEvent(userId: string, eventKey: string): Promise<boolean> {
  const [row] = await db
    .select({ id: scoringEvents.id })
    .from(scoringEvents)
    .where(and(eq(scoringEvents.userId, userId), eq(scoringEvents.eventKey, eventKey)))
    .limit(1);
  return row !== undefined;
}

/** Desafios que o usuário já resolveu (eventos `challenge`) — base da trava de desafios no servidor. */
export async function loadSolvedProblemIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ problemId: scoringEvents.problemId })
    .from(scoringEvents)
    .where(and(eq(scoringEvents.userId, userId), eq(scoringEvents.type, 'challenge')));
  return rows.flatMap((row) => (row.problemId ? [row.problemId] : []));
}

/** Marca o dia (fuso de SP) como dia com atividade verificada — o mesmo dia conta uma vez (FR-007). */
export async function recordActivityDay(userId: string, now: Date): Promise<void> {
  await db.insert(activityDays).values({ userId, day: toLocalDay(now) }).onConflictDoNothing();
}

export async function loadProgress(userId: string, now: Date): Promise<Progress> {
  const [events, days] = await Promise.all([
    db
      .select({
        type: scoringEvents.type,
        problemId: scoringEvents.problemId,
        eventKey: scoringEvents.eventKey,
        xp: scoringEvents.xp,
        createdAt: scoringEvents.createdAt,
      })
      .from(scoringEvents)
      .where(eq(scoringEvents.userId, userId))
      .orderBy(asc(scoringEvents.createdAt)),
    db.select({ day: activityDays.day }).from(activityDays).where(eq(activityDays.userId, userId)),
  ]);
  return buildProgress(events, days.map((row) => row.day), toLocalDay(now));
}

export type ProfileSettings = { nickname: string | null; isPublic: boolean };

export async function loadProfileSettings(userId: string): Promise<ProfileSettings> {
  const [row] = await db
    .select({ nickname: userProfiles.nickname, isPublic: userProfiles.isPublic })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return row ?? { nickname: null, isPublic: true };
}

/** Violação de restrição única do Postgres (23505) — o driver às vezes embrulha o erro em `cause`. */
export function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: unknown; cause?: { code?: unknown } })?.code ?? (error as { cause?: { code?: unknown } })?.cause?.code;
  return code === '23505';
}

/**
 * Grava apelido/visibilidade. Apelido já usado por outra conta → `'taken'`, decidido pela violação do
 * índice único (FR-015), nunca por "checa e depois grava" — que deixaria duas contas pegarem o mesmo.
 */
export async function saveProfileSettings(
  userId: string,
  patch: Partial<ProfileSettings>,
): Promise<ProfileSettings | 'taken'> {
  const current = await loadProfileSettings(userId);
  const next: ProfileSettings = { ...current, ...patch };
  try {
    await db
      .insert(userProfiles)
      .values({ userId, ...next, updatedAt: new Date() })
      .onConflictDoUpdate({ target: userProfiles.userId, set: { ...next, updatedAt: new Date() } });
  } catch (error) {
    if (isUniqueViolation(error)) return 'taken';
    throw error;
  }
  return next;
}

/** Quem aparece no ranking: tem apelido e não se escondeu (FR-015, FR-017). */
const isListed = and(isNotNull(userProfiles.nickname), eq(userProfiles.isPublic, true));

export async function loadRankingEntries(): Promise<RankingEntry[]> {
  const rows = await db
    .select({
      nickname: userProfiles.nickname,
      xp: sql<number>`coalesce(sum(${scoringEvents.xp}), 0)::int`,
      // mapWith: lê como a coluna (UTC), não como string crua do driver (que a trataria como hora local).
      lastXpAt: sql<Date | null>`max(${scoringEvents.createdAt}) filter (where ${scoringEvents.xp} > 0)`.mapWith(scoringEvents.createdAt),
    })
    .from(userProfiles)
    .leftJoin(scoringEvents, eq(scoringEvents.userId, userProfiles.userId))
    .where(isListed)
    .groupBy(userProfiles.nickname);
  return rows.map((row) => ({ nickname: row.nickname!, xp: Number(row.xp), lastXpAt: row.lastXpAt ?? null }));
}

/** Progresso de um perfil público pelo apelido; escondido ou inexistente → `null` (mesma resposta). */
export async function loadPublicProgress(nickname: string, now: Date): Promise<Progress | null> {
  const [row] = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(and(isListed, eq(userProfiles.nickname, nickname)))
    .limit(1);
  return row ? loadProgress(row.userId, now) : null;
}

/**
 * Credita as conquistas que o estado verificado atual destrava (M2.8, estendido no M3) e devolve as
 * novas + o progresso já atualizado. Chamado por toda rota que registra atividade verificada —
 * desafio, diagnóstico e fix de incidente —, senão uma ofensiva feita só com incidentes nunca
 * desbloquearia "3 dias seguidos" (achado na revisão do M3).
 */
export async function creditUnlockedAchievements(
  userId: string,
  now: Date,
  { solvedWithoutSpof }: { solvedWithoutSpof: boolean },
): Promise<{ newAchievements: AchievementId[]; progress: Progress }> {
  const before = await loadProgress(userId, now);
  const candidates = achievementsUnlockedBy({
    solvedProblemIds: before.solved.map((s) => s.problemId),
    allProblemIds: ALL_PROBLEM_IDS,
    solvedWithoutSpof,
    currentStreak: before.streak.current,
  });
  const newAchievements: AchievementId[] = [];
  for (const id of candidates) {
    if (await creditEvent(userId, { eventKey: achievementEventKey(id), type: 'achievement', problemId: null, xp: ACHIEVEMENT_XP })) {
      newAchievements.push(id);
    }
  }
  return { newAchievements, progress: newAchievements.length > 0 ? await loadProgress(userId, now) : before };
}
