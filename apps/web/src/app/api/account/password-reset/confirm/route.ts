import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeToken, resetPassword } from '@/db/account';
import { isSameOriginRequest } from '@/lib/csrf';
import { hashPassword, validatePasswordPolicy } from '@/lib/password';

const confirmSchema = z.object({ token: z.string().min(1), password: z.string() });

/**
 * Define a senha nova a partir do link (specs/conta-lgpd, US1). A política de senha é conferida antes de
 * consumir o token — senha fraca não queima o link. Depois: uso único, e-mail confirmado, sessões abertas
 * derrubadas (`resetPassword`).
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request.headers.get('origin'), new URL(request.url).origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Link inválido ou expirado.' }, { status: 400 });
  }

  const policy = validatePasswordPolicy(parsed.data.password);
  if (!policy.valid) {
    return NextResponse.json({ error: 'WEAK_PASSWORD', message: policy.message }, { status: 400 });
  }

  const email = await consumeToken('password-reset', parsed.data.token, new Date());
  if (!email || !(await resetPassword(email, await hashPassword(parsed.data.password)))) {
    return NextResponse.json({ error: 'INVALID_TOKEN', message: 'Link inválido ou expirado. Peça um novo.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, email });
}
