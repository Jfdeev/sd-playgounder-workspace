import { Suspense } from 'react';
import { EntrarForm } from './_entrar-form';

// useSearchParams (dentro de EntrarForm) exige um limite de Suspense para não bloquear a
// renderização estática da página inteira (Next.js App Router).
export default function EntrarPage() {
  return (
    <main>
      <h1>Entrar</h1>
      <Suspense fallback={null}>
        <EntrarForm />
      </Suspense>
    </main>
  );
}
