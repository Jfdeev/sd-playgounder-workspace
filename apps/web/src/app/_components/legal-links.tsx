import Link from 'next/link';

/** Links para as páginas legais (LGPD, specs/conta-lgpd US3) — rodapé da landing e telas de conta. */
export function LegalLinks({ className = 'gap-4' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Link href="/privacidade" className="transition hover:text-zinc-300">
        Privacidade
      </Link>
      <Link href="/termos" className="transition hover:text-zinc-300">
        Termos de uso
      </Link>
    </span>
  );
}
