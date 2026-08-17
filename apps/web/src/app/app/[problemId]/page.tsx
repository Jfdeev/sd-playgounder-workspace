import { notFound } from 'next/navigation';
import { getProblem } from '@sdp/problems';
import { ProblemBrief } from '@/components/canvas/problem-brief';
import { Canvas } from '@/components/canvas/canvas';

// auth() já é verificado em apps/web/src/app/app/layout.tsx (envolve esta página) — nada a
// repetir aqui. getProblem nunca lança exceção (contracts/canvas-engine-boundary.md); id
// desconhecido vira 404 do Next.
export default async function ProblemCanvasPage({ params }: { params: Promise<{ problemId: string }> }) {
  const { problemId } = await params;
  const problem = getProblem(problemId);
  if (!problem) {
    notFound();
  }

  return (
    <>
      <ProblemBrief problem={problem} />
      <Canvas problem={problem} />
    </>
  );
}
