import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { isAttemptAllowed, recordAttempt } from '@/db/attempts';
import { db } from '@/db/client';
import { users, verificationTokens } from '@/db/schema';
import { getClientIp } from '@/lib/client-ip';
import { isSameOriginRequest } from '@/lib/csrf';
import { sendConfirmationEmail, sendExistingAccountNotice } from '@/lib/email';
import { normalizeEmail } from '@/lib/email-address';
import { hashPassword, validatePasswordPolicy } from '@/lib/password';
import { attemptKey, SIGNUP_IP_POLICY } from '@/lib/rate-limit';
import { hashToken } from '@/lib/token-hash';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * Cadastro (M0.5), endurecido pelo relatório de segurança:
 * - item 6: limite de tentativas por IP (`SIGNUP_IP_POLICY`), contado antes de criar conta ou mandar e-mail;
 * - item 8: email novo e email que já tem conta recebem a MESMA resposta (201) — o dono do email existente
 *   recebe um aviso por e-mail. O bcrypt roda nos dois caminhos, para o tempo de resposta não denunciar;
 * - item 9: email normalizado (`normalizeEmail`) e comparado sem diferenciar maiúsculas;
 * - item 13: o banco guarda só o hash do token de confirmação.
 */
export async function POST(request: Request): Promise<Response> {
  // Mitigação de CSRF (esta rota não tem a proteção nativa que as rotas do Auth.js já têm) —
  // src/lib/csrf.ts. Checado antes de qualquer leitura/escrita.
  const requestOrigin = request.headers.get('origin');
  const expectedOrigin = new URL(request.url).origin;
  if (!isSameOriginRequest(requestOrigin, expectedOrigin)) {
    return NextResponse.json({ field: 'email', message: 'Requisição inválida.' }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { field: 'email', message: 'Email ou senha em formato inválido.' },
      { status: 400 },
    );
  }
  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;

  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    return NextResponse.json({ field: 'password', message: policy.message }, { status: 400 });
  }

  const now = new Date();
  const signupKey = attemptKey.signup(getClientIp(request.headers, process.env.CLIENT_IP_HEADER));
  if (!(await isAttemptAllowed(signupKey, now))) {
    return NextResponse.json(
      { field: 'email', message: 'Muitas tentativas de cadastro a partir desta rede — tente de novo mais tarde.' },
      { status: 429 },
    );
  }
  await recordAttempt(signupKey, now, SIGNUP_IP_POLICY);

  const [[existing], passwordHash] = await Promise.all([
    db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1),
    hashPassword(password),
  ]);
  const baseUrl = new URL(request.url).origin;

  if (existing) {
    // Mesma resposta de um cadastro novo (item 8); o aviso vai para a caixa do dono, não para quem pediu.
    await sendExistingAccountNotice(email, baseUrl);
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const [created] = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id });

  if (!created) {
    return NextResponse.json(
      { field: 'email', message: 'Não foi possível criar a conta. Tente novamente.' },
      { status: 400 },
    );
  }

  const token = randomBytes(32).toString('hex');
  await db.insert(verificationTokens).values({
    identifier: email,
    token: hashToken(token),
    expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });

  // Falha de envio é capturada dentro de sendConfirmationEmail (research.md §4) — nunca lançada
  // aqui, então nunca bloqueia a resposta 201.
  await sendConfirmationEmail(email, token, baseUrl);

  return NextResponse.json({ ok: true }, { status: 201 });
}
