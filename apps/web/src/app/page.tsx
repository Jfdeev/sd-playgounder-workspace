import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Navbar } from './_components/navbar';
import { Hero } from './_components/hero';
import { Differentiators } from './_components/differentiators';
import { Footer } from './_components/footer';

export default async function LandingPage() {
  const session = await auth();
  if (session) {
    // FR-011: usuário já autenticado não vê a landing de apresentação de novo.
    redirect('/app');
  }

  return (
    <>
      <Navbar />
      <main className="bg-dot-grid min-h-screen bg-zinc-950">
        <Hero />
        <div id="diferenciais" className="scroll-mt-16 border-t border-zinc-900">
          <Differentiators />
        </div>
      </main>
      <Footer />
    </>
  );
}
