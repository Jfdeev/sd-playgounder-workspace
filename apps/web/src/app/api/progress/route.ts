import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { loadProfileSettings, loadProgress } from '@/db/gamification';

/** Progresso do próprio usuário (M2.8, contracts/gamification-api.md) — painel e trava de desafios. */
export async function GET(): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const [progress, profile] = await Promise.all([loadProgress(userId, new Date()), loadProfileSettings(userId)]);
    return NextResponse.json({ progress, profile });
  } catch {
    return NextResponse.json({ error: 'PROGRESS_UNAVAILABLE' }, { status: 503 });
  }
}
