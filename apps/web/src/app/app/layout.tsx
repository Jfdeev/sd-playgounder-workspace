import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SignOutButton } from './_sign-out-button';

// Header mínimo compartilhado por /app/[problemId] — email da sessão + sair (movido do antigo
// placeholder de M0.5, apps/web/src/app/app/page.tsx, que agora só redireciona).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect('/entrar');
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-3">
        <p className="text-sm font-semibold text-zinc-100">System Design Playground</p>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500">{session.user?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
