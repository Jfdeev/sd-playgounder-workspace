import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

// Casca visual compartilhada por /criar-conta e /entrar — evita duplicar o layout de card
// centralizado entre as duas telas (única duplicação real que valia extrair; os formulários em
// si permanecem separados porque a validação/estado de cada um é diferente).
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center text-sm font-semibold text-zinc-500 transition hover:text-zinc-300"
        >
          System Design Playground
        </Link>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">{footer}</p>
      </div>
    </main>
  );
}
