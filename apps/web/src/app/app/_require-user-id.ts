import { redirect } from 'next/navigation';
import { auth } from '@/auth';

/**
 * Id da conta logada pra páginas de /app que leem dados do usuário (M2.8). O layout de /app já
 * redireciona sem sessão, mas o Next renderiza layout e página em paralelo — a página não pode
 * assumir que a sessão existe (achado na verificação: `session!` quebrava antes do redirect valer).
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect('/entrar');
  return userId;
}
