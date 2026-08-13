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
    <>
      <Hero />
      <Differentiators />
      <Comparison />
    </>
  );
}
