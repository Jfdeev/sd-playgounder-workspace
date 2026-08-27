import { notFound } from 'next/navigation';
import { getProblem } from '@sdp/problems';
import { CanvasWorkspace } from '@/components/canvas/canvas-workspace';

// auth() já é verificado em apps/web/src/app/app/layout.tsx (envolve esta página) — nada a
// repetir aqui. getProblem nunca lança exceção (contracts/canvas-engine-boundary.md); id
// desconhecido vira 404 do Next. Deep link direto pra um desafio — o mesmo canvas de `/app`
// (sandbox), só que já entrando com esse desafio ativo.
export default async function ProblemCanvasPage({ params }: { params: Promise<{ problemId: string }> }) {
  const { problemId } = await params;
  const problem = getProblem(problemId);
  if (!problem) {
    notFound();
  }

  return <CanvasWorkspace initialProblemId={problem.id} />;
}
