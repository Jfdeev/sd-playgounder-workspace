import { NextResponse } from 'next/server';
import { createDesign, listDesigns } from '@/db/designs';
import { normalizeDesignName, validateDesignContext, validateSavedCanvas } from '@/lib/designs/validate-saved-canvas';
import { limitReached, requireDesignOwner, unavailable } from './_guard';

/** Lista os designs do usuário (M4.1, US1). */
export async function GET(request: Request): Promise<Response> {
  const userId = await requireDesignOwner(request, { write: false });
  if (userId instanceof Response) return userId;
  try {
    return NextResponse.json(await listDesigns(userId));
  } catch {
    return unavailable();
  }
}

/** Salva o canvas como um design novo, já com a versão 1 (M4.1, US1). */
export async function POST(request: Request): Promise<Response> {
  const userId = await requireDesignOwner(request, { write: true });
  if (userId instanceof Response) return userId;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = normalizeDesignName(body?.name);
  if (!name.ok) return NextResponse.json({ error: 'INVALID_NAME', reason: name.reason }, { status: 400 });
  const context = validateDesignContext(body?.contextKind, body?.contextId);
  if (!context.ok) return NextResponse.json({ error: 'INVALID_CONTEXT' }, { status: 400 });
  const content = validateSavedCanvas(body?.content);
  if (!content.ok) return NextResponse.json({ error: 'INVALID_CONTENT', reason: content.reason }, { status: 400 });
  try {
    const created = await createDesign(userId, { name: name.name, contextKind: context.contextKind, contextId: context.contextId, content: content.canvas });
    if (created === 'limit') return limitReached();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return unavailable();
  }
}
