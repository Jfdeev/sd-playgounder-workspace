# Rascunho de conteúdo — M2.5, preset Discord — mensagens e gateway — aguardando aprovação do autor

> **Gate (FR-008)**: rascunho assistido por LLM. Cada afirmação foi tirada de uma página que **abriu e
> foi lida** em 2026-10-07 (registro em `research.md` §1); as frases são paráfrase da fonte. Este texto
> foi gerado do mesmo dado que já passou nas checagens dos testes (validador dos 7 invariantes, matriz
> de conexões do canvas e `simulate()` sem violação) — aprovado, ele vira `presets/discord.ts` literal.

## Identidade

- **Nome no menu**: Discord — mensagens e gateway · **id**: `discord`
- **Resumo**: "O caminho das mensagens do Discord e o gateway em tempo real: o monolito de API grava e lê mensagens num cluster ScyllaDB (antes Cassandra), protegido por serviços intermediários em Rust; os usuários ficam conectados por WebSocket a um gateway em Elixir, que espalha cada evento de um servidor para todas as sessões ligadas a ele."

## Fontes

1. [How Discord Stores Trillions of Messages](https://discord.com/blog/how-discord-stores-trillions-of-messages) — publicador: Discord
2. [How Discord Scaled Elixir to 5,000,000 Concurrent Users](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users) — publicador: Discord

## Componentes

`entryNodeIds: ['api-monolith', 'elixir-gateway']` — o cliente é o nó visual do canvas.

| id | Rótulo | Tipo no catálogo | Réplicas | Fonte | Explicação ("Por que está aqui") |
|---|---|---|---|---|---|
| `api-monolith` | Monolito de API | `app_server` | 6 *(ilustrativo)* | [1] | "As mensagens são lidas e gravadas a partir do monolito de API do Discord. Entre ele e o banco ficam os data services: serviços intermediários escritos em Rust, com cerca de um endpoint gRPC por consulta e, de propósito, nenhuma regra de negócio, criados para proteger o banco de partições quentes." |
| `scylladb` | ScyllaDB (mensagens) | `nosql_kv` *(aproximação)* | **72** (fonte [1]) | [1] | "As mensagens ficavam num cluster Cassandra que passou de 12 nós em 2017 para 177 no começo de 2022, com latência imprevisível, partições quentes e pausas de garbage collection. Em maio de 2022 o banco de mensagens foi migrado para o ScyllaDB, compatível com o Cassandra e escrito em C++, sem garbage collector: 72 nós, e o p99 de leitura do histórico caiu de 40–125 ms para 15 ms. <br>*Aproximação:* O ScyllaDB é um banco wide-column compatível com o Cassandra; o catálogo o representa como NoSQL (KV)." |
| `elixir-gateway` | Gateway Elixir (sessões WebSocket) | `app_server` | 6 *(ilustrativo)* | [2] | "O Discord foi prototipado em Elixir, sobre a VM do Erlang, escolhida para um sistema em tempo real altamente concorrente. Cada usuário se conecta por WebSocket e ganha um processo de sessão; em 2017 eram quase 5 milhões de usuários simultâneos, e uma VM de sessões chegava a 500 mil sessões ativas." |
| `guild-fanout` | Processos de guild (fan-out) | `pubsub` *(aproximação)* | 4 *(ilustrativo)* | [2] | "As sessões conversam com processos de guild (o nome interno de um "servidor" do Discord) que rodam em outros nós Erlang. Quando algo é publicado numa guild, o evento é espalhado para todas as sessões conectadas a ela; segundo o post, a maior parte do Discord se resume a pub/sub. <br>*Aproximação:* Os processos de guild são processos Erlang em outros nós, não um broker de pub/sub; o catálogo os aproxima por Pub/Sub." |

## Conexões

| id | De → Para | Tipo de aresta | Base | Fonte / justificativa |
|---|---|---|---|---|
| `e1` | Monolito de API → ScyllaDB (mensagens) | `read` | **inferida** | A fonte põe os data services entre o monolito e o banco; o catálogo não liga um App Server a outro, então a aresta os colapsa. |
| `e2` | Monolito de API → ScyllaDB (mensagens) | `write` | **inferida** | Mesmo colapso de e1, para a gravação de mensagens. |
| `e3` | Gateway Elixir (sessões WebSocket) → Processos de guild (fan-out) | `async` | **afirmada** | [2] |

Todas as arestas (e as do Cliente até cada entrada) são aceitas pela matriz de conexões do canvas.

## O que a simulação não modela (limitações exibidas no preset)

1. Os data services (Rust) não aparecem como componente: o request coalescing (várias leituras da mesma linha viram uma consulta só) e o roteamento por hash consistente até eles não são modelados.
2. As arestas e1 e e2 são inferidas (ver as conexões inferidas).
3. As fontes não dizem como o gateway e o monolito de API se ligam; no preset eles são duas entradas independentes, e o fan-out de volta às sessões não aparece.
4. Os componentes vêm de fontes de anos diferentes (gateway em 2017, armazenamento em 2023); o preset não é uma foto de um único momento.
5. Ficam de fora: a busca (Elasticsearch, fila e workers de indexação, descrita em 2017) e os outros clusters de banco do Discord.

## Decisões para o autor

- Os data services ficam colapsados nas arestas e1/e2 (mesmo tratamento do proxy do Spokes no GitHub). Alternativa: um nó próprio para eles — exigiria mudar a matriz de conexões do canvas (App Server → App Server), o que está fora do escopo do M2.5. **Recomendo manter colapsado.**
- O ScyllaDB usa **72 réplicas com fonte** (o post de 2023), não ilustrativas — é o único número real da leva. Os outros componentes continuam ilustrativos.
- O preset junta fontes de 2017 (gateway) e 2023 (armazenamento). Alternativa: tirar o gateway e ficar só com o caminho das mensagens (2 componentes).
