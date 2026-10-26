import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { contentHash, type SavedCanvas } from '@/lib/designs/saved-canvas';
import type { DesignContextKind } from '@/lib/designs/shared-view';
import { ACCOUNT_DESIGN_LIMITS } from '@/lib/designs/validate-saved-canvas';
import { db } from './client';
import { isUniqueViolation } from './gamification';
import { designVersions, savedDesigns, userProfiles } from './schema';

/**
 * Acesso ao banco dos designs salvos (M4.1). Todo acesso de dono filtra por `userId` da sessão — um
 * design de outra conta simplesmente não aparece (a rota responde 404, nunca 403). Sem transação no
 * driver: a versão nasce num único `INSERT … SELECT max + 1`, e a restrição única `(designId, number)`
 * decide a corrida entre duas abas (quem perde tenta de novo).
 */

export type DesignSummary = {
  id: string;
  name: string;
  contextKind: DesignContextKind;
  contextId: string | null;
  updatedAt: Date;
  versionCount: number;
  shared: boolean;
};

export async function listDesigns(userId: string): Promise<DesignSummary[]> {
  const rows = await db
    .select({
      id: savedDesigns.id,
      name: savedDesigns.name,
      contextKind: savedDesigns.contextKind,
      contextId: savedDesigns.contextId,
      updatedAt: savedDesigns.updatedAt,
      shareToken: savedDesigns.shareToken,
      versionCount: count(designVersions.id),
    })
    .from(savedDesigns)
    .leftJoin(designVersions, eq(designVersions.designId, savedDesigns.id))
    .where(eq(savedDesigns.userId, userId))
    .groupBy(savedDesigns.id)
    .orderBy(desc(savedDesigns.updatedAt));
  return rows.map(({ shareToken, versionCount, ...row }) => ({ ...row, versionCount: Number(versionCount), shared: shareToken !== null }));
}

async function insertNextVersion(designId: string, content: SavedCanvas, hash: string): Promise<number> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await db.execute<{ number: number }>(sql`
        insert into "designVersions" ("id", "designId", "number", "content", "contentHash")
        select ${crypto.randomUUID()}, ${designId}, coalesce(max("number"), 0) + 1, ${JSON.stringify(content)}::jsonb, ${hash}
        from "designVersions" where "designId" = ${designId}
        returning "number"`);
      return Number(result.rows[0]!.number);
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 1) throw error;
    }
  }
  throw new Error('unreachable');
}

export async function createDesign(
  userId: string,
  input: { name: string; contextKind: DesignContextKind; contextId: string | null; content: SavedCanvas },
): Promise<{ id: string; version: number } | 'limit'> {
  const [{ total }] = (await db.select({ total: count() }).from(savedDesigns).where(eq(savedDesigns.userId, userId))) as [{ total: number }];
  if (Number(total) >= ACCOUNT_DESIGN_LIMITS.maxDesigns) return 'limit';
  const [design] = await db
    .insert(savedDesigns)
    .values({ userId, name: input.name, contextKind: input.contextKind, contextId: input.contextId })
    .returning({ id: savedDesigns.id });
  try {
    const version = await insertNextVersion(design!.id, input.content, await contentHash(input.content));
    return { id: design!.id, version };
  } catch (error) {
    // Sem transação: não deixa um design sem nenhuma versão pra trás.
    await db.delete(savedDesigns).where(eq(savedDesigns.id, design!.id));
    throw error;
  }
}

async function ownedDesign(userId: string, designId: string) {
  const [design] = await db
    .select()
    .from(savedDesigns)
    .where(and(eq(savedDesigns.id, designId), eq(savedDesigns.userId, userId)))
    .limit(1);
  return design ?? null;
}

