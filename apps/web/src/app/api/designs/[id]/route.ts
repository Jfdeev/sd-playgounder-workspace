import { NextResponse } from 'next/server';
import { deleteDesign, getOwnedDesign, renameDesign } from '@/db/designs';
import { normalizeDesignName } from '@/lib/designs/validate-saved-canvas';
import { notFound, requireDesignOwner, shareUrlFor, unavailable } from '../_guard';

type Params = { params: Promise<{ id: string }> };

/** Um design do usuário com a lista de versões; `?version=N` traz essa versão (restaurar — US2). */
export async function GET(request: Request, { params }: Params): Promise<Response> {
  const userId = await requireDesignOwner(request, { write: false });
  if (userId instanceof Response) return userId;
  const { id } = await params;
  const rawVersion = new URL(request.url).searchParams.get('version');
  const version = rawVersion === null ? undefined : Number(rawVersion);
  if (version !== undefined && !Number.isInteger(version)) return notFound();
  try {
    const design = await getOwnedDesign(userId, id, version);
    if (!design) return notFound();
    const { shareToken, ...rest } = design;
    return NextResponse.json({ ...rest, shareUrl: shareToken ? shareUrlFor(request, shareToken) : null });
  } catch {
    return unavailable();
  }
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  const userId = await requireDesignOwner(request, { write: true });
  if (userId instanceof Response) return userId;
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = normalizeDesignName(body?.name);
  if (!name.ok) return NextResponse.json({ error: 'INVALID_NAME', reason: name.reason }, { status: 400 });
  try {
    return (await renameDesign(userId, id, name.name)) ? NextResponse.json({ name: name.name }) : notFound();
  } catch {
    return unavailable();
  }
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  const userId = await requireDesignOwner(request, { write: true });
  if (userId instanceof Response) return userId;
  const { id } = await params;
  try {
    return (await deleteDesign(userId, id)) ? new Response(null, { status: 204 }) : notFound();
  } catch {
    return unavailable();
  }
}
