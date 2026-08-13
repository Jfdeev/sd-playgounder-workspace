import { CheckCircle2, XCircle } from 'lucide-react';

// Concorrentes citados em docs/product-context.md §1. Framing deliberado: descrevemos a NOSSA
// abordagem (determinística, reproduzível) sem afirmar como fato verificado o funcionamento
// interno de cada ferramenta de terceiros — copy pública, não uma auditoria de concorrentes.
const KNOWN_TOOLS = [
  'System Design Arena',
  'ScaleDojo',
  'SystemSloth',
  'Scalcraft',
  'Codemia',
  'mockingly.ai',
  'systemdesignsandbox.com',
  'SystemForge',
  'paperdraw.dev',
] as const;

export function Comparison() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Nossa abordagem é diferente
          </h2>
          <p className="mt-4 text-zinc-400">
            Se você já testou outras ferramentas de estudo de system design, talvez tenha notado
            um padrão comum.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-2 text-zinc-400">
              <XCircle className="size-5" aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Padrão comum no mercado
              </span>
            </div>
            <p className="mt-4 text-zinc-400">
              Um LLM olha seu diagrama e dá uma nota. Isso é ruidoso — o modelo tende a premiar o
              desenho que <em>parece</em> certo, não o que de fato aguenta carga, e a mesma
              arquitetura pode receber notas diferentes em tentativas diferentes.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="size-5" aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-wide">Aqui</span>
            </div>
            <p className="mt-4 text-zinc-300">
              Todo número — gargalo, p99, custo, ponto único de falha — sai de um cálculo
              determinístico. O LLM só recebe o resultado pronto para explicar em linguagem
              natural, nunca julga. Mesmo design, mesma nota, sempre.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-600">
          Comparado com {KNOWN_TOOLS.join(', ')}, entre outras.
        </p>
      </div>
    </section>
  );
}
