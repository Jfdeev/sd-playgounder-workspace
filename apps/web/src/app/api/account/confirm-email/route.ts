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

  // Redireciona para /entrar (não /app): o link é aberto a partir de um cliente de email, que
  // pode não ter a sessão do navegador onde a conta foi criada — /app bateria em "sem sessão" e
  // jogaria a pessoa pro login sem nenhum sinal de que a confirmação funcionou.
  return Response.redirect(`${url.origin}/entrar?confirmado=1`, 302);
}
