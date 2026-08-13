import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Hero } from './_components/hero';
import { Differentiators } from './_components/differentiators';
import { Comparison } from './_components/comparison';

export default async function LandingPage() {
  const session = await auth();
  if (session) {
    // FR-011: usuário já autenticado não vê a landing de apresentação de novo.
    redirect('/app');
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <Hero />
      <div className="border-t border-zinc-900">
        <Differentiators />
      </div>
      <div className="border-t border-zinc-900">
        <Comparison />
      </div>
    </main>
  );
}
