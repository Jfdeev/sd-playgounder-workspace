import Link from 'next/link';
import { Boxes } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Boxes className="size-4.5" aria-hidden />
          </span>
          System Design Playground
        </Link>

        <div className="hidden items-center gap-8 sm:flex">
          <Link
            href="#diferenciais"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            Diferenciais
          </Link>
          <Link href="/entrar" className="text-sm text-zinc-400 transition hover:text-white">
            Entrar
          </Link>
          <Link
            href="/criar-conta"
            className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            Criar conta
          </Link>
        </div>

        <Link
          href="/criar-conta"
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 sm:hidden"
        >
          Criar conta
        </Link>
      </nav>
    </header>
  );
}
