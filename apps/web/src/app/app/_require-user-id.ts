import { redirect } from 'next/navigation';
import { auth } from '@/auth';

/**
 * Id da conta logada pra páginas de /app que leem dados do usuário (M2.8). O layout de /app já
 * redireciona sem sessão, mas o Next renderiza layout e página em paralelo — a página não pode
 * assumir que a sessão existe (achado na verificação: `session!` quebrava antes do redirect valer).
 */
export async function requireUserId(returnTo?: string): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  // M4.1: com `returnTo`, o login volta pra cá (ex.: link de design compartilhado) — validado em /entrar.
  if (!userId) redirect(returnTo ? `/entrar?voltar=${encodeURIComponent(returnTo)}` : '/entrar');
  return userId;
}
