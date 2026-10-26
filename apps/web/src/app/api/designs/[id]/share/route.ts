import { NextResponse } from 'next/server';
import { ensureShareToken, revokeShareToken } from '@/db/designs';
import { notFound, requireDesignOwner, shareUrlFor, unavailable } from '../../_guard';

type Params = { params: Promise<{ id: string }> };

/** Gera (ou devolve o já ativo) link de compartilhamento do design (M4.1, US3). */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  const userId = await requireDesignOwner(request, { write: true });
  if (userId instanceof Response) return userId;
  const { id } = await params;
  try {
    const token = await ensureShareToken(userId, id);
    return token ? NextResponse.json({ shareUrl: shareUrlFor(request, token) }) : notFound();
  } catch {
    return unavailable();
  }
}

/** Revoga o link: o antigo passa a dar "design não encontrado" (FR-008). */
export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  const userId = await requireDesignOwner(request, { write: true });
  if (userId instanceof Response) return userId;
  const { id } = await params;
  try {
    return (await revokeShareToken(userId, id)) ? new Response(null, { status: 204 }) : notFound();
  } catch {
    return unavailable();
  }
}
