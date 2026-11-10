import { Suspense } from 'react';
import Link from 'next/link';
import { EntrarForm } from './_entrar-form';
import { AuthShell } from '../_components/auth-shell';

// useSearchParams (dentro de EntrarForm) exige um limite de Suspense para não bloquear a
// renderização estática da página inteira (Next.js App Router).
export default function EntrarPage() {
  return (
    <AuthShell
      title="Entrar"
      subtitle="Bem-vindo de volta."
      footer={
        <>
          Não tem conta?{' '}
          <Link href="/criar-conta" className="font-medium text-violet-400 hover:text-violet-300">
            Criar conta
          </Link>
          <span className="mt-2 block">
            <Link href="/esqueci-senha" className="text-violet-400 hover:text-violet-300">
              Esqueci minha senha
            </Link>
          </span>
        </>
      }
    >
      <Suspense fallback={null}>
        <EntrarForm />
      </Suspense>
    </AuthShell>
  );
}