export async function getOwnedDesign(userId: string, designId: string, versionNumber?: number) {
  const design = await ownedDesign(userId, designId);
  if (!design) return null;
  const versions = await db
    .select({ number: designVersions.number, createdAt: designVersions.createdAt, content: designVersions.content })
    .from(designVersions)
    .where(eq(designVersions.designId, designId))
    .orderBy(asc(designVersions.number));
  const selected = versionNumber === undefined ? versions.at(-1) : versions.find((v) => v.number === versionNumber);
  if (!selected) return null;
  return {
    id: design.id,
    name: design.name,
    contextKind: design.contextKind,
    contextId: design.contextId,
    shareToken: design.shareToken,
    versions: versions.map(({ number, createdAt }) => ({ number, createdAt })),
    selected: { number: selected.number, content: selected.content },
  };
}

export async function addVersion(
  userId: string,
  designId: string,
  content: SavedCanvas,
): Promise<{ version: number; unchanged: boolean } | 'not-found' | 'limit'> {
  const design = await ownedDesign(userId, designId);
  if (!design) return 'not-found';
  const [latest] = await db
    .select({ number: designVersions.number, contentHash: designVersions.contentHash })
    .from(designVersions)
    .where(eq(designVersions.designId, designId))
    .orderBy(desc(designVersions.number))
    .limit(1);
  const hash = await contentHash(content);
  if (latest && latest.contentHash === hash) return { version: latest.number, unchanged: true };
  if (latest && latest.number >= ACCOUNT_DESIGN_LIMITS.maxVersionsPerDesign) return 'limit';
  const version = await insertNextVersion(designId, content, hash);
  await db.update(savedDesigns).set({ updatedAt: new Date() }).where(eq(savedDesigns.id, designId));
  return { version, unchanged: false };
}

export async function renameDesign(userId: string, designId: string, name: string): Promise<boolean> {
  const updated = await db
    .update(savedDesigns)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(savedDesigns.id, designId), eq(savedDesigns.userId, userId)))
    .returning({ id: savedDesigns.id });
  return updated.length > 0;
}

export async function deleteDesign(userId: string, designId: string): Promise<boolean> {
  const deleted = await db
    .delete(savedDesigns)
    .where(and(eq(savedDesigns.id, designId), eq(savedDesigns.userId, userId)))
    .returning({ id: savedDesigns.id });
  return deleted.length > 0;
}

function newShareToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}

/** Devolve o token ativo do design (gera um se não houver); `null` = design não é desta conta. */
export async function ensureShareToken(userId: string, designId: string): Promise<string | null> {
  const design = await ownedDesign(userId, designId);
  if (!design) return null;
  if (design.shareToken) return design.shareToken;
  const token = newShareToken();
  await db.update(savedDesigns).set({ shareToken: token }).where(eq(savedDesigns.id, designId));
  return token;
}

export async function revokeShareToken(userId: string, designId: string): Promise<boolean> {
  const updated = await db
    .update(savedDesigns)
    .set({ shareToken: null })
    .where(and(eq(savedDesigns.id, designId), eq(savedDesigns.userId, userId)))
    .returning({ id: savedDesigns.id });
  return updated.length > 0;
}

/** Design compartilhado pelo token ativo + versão mais recente + perfil do dono; `null` = inexistente ou revogado. */
export async function loadSharedDesign(token: string) {
  const [design] = await db
    .select({
      id: savedDesigns.id,
      name: savedDesigns.name,
      contextKind: savedDesigns.contextKind,
      contextId: savedDesigns.contextId,
      nickname: userProfiles.nickname,
      isPublic: userProfiles.isPublic,
    })
    .from(savedDesigns)
    .leftJoin(userProfiles, eq(userProfiles.userId, savedDesigns.userId))
    .where(eq(savedDesigns.shareToken, token))
    .limit(1);
  if (!design) return null;
  const [latest] = await db
    .select({ number: designVersions.number, createdAt: designVersions.createdAt, content: designVersions.content })
    .from(designVersions)
    .where(eq(designVersions.designId, design.id))
    .orderBy(desc(designVersions.number))
    .limit(1);
  if (!latest) return null;
  return {
    name: design.name,
    contextKind: design.contextKind,
    contextId: design.contextId,
    owner: { nickname: design.nickname, isPublic: design.isPublic ?? false },
    version: latest,
  };
}
