import type { ReferenceArchitecture } from '../reference-architectures.js';

/**
 * Preset discord — conteúdo aprovado pelo autor em 2026-10-08
 * (specs/arquiteturas-referencia/content-draft-discord.md). Toda afirmação saiu das fontes abaixo,
 * lidas em 2026-10-07 (research.md §1). Réplicas são ilustrativas, salvo `replicasIllustrative: false`
 * com a fonte do número.
 */
export const DISCORD_PRESET: ReferenceArchitecture = {
  id: 'discord',
  company: 'Discord — mensagens e gateway',
  summary:
    'O caminho das mensagens do Discord e o gateway em tempo real: o monolito de API grava e lê mensagens num cluster ScyllaDB (antes Cassandra), protegido por serviços intermediários em Rust; os usuários ficam conectados por WebSocket a um gateway em Elixir, que espalha cada evento de um servidor para todas as sessões ligadas a ele.',
  sources: [
    { id: 'trillions', title: 'How Discord Stores Trillions of Messages', publisher: 'Discord', url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', accessedAt: '2026-10-07' },
    { id: 'elixir', title: 'How Discord Scaled Elixir to 5,000,000 Concurrent Users', publisher: 'Discord', url: 'https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users', accessedAt: '2026-10-07' },
  ],
  nodes: [
    {
      id: 'api-monolith', type: 'app_server', replicas: 6, label: 'Monolito de API', sourceIds: ['trillions'], replicasIllustrative: true,
      explanation: {
        text: 'As mensagens são lidas e gravadas a partir do monolito de API do Discord. Entre ele e o banco ficam os data services: serviços intermediários escritos em Rust, com cerca de um endpoint gRPC por consulta e, de propósito, nenhuma regra de negócio, criados para proteger o banco de partições quentes.',
        sourceIds: ['trillions'],
      },
    },
    {
      id: 'scylladb', type: 'nosql_kv', replicas: 72, label: 'ScyllaDB (mensagens)', sourceIds: ['trillions'],
      approximation: 'O ScyllaDB é um banco wide-column compatível com o Cassandra; o catálogo o representa como NoSQL (KV).',
      replicasIllustrative: false, replicasSourceId: 'trillions',
      explanation: {
        text: 'As mensagens ficavam num cluster Cassandra que passou de 12 nós em 2017 para 177 no começo de 2022, com latência imprevisível, partições quentes e pausas de garbage collection. Em maio de 2022 o banco de mensagens foi migrado para o ScyllaDB, compatível com o Cassandra e escrito em C++, sem garbage collector: 72 nós, e o p99 de leitura do histórico caiu de 40–125 ms para 15 ms.',
        sourceIds: ['trillions'],
      },
    },
    {
      id: 'elixir-gateway', type: 'app_server', replicas: 6, label: 'Gateway Elixir (sessões WebSocket)', sourceIds: ['elixir'], replicasIllustrative: true,
      explanation: {
        text: 'O Discord foi prototipado em Elixir, sobre a VM do Erlang, escolhida para um sistema em tempo real altamente concorrente. Cada usuário se conecta por WebSocket e ganha um processo de sessão; em 2017 eram quase 5 milhões de usuários simultâneos, e uma VM de sessões chegava a 500 mil sessões ativas.',
        sourceIds: ['elixir'],
      },
    },
    {
      id: 'guild-fanout', type: 'pubsub', replicas: 4, label: 'Processos de guild (fan-out)', sourceIds: ['elixir'],
      approximation: 'Os processos de guild são processos Erlang em outros nós, não um broker de pub/sub; o catálogo os aproxima por Pub/Sub.',
      replicasIllustrative: true,
      explanation: {
        text: 'As sessões conversam com processos de guild (o nome interno de um "servidor" do Discord) que rodam em outros nós Erlang. Quando algo é publicado numa guild, o evento é espalhado para todas as sessões conectadas a ela; segundo o post, a maior parte do Discord se resume a pub/sub.',
        sourceIds: ['elixir'],
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'api-monolith', to: 'scylladb', kind: 'read', weight: 1, basis: 'inferida', sourceIds: [], note: 'A fonte põe os data services entre o monolito e o banco; o catálogo não liga um App Server a outro, então a aresta os colapsa.' },
    { id: 'e2', from: 'api-monolith', to: 'scylladb', kind: 'write', weight: 1, basis: 'inferida', sourceIds: [], note: 'Mesmo colapso de e1, para a gravação de mensagens.' },
    { id: 'e3', from: 'elixir-gateway', to: 'guild-fanout', kind: 'async', weight: 1, basis: 'afirmada', sourceIds: ['elixir'] },
  ],
  entryNodeIds: ['api-monolith', 'elixir-gateway'],
  limitations: [
    'Os data services (Rust) não aparecem como componente: o request coalescing (várias leituras da mesma linha viram uma consulta só) e o roteamento por hash consistente até eles não são modelados.',
    'As arestas e1 e e2 são inferidas (ver as conexões inferidas).',
    'As fontes não dizem como o gateway e o monolito de API se ligam; no preset eles são duas entradas independentes, e o fan-out de volta às sessões não aparece.',
    'Os componentes vêm de fontes de anos diferentes (gateway em 2017, armazenamento em 2023); o preset não é uma foto de um único momento.',
    'Ficam de fora: a busca (Elasticsearch, fila e workers de indexação, descrita em 2017) e os outros clusters de banco do Discord.',
  ],
};
