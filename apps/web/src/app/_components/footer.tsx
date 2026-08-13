import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-zinc-600 sm:flex-row">
        <p>© {new Date().getFullYear()} System Design Playground. Projeto de aprendizado, sem monetização.</p>
        <div className="flex items-center gap-6">
          <Link href="/entrar" className="transition hover:text-zinc-300">
            Entrar
          </Link>
          <Link href="/criar-conta" className="transition hover:text-zinc-300">
            Criar conta
          </Link>
        </div>
      </div>
    </footer>
  );
}
