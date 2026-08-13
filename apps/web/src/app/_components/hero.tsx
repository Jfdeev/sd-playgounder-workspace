import Link from 'next/link';

// Proposta de valor central (docs/product-context.md §2): engine determinístico é a fonte da
// verdade, LLM é narrador — nunca juiz. Momento "aha": arrastar o slider de carga e ver a
// utilização/latência reagir ao vivo. Nome do produto mantido "System Design Playground" (D1,
// decisão do autor).
export function Hero() {
  return (
    <section>
      <h1>System Design Playground</h1>
      <p>
        Monte arquiteturas de sistemas distribuídos num canvas e receba métricas calculadas por um
        engine determinístico — gargalo, latência p50/p95/p99, throughput real, custo, pontos
        únicos de falha. Nada disso vem de um LLM &quot;achando&quot; que seu diagrama está bom: o
        número sai de cálculo, sempre igual para o mesmo design. O LLM só explica o resultado em
        linguagem natural — nunca julga.
      </p>
      <p>
        Arraste o slider de carga e veja a utilização de um componente passar de 0,9 e a latência
        explodir na tela — e entenda teoria de filas sem ter lido uma linha sobre teoria de filas.
      </p>
      <Link href="/criar-conta">Criar conta grátis</Link>
    </section>
  );
}
