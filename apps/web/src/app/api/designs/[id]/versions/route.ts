import { NextResponse } from 'next/server';
import { addVersion } from '@/db/designs';
import { validateSavedCanvas } from '@/lib/designs/validate-saved-canvas';
import { limitReached, notFound, requireDesignOwner, unavailable } from '../../_guard';

/** "Salvar" num design aberto: nova versão imutável, ou nenhuma se nada mudou (M4.1, US2). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const userId = await requireDesignOwner(request, { write: true });
  if (userId instanceof Response) return userId;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const content = validateSavedCanvas(body?.content);
  if (!content.ok) return NextResponse.json({ error: 'INVALID_CONTENT', reason: content.reason }, { status: 400 });
  try {
    const result = await addVersion(userId, id, content.canvas);
    if (result === 'not-found') return notFound();
    if (result === 'limit') return limitReached();
    return NextResponse.json(result, { status: result.unchanged ? 200 : 201 });
  } catch {
    return unavailable();
  }
}
