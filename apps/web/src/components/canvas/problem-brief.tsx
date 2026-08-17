import type { Problem } from '@sdp/problems';

/** Enunciado do problema (FR-012) — exibido antes/acima do canvas, sempre visível. */
export function ProblemBrief({ problem }: { problem: Problem }) {
  return (
    <details className="border-b border-zinc-800 bg-zinc-950 px-6 py-3" open>
      <summary className="cursor-pointer text-sm font-semibold text-zinc-200">{problem.title}</summary>
      <div className="mt-3 grid gap-4 text-sm text-zinc-400 sm:grid-cols-2">
        <p className="sm:col-span-2">{problem.statement}</p>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Requisitos funcionais</h3>
          <ul className="list-inside list-disc space-y-1">
            {problem.functionalRequirements.map((fr) => (
              <li key={fr}>{fr}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Requisitos não-funcionais</h3>
          <ul className="list-inside list-disc space-y-1">
            {problem.nonFunctionalRequirements.map((nfr) => (
              <li key={nfr}>{nfr}</li>
            ))}
          </ul>
        </div>
        <div className="sm:col-span-2">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Escala esperada</h3>
          <p>
            {problem.scale.dau.toLocaleString('pt-BR')} usuários ativos/dia ·{' '}
            {problem.scale.requestsPerUserPerDay} requisições/usuário/dia ·{' '}
            {Math.round(problem.scale.readWriteRatio * 100)}% leitura ·{' '}
            pico {problem.scale.peakMultiplier}× a média
          </p>
        </div>
      </div>
    </details>
  );
}
