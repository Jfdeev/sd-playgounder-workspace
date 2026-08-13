// Os 4 diferenciais ⭐ (prioridade P0) de docs/foundational-doc.md §7.1-7.4.
const DIFFERENTIATORS = [
  {
    title: 'Modo Campanha',
    description:
      'O mesmo problema evolui em fases sucessivas — 10k DAU, depois 500k, depois um requisito ' +
      'novo, depois um corte de budget. Sua arquitetura evolui sob pressão, não recomeça do zero. ' +
      'O score inclui custo de migração: reescrever tudo perde pontos.',
  },
  {
    title: 'Modo Incidente',
    description:
      'Você recebe uma arquitetura pronta e um alerta: p99 subiu 8x às 3h da manhã. Só tem acesso ' +
      'a métricas simuladas — precisa diagnosticar a causa raiz e propor o fix. O outro lado da ' +
      'moeda do system design: operação, não só desenho.',
  },
  {
    title: 'Budget forçado + fronteira de Pareto',
    description:
      'Todo problema vem com teto de custo — nada de colocar cache, fila e réplica em tudo. Depois ' +
      'de submeter, veja seu design plotado num gráfico custo × latência junto com o de todo ' +
      'mundo, com a fronteira de Pareto destacada.',
  },
  {
    title: 'Ponte com o mundo real',
    description:
      'Importe um docker-compose.yml, manifesto k8s ou Terraform e vire canvas automaticamente — ' +
      'simule a arquitetura do seu próprio projeto. Exporte seu design como esqueleto de ' +
      'docker-compose ou ADR em markdown.',
  },
] as const;

export function Differentiators() {
  return (
    <section>
      <h2>O que ninguém mais tem</h2>
      <ul>
        {DIFFERENTIATORS.map((item) => (
          <li key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
