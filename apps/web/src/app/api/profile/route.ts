import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { saveProfileSettings, type ProfileSettings } from '@/db/gamification';
import { isSameOriginRequest } from '@/lib/csrf';
import { normalizeNickname } from '@/lib/gamification/nickname';

/**
 * Apelido e visibilidade do perfil público (M2.8, contracts/gamification-api.md). `nickname: null`
 * remove o apelido (sai do ranking); apelido já usado → 409, decidido pelo índice único do banco.
 */
export async function PUT(request: Request): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (!isSameOriginRequest(request.headers.get('origin'), new URL(request.url).origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }
  const { nickname, isPublic } = body as Record<string, unknown>;

  const patch: Partial<ProfileSettings> = {};
  if (nickname !== undefined) {
    if (nickname === null) {
      patch.nickname = null;
    } else {
      const normalized = normalizeNickname(nickname);
      if (!normalized.ok) {
        return NextResponse.json({ error: 'INVALID_NICKNAME', reason: normalized.reason }, { status: 400 });
      }
      patch.nickname = normalized.nickname;
    }
  }
  if (isPublic !== undefined) {
    if (typeof isPublic !== 'boolean') {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
    }
    patch.isPublic = isPublic;
  }

  try {
    const saved = await saveProfileSettings(userId, patch);
    if (saved === 'taken') {
      return NextResponse.json({ error: 'NICKNAME_TAKEN' }, { status: 409 });
    }
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: 'PROGRESS_UNAVAILABLE' }, { status: 503 });
  }
}
