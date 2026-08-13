import { redirect } from 'next/navigation';
import { Hammer } from 'lucide-react';
import { auth } from '@/auth';
import { SignOutButton } from './_sign-out-button';

// Placeholder "dentro do produto" (Assumptions do spec) — o canvas (M1) ainda não existe neste
// marco, então não há para onde mais redirecionar depois do login.
export default async function AppPlaceholderPage() {
  const session = await auth();
  if (!session) {
    redirect('/entrar');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
        <Hammer className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-semibold text-white">
        Você está dentro do System Design Playground
      </h1>
      <p className="mt-3 max-w-md text-sm text-zinc-400">
        Logado como <span className="text-zinc-200">{session.user?.email}</span>. O canvas
        (montar arquiteturas, simular carga) chega no próximo marco (M1) — por enquanto, esta é só
        a confirmação de que login e sessão funcionam.
      </p>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
