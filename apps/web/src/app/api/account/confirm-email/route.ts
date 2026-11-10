import { consumeToken, markEmailVerified } from '@/db/account';

/**
 * Link de confirmação de e-mail (M0.5). Só aceita token do fluxo de confirmação — um link de redefinição
 * de senha não confirma nada aqui (specs/conta-lgpd, FR-001). Uso único; o banco guarda só o hash.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const email = token ? await consumeToken('confirmation', token, new Date()) : null;

  if (!email) {
    return Response.redirect(`${url.origin}/entrar?erro=link_invalido`, 302);
  }

  await markEmailVerified(email);

  // Redireciona para /entrar (não /app): o link é aberto a partir de um cliente de email, que
  // pode não ter a sessão do navegador onde a conta foi criada — /app bateria em "sem sessão" e
  // jogaria a pessoa pro login sem nenhum sinal de que a confirmação funcionou.
  return Response.redirect(`${url.origin}/entrar?confirmado=1`, 302);
}
