import Link from 'next/link';
import { ArrowRight, Gauge, ShieldAlert, Sparkles } from 'lucide-react';
import { ArchitecturePreview } from './architecture-preview';

// Proposta de valor central (docs/product-context.md §2): engine determinístico é a fonte da
// verdade, LLM é narrador — nunca juiz. Momento "aha": arrastar o slider de carga e ver a
// utilização/latência reagir ao vivo. Nome do produto mantido "System Design Playground" (D1,
// decisão do autor).
const STAT_PILLS = [
  { icon: Gauge, label: 'p50 / p95 / p99' },
  { icon: ShieldAlert, label: 'Detecção de SPOF' },
  { icon: Sparkles, label: 'Custo real por design' },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(139,92,246,0.25),transparent_70%)]"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
          <Sparkles className="size-4" aria-hidden />
          Engine determinístico, não LLM como juiz
        </span>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl">
          System Design Playground
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
          Monte arquiteturas de sistemas distribuídos num canvas e receba métricas calculadas —
          gargalo, latência, throughput real, custo, pontos únicos de falha. O número sai de
          cálculo, sempre igual para o mesmo design. O LLM só explica o resultado em linguagem
          natural — nunca julga.
        </p>

        <p className="mt-4 max-w-xl text-base text-zinc-500">
          Arraste o slider de carga e veja a utilização de um componente passar de 0,9 e a
          latência explodir na tela — e entenda teoria de filas sem ter lido uma linha sobre
          teoria de filas.
        </p>

        <Link
          href="/criar-conta"
          className="mt-10 inline-flex items-center gap-2 rounded-lg bg-violet-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400"
        >
          Criar conta grátis
          <ArrowRight className="size-4" aria-hidden />
        </Link>

        <dl className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {STAT_PILLS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-zinc-500">
              <Icon className="size-4 text-violet-400" aria-hidden />
              <dt className="sr-only">Métrica calculada</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto mt-16 max-w-4xl">
        <ArchitecturePreview />
      </div>
    </section>
  );
}
