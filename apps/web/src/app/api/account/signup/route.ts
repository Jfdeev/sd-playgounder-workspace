import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { users, verificationTokens } from '@/db/schema';
import { hashPassword, validatePasswordPolicy } from '@/lib/password';
import { sendConfirmationEmail } from '@/lib/email';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Mesma mensagem tanto para conta já confirmada quanto para conta ainda pendente de confirmação
// (contracts/auth-api.md) — não revela o motivo, só que o email já está em uso.
const EMAIL_IN_USE_MESSAGE = 'Este email já está em uso.';

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { field: 'email', message: 'Email ou senha em formato inválido.' },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    return NextResponse.json({ field: 'password', message: policy.message }, { status: 400 });
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    // Confirmada ou não — mesma resposta (ver EMAIL_IN_USE_MESSAGE acima).
    return NextResponse.json({ field: 'email', message: EMAIL_IN_USE_MESSAGE }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id });

  if (!created) {
    return NextResponse.json(
      { field: 'email', message: 'Não foi possível criar a conta. Tente novamente.' },
      { status: 400 },
    );
  }

  const token = randomBytes(32).toString('hex');
  await db.insert(verificationTokens).values({
    identifier: email,
    token,
    expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
  });

  const baseUrl = new URL(request.url).origin;
  // Falha de envio é capturada dentro de sendConfirmationEmail (research.md §4) — nunca lançada
  // aqui, então nunca bloqueia a resposta 201.
  await sendConfirmationEmail(email, token, baseUrl);

  return NextResponse.json({ ok: true }, { status: 201 });
}
