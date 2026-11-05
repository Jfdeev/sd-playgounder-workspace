'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutGrid, Medal, Trophy } from 'lucide-react';

const LINKS = [
  { href: '/app', label: 'Canvas', icon: LayoutGrid },
  { href: '/app/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/app/progresso', label: 'Progresso', icon: Trophy },
  { href: '/app/ranking', label: 'Ranking', icon: Medal },
] as const;

/** Barra das telas fora do canvas, com o mesmo estilo dos botões da barra do canvas e o link ativo destacado. */
export function AppPageNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação do app" className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
              active ? 'border-violet-500 bg-violet-600/15 text-violet-200' : 'border-zinc-800 text-zinc-200 hover:border-violet-500'
            }`}
          >
            <Icon className="size-4 text-violet-400" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
