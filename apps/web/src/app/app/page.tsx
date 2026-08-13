import { redirect } from 'next/navigation';
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
    <main>
      <h1>Você está dentro do System Design Playground</h1>
      <p>
        Logado como {session.user?.email}. O canvas (montar arquiteturas, simular carga) chega no
        próximo marco (M1) — por enquanto, esta é só a confirmação de que login e sessão funcionam.
      </p>
      <SignOutButton />
    </main>
  );
}
