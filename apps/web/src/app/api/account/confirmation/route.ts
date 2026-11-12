import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { findUserById, issueToken } from '@/db/account';
import { isAttemptAllowed, recordAttempt } from '@/db/attempts';
import { CONFIRMATION_TTL_MS } from '@/lib/account-tokens';
import { isSameOriginRequest } from '@/lib/csrf';
import { sendConfirmationEmail } from '@/lib/email';
import { attemptKey, CONFIRMATION_RESEND_POLICY } from '@/lib/rate-limit';

/**
 * Reenvia o e-mail de confirmação (specs/conta-lgpd, US2): só para a conta logada e ainda não confirmada,
 * 3 por hora. O link novo invalida o anterior (`issueToken`).
 */
export async function POST(request: Request): Promise<Response> {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  if (!isSameOriginRequest(request.headers.get('origin'), new URL(request.url).origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const user = await findUserById(userId);
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ error: 'ALREADY_VERIFIED' }, { status: 409 });

  const now = new Date();
  const key = attemptKey.confirmationResend(userId);
  if (!(await isAttemptAllowed(key, now))) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }
  await recordAttempt(key, now, CONFIRMATION_RESEND_POLICY);

  const token = await issueToken('confirmation', user.email, CONFIRMATION_TTL_MS);
  await sendConfirmationEmail(user.email, token, new URL(request.url).origin);
  return NextResponse.json({ ok: true });
}
