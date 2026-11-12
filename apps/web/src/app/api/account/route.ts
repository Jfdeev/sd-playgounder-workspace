import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteAccount, findUserById } from '@/db/account';
import { isSameOriginRequest } from '@/lib/csrf';
import { normalizeEmail } from '@/lib/email-address';

/**
 * Exclui a conta na hora (LGPD, specs/conta-lgpd US3, FR-003). Exige sessão, mesma origem e o e-mail da
 * conta digitado de novo — confirmação que um clique acidental ou uma página maliciosa não forjam.
 */
export async function DELETE(request: Request): Promise<Response> {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  if (!isSameOriginRequest(request.headers.get('origin'), new URL(request.url).origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const user = await findUserById(userId);
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { confirmEmail?: unknown } | null;
  const typed = typeof body?.confirmEmail === 'string' ? normalizeEmail(body.confirmEmail) : '';
  if (typed !== normalizeEmail(user.email)) {
    return NextResponse.json({ error: 'CONFIRMATION_MISMATCH', message: 'O e-mail digitado não é o desta conta.' }, { status: 400 });
  }

  await deleteAccount(userId, user.email);
  return new NextResponse(null, { status: 204 });
}
