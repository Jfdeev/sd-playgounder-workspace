import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isSameOriginRequest } from '@/lib/csrf';

/**
 * Guard comum das rotas de designs (M4.1): sessão obrigatória (401) e, nas que escrevem, mesma origem
 * (403). Devolve o id da conta ou a resposta de erro pronta.
 */
export async function requireDesignOwner(request: Request, { write }: { write: boolean }): Promise<string | Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  if (write && !isSameOriginRequest(request.headers.get('origin'), new URL(request.url).origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  return userId;
}

export const notFound = () => NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
export const unavailable = () => NextResponse.json({ error: 'UNAVAILABLE' }, { status: 503 });
export const limitReached = () => NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 409 });
export const shareUrlFor = (request: Request, token: string) => `${new URL(request.url).origin}/app/d/${token}`;
