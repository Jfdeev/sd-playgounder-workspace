import { ArrowLeftRight, Scale, Siren, TrendingUp, type LucideIcon } from 'lucide-react';

// Os 4 diferenciais ⭐ (prioridade P0) de docs/foundational-doc.md §7.1-7.4.
const DIFFERENTIATORS: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: TrendingUp,
    title: 'Modo Campanha',
    description:
      'O mesmo problema evolui em fases sucessivas — 10k DAU, depois 500k, depois um requisito ' +
      'novo, depois um corte de budget. Sua arquitetura evolui sob pressão, não recomeça do zero. ' +
      'O score inclui custo de migração: reescrever tudo perde pontos.',
  },
  {
    icon: Siren,
    title: 'Modo Incidente',
    description:
      'Você recebe uma arquitetura pronta e um alerta: p99 subiu 8x às 3h da manhã. Só tem acesso ' +
      'a métricas simuladas — precisa diagnosticar a causa raiz e propor o fix. O outro lado da ' +
      'moeda do system design: operação, não só desenho.',
  },
  {
    icon: Scale,
    title: 'Budget forçado + fronteira de Pareto',
    description:
      'Todo problema vem com teto de custo — nada de colocar cache, fila e réplica em tudo. Depois ' +
      'de submeter, veja seu design plotado num gráfico custo × latência junto com o de todo ' +
      'mundo, com a fronteira de Pareto destacada.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Ponte com o mundo real',
    description:
      'Importe um docker-compose.yml, manifesto k8s ou Terraform e vire canvas automaticamente — ' +
      'simule a arquitetura do seu próprio projeto. Exporte seu design como esqueleto de ' +
      'docker-compose ou ADR em markdown.',
  },
];

export function Differentiators() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            O que ninguém mais tem
          </h2>
          <p className="mt-4 text-zinc-400">
            Quatro diferenciais que nenhum outro playground de system design oferece.
          </p>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {DIFFERENTIATORS.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-violet-500/40 hover:bg-zinc-900"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition group-hover:bg-violet-500/20">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
