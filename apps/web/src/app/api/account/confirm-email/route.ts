import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, verificationTokens } from '@/db/schema';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.redirect(`${url.origin}/entrar?erro=link_invalido`, 302);
  }

  const [verification] = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.token, token))
    .limit(1);

  if (!verification || verification.expires < new Date()) {
    return Response.redirect(`${url.origin}/entrar?erro=link_invalido`, 302);
  }

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.email, verification.identifier));

  // Uso único — remove o token consumido.
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, verification.identifier),
        eq(verificationTokens.token, verification.token),
      ),
    );

  return Response.redirect(`${url.origin}/app?confirmado=1`, 302);
}
