import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail, issueToken } from '@/db/account';
import { isAttemptAllowed, recordAttempt } from '@/db/attempts';
import { PASSWORD_RESET_TTL_MS } from '@/lib/account-tokens';
import { getClientIp } from '@/lib/client-ip';
import { isSameOriginRequest } from '@/lib/csrf';
import { sendPasswordResetEmail } from '@/lib/email';
import { normalizeEmail } from '@/lib/email-address';
import { attemptKey, PASSWORD_RESET_IP_POLICY } from '@/lib/rate-limit';

const requestSchema = z.object({ email: z.string().email() });

/**
 * Pede o link de redefinição de senha (specs/conta-lgpd, US1). Responde igual exista o e-mail ou não
 * (FR-002) e limita por IP. Vale também para conta só-Google: o link prova a posse do e-mail.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request.headers.get('origin'), new URL(request.url).origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
  }

  const now = new Date();
  const key = attemptKey.passwordReset(getClientIp(request.headers, process.env.CLIENT_IP_HEADER));
  if (!(await isAttemptAllowed(key, now))) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }
  await recordAttempt(key, now, PASSWORD_RESET_IP_POLICY);

  const email = normalizeEmail(parsed.data.email);
  const user = await findUserByEmail(email);
  if (user) {
    const token = await issueToken('password-reset', user.email, PASSWORD_RESET_TTL_MS);
    await sendPasswordResetEmail(user.email, token, new URL(request.url).origin);
  }
  return NextResponse.json({ ok: true });
}
