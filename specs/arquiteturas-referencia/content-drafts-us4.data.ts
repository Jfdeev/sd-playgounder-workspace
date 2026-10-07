import type { ReferenceArchitecture } from '@sdp/knowledge';

const D = '2026-10-07';

export const DISCORD: ReferenceArchitecture = {
  id: 'discord',
  company: 'Discord — mensagens e gateway',
  summary:
    'O caminho das mensagens do Discord e o gateway em tempo real: o monolito de API grava e lê mensagens num cluster ScyllaDB (antes Cassandra), protegido por serviços intermediários em Rust; os usuários ficam conectados por WebSocket a um gateway em Elixir, que espalha cada evento de um servidor para todas as sessões ligadas a ele.',
  sources: [
    { id: 'trillions', title: 'How Discord Stores Trillions of Messages', publisher: 'Discord', url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', accessedAt: D },
    { id: 'elixir', title: 'How Discord Scaled Elixir to 5,000,000 Concurrent Users', publisher: 'Discord', url: 'https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users', accessedAt: D },
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

export const IFOOD: ReferenceArchitecture = {
  id: 'ifood-search',
  company: 'iFood — busca',
  summary:
    'A busca do iFood é um pipeline distribuído coordenado pelo Discovery Search Service: entende a intenção do termo, enriquece a consulta, recupera candidatos no Elasticsearch (busca léxica, semântica e híbrida) e reordena o resultado com dados consultados na hora em APIs de outros times.',
  sources: [
    { id: 'busca', title: 'Como Funciona a Busca do iFood?', publisher: 'iFood', url: 'https://tech.ifood.com.br/engenharia/como-funciona-a-busca-do-ifood/', accessedAt: D },
  ],
  nodes: [
    {
      id: 'discovery-search', type: 'app_server', replicas: 6, label: 'Discovery Search Service', sourceIds: ['busca'], replicasIllustrative: true,
      explanation: {
        text: 'O Discovery Search Service coordena a busca. Modelos de machine learning estimam a intenção do termo (um item, um restaurante, um tipo de loja; restaurante, farmácia, mercado...) e escolhem quais índices consultar; um parser, classificadores e um corretor com sinônimos montam os filtros, e o termo é vetorizado. Depois da recuperação, uma etapa de reranking reordena os resultados com sinais como cliques, pedidos, distância, frete e preço. No período citado no post, o p99 do serviço ficou em torno de 1,2 s.',
        sourceIds: ['busca'],
      },
    },
    {
      id: 'elasticsearch', type: 'vector_db', replicas: 3, label: 'Elasticsearch', sourceIds: ['busca'],
      approximation: 'O Elasticsearch é aproximado por Vector DB: cobre o índice vetorial (HNSW), não a busca léxica nem o autocomplete.',
      replicasIllustrative: true,
      explanation: {
        text: 'O Elasticsearch guarda os índices da busca: o autocomplete (os termos mais frequentes por prefixo, geolocalização, dia da semana e período do dia) e os documentos recuperados por busca léxica, semântica (vetores com HNSW) ou híbrida, combinadas por Reciprocal Rank Fusion. A área de entrega é resolvida com hexágonos H3, o que transforma a geolocalização numa correspondência de texto.',
        sourceIds: ['busca'],
      },
    },
    {
      id: 'merchant-enrichment', type: 'third_party_api', replicas: 2, label: 'Merchant Enrichment API', sourceIds: ['busca'],
      approximation: 'É uma API interna de outro time do iFood, aproximada por 3rd Party API (o catálogo não liga um App Server a outro).',
      replicasIllustrative: true,
      explanation: {
        text: 'Os documentos recuperados têm dados que outras equipes gerenciam e que precisam ser consultados na hora da busca, como nome, descrição e geolocalização dos estabelecimentos, para aplicar regras de negócio antes do reranking.',
        sourceIds: ['busca'],
      },
    },
    {
      id: 'item-enrichment', type: 'third_party_api', replicas: 2, label: 'Item Enrichment API', sourceIds: ['busca'],
      approximation: 'É uma API interna de outro time do iFood, aproximada por 3rd Party API (o catálogo não liga um App Server a outro).',
      replicasIllustrative: true,
      explanation: {
        text: 'Mesmo papel da Merchant Enrichment API, para os itens: os dados dos itens recuperados são consultados na hora da busca para enriquecer a requisição antes do reranking.',
        sourceIds: ['busca'],
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'discovery-search', to: 'elasticsearch', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['busca'] },
    { id: 'e2', from: 'discovery-search', to: 'merchant-enrichment', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['busca'] },
    { id: 'e3', from: 'discovery-search', to: 'item-enrichment', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['busca'] },
  ],
  entryNodeIds: ['discovery-search'],
  limitations: [
    'Os modelos de machine learning (intenção, classificação, vetorização) e o reranking não são componentes do catálogo; no preset eles ficam dentro do Discovery Search Service.',
    'O Elasticsearch é aproximado por Vector DB, e as APIs de enriquecimento de outros times, por 3rd Party API.',
    'O preset cobre só a busca, não o resto do iFood (pedidos, logística, pagamentos), e não tem balanceador nem gateway porque a fonte não os descreve.',
    'O engine divide a carga entre as três consultas; na busca real, uma requisição consulta o Elasticsearch e as APIs de enriquecimento em sequência.',
  ],
};

export const NUBANK: ReferenceArchitecture = {
  id: 'nubank-defense',
  company: 'Nubank — Defense Platform (antifraude)',
  summary:
    'A Defense Platform é a plataforma antifraude que atende todos os produtos do Nubank: cada evento, como uma transação PIX, passa por um orquestrador que roda regras e modelos de machine learning em paralelo, busca dados em bancos internos e provedores externos, e decide se a transação segue ou dispara uma ação.',
  sources: [
    { id: 'defense', title: 'Scaling fraud defense: How Nubank evolved its risk analysis platform', publisher: 'Nubank', url: 'https://building.nubank.com/scaling-fraud-defense-how-nubank-evolved-its-risk-analysis-platform/', accessedAt: D },
    { id: 'contracts', title: 'Why We Killed Our End-to-End Test Suite', publisher: 'Nubank', url: 'https://building.nubank.com/why-we-killed-our-end-to-end-test-suite/', accessedAt: D },
  ],
  nodes: [
    {
      id: 'flow-orchestrator', type: 'app_server', replicas: 6, label: 'Flow Orchestrator', sourceIds: ['defense'], replicasIllustrative: true,
      explanation: {
        text: 'O Flow Orchestrator sabe por onde cada tipo de evento precisa passar: num PIX, mais de 40 processos (regras de negócio e modelos de machine learning) podem rodar em paralelo. Ele foi refeito como um grafo acíclico de dependências, com a biblioteca Nodely, e o tempo dos fluxos complexos caiu de 550 ms para cerca de 350 ms. Se uma regra já marca a transação como de alto risco, o modelo, mais lento, nem roda.',
        sourceIds: ['defense'],
      },
    },
    {
      id: 'datomic', type: 'nosql_kv', replicas: 3, label: 'Datomic (sobre DynamoDB)', sourceIds: ['defense'],
      approximation: 'O Datomic é um banco imutável que roda sobre o DynamoDB; o catálogo o representa como NoSQL (KV).',
      replicasIllustrative: true,
      explanation: {
        text: 'As regras e os modelos puxam dados das features, um sistema que acessa bancos internos, provedores externos e outros serviços. A plataforma é escrita em Clojure, sobre o Datomic rodando em cima do DynamoDB.',
        sourceIds: ['defense'],
      },
    },
    {
      id: 'external-providers', type: 'third_party_api', replicas: 2, label: 'Provedores externos', sourceIds: ['defense'], replicasIllustrative: true,
      explanation: {
        text: 'As features também consultam provedores terceiros para completar o contexto do evento (origem, destino, valor e o que mais cada defesa precisar).',
        sourceIds: ['defense'],
      },
    },
    {
      id: 'kafka', type: 'kafka', replicas: 3, label: 'Kafka', sourceIds: ['defense', 'contracts'], replicasIllustrative: true,
      explanation: {
        text: 'O Kafka faz parte da base técnica da plataforma, junto com Clojure e Datomic. No Nubank, a maior parte das interações críticas entre microsserviços acontece por mensagens Kafka: mutações vão por fluxos assíncronos, e chamadas HTTP ficam quase só para leitura.',
        sourceIds: ['defense', 'contracts'],
      },
    },
    {
      id: 'async-actions', type: 'worker', replicas: 4, label: 'Ações assíncronas', sourceIds: ['defense'], replicasIllustrative: true,
      explanation: {
        text: 'Uma decisão pode disparar ações em tempo real (bloquear a transação, mostrar um aviso no app) ou assíncronas, como abrir um caso interno de investigação.',
        sourceIds: ['defense'],
      },
    },
    {
      id: 'etl', type: 'data_warehouse', replicas: 2, label: 'ETL distribuído', sourceIds: ['defense'],
      approximation: 'O sistema de ETL distribuído é aproximado por Data Warehouse.',
      replicasIllustrative: true,
      explanation: {
        text: 'Todo evento é registrado e empurrado pelo sistema de ETL distribuído do Nubank, que agrega mais de 100 TB de logs por dia, para análise e melhoria contínua das defesas.',
        sourceIds: ['defense'],
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'flow-orchestrator', to: 'datomic', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['defense'] },
    { id: 'e2', from: 'flow-orchestrator', to: 'external-providers', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['defense'] },
    { id: 'e3', from: 'flow-orchestrator', to: 'kafka', kind: 'write', weight: 1, basis: 'inferida', sourceIds: [], note: 'A fonte só cita o Kafka como parte da base técnica; que as decisões saiam do orquestrador por ele é inferência, a partir da regra geral do Nubank de mutações assíncronas via Kafka.' },
    { id: 'e4', from: 'kafka', to: 'async-actions', kind: 'async', weight: 1, basis: 'inferida', sourceIds: [], note: 'As ações assíncronas são afirmadas; que consumam eventos do Kafka, não.' },
    { id: 'e5', from: 'async-actions', to: 'etl', kind: 'write', weight: 1, basis: 'inferida', sourceIds: [], note: 'A fonte afirma que todo evento vai para o ETL, mas não por qual caminho; o catálogo só deixa o Kafka entregar a um Worker.' },
  ],
  entryNodeIds: ['flow-orchestrator'],
  limitations: [
    'As regras e os modelos de machine learning (em Python) não são componentes do catálogo; no preset eles ficam dentro do Flow Orchestrator, e o sistema de features fica colapsado nas arestas até o Datomic e os provedores.',
    'Só no Brasil a plataforma roda em 20 shards, réplicas completas do sistema inteiro; o preset mostra uma cópia só.',
    'As arestas e3, e4 e e5 são inferidas (ver as conexões inferidas).',
    'As ações em tempo real (bloquear, avisar no app) são a resposta do orquestrador, não um componente.',
    'A parte do mesmo post apresentada pela AWS (Rekognition, Textract, SageMaker, Neptune, CleanRooms) é uma demonstração da AWS, não a arquitetura do Nubank, e fica fora.',
  ],
};

export const NETFLIX: ReferenceArchitecture = {
  id: 'netflix',
  company: 'Netflix — nuvem e Open Connect',
  summary:
    'Na Netflix, tudo o que acontece antes do play (interface, descoberta, recomendações) roda na nuvem da AWS; o que vem depois do play é entregue pelo Open Connect, a CDN própria da Netflix, com servidores dentro das redes dos provedores de internet ou ligados diretamente a elas.',
  sources: [
    { id: 'isp', title: 'How Netflix Works With ISPs Around the Globe to Deliver a Great Viewing Experience', publisher: 'Netflix', url: 'https://about.netflix.com/en/news/how-netflix-works-with-isps-around-the-globe-to-deliver-a-great-viewing-experience', accessedAt: D },
    { id: 'appliances', title: 'Open Connect Appliances', publisher: 'Netflix', url: 'https://openconnect.netflix.com/en/appliances/', accessedAt: D },
    { id: 'zuul', title: 'Zuul (README)', publisher: 'Netflix', url: 'https://github.com/Netflix/zuul', accessedAt: D },
    { id: 'evcache', title: 'EVCache (README e wiki)', publisher: 'Netflix', url: 'https://github.com/Netflix/EVCache', accessedAt: D },
    { id: 'eureka', title: 'Eureka at a glance', publisher: 'Netflix', url: 'https://github.com/Netflix/eureka/wiki/Eureka-at-a-glance', accessedAt: D },
    { id: 'priam', title: 'Priam (README)', publisher: 'Netflix', url: 'https://github.com/Netflix/Priam', accessedAt: D },
  ],
  nodes: [
    {
      id: 'zuul', type: 'api_gateway', replicas: 4, label: 'Zuul', sourceIds: ['zuul'], replicasIllustrative: true,
      explanation: {
        text: 'O Zuul é o gateway de aplicação (camada 7) da Netflix, com roteamento dinâmico, monitoramento, resiliência e segurança.',
        sourceIds: ['zuul'],
      },
    },
    {
      id: 'aws-services', type: 'app_server', replicas: 8, label: 'Serviços na AWS', sourceIds: ['isp', 'eureka'], replicasIllustrative: true,
      explanation: {
        text: 'Segundo a Netflix, essencialmente tudo antes do play acontece na AWS: a lógica da interface, a descoberta e a escolha de conteúdo, os algoritmos de recomendação e a transcodificação. Os serviços dessa camada intermediária se encontram pelo Eureka, um serviço REST de descoberta usado para balanceamento de carga e failover entre eles.',
        sourceIds: ['isp', 'eureka'],
      },
    },
    {
      id: 'evcache', type: 'cache', replicas: 3, label: 'EVCache', sourceIds: ['evcache'], replicasIllustrative: true,
      explanation: {
        text: 'O EVCache é o cache da Netflix baseado em memcached, para dados usados com frequência na infraestrutura AWS EC2. Os dados são distribuídos pelo cluster por hash consistente e podem ser replicados entre zonas de disponibilidade: as leituras vão para a zona local, as gravações para todas.',
        sourceIds: ['evcache'],
      },
    },
    {
      id: 'cassandra', type: 'nosql_kv', replicas: 3, label: 'Apache Cassandra', sourceIds: ['priam'],
      approximation: 'O Cassandra é um banco colunar; o catálogo o representa como NoSQL (KV).',
      replicasIllustrative: true,
      explanation: {
        text: 'A Netflix usa o Apache Cassandra, um banco colunar de alta disponibilidade, e mantém o Priam, ferramenta que roda ao lado dele para automatizar backup e recuperação, gerenciamento de tokens e configuração na AWS.',
        sourceIds: ['priam'],
      },
    },
    {
      id: 'open-connect', type: 'cdn', replicas: 6, label: 'Open Connect', sourceIds: ['isp', 'appliances'], replicasIllustrative: true,
      explanation: {
        text: 'O Open Connect, CDN própria criada em 2011, entrega 100% do tráfego de vídeo da Netflix. Os appliances ficam em pontos de troca de tráfego e embarcados nos provedores de internet (perto de 1.000 locais em 2016), e cerca de 90% do tráfego vai por conexões diretas com os provedores. Cada appliance informa sua saúde e carga, e isso entra nas decisões de para onde mandar cada cliente.',
        sourceIds: ['isp', 'appliances'],
      },
    },
    {
      id: 'transcoding-repo', type: 'object_storage', replicas: 2, label: 'Repositório de transcodificação', sourceIds: ['isp'],
      approximation: 'O repositório de transcodificação é aproximado por Object Storage.',
      replicasIllustrative: true,
      explanation: {
        text: 'Cada arquivo é copiado uma vez do repositório de transcodificação nos EUA para os locais de armazenamento de cada região, fora do horário de pico, e de lá replicado para os servidores Open Connect dentro dos provedores. Modelos de popularidade decidem qual arquivo fica em qual servidor.',
        sourceIds: ['isp'],
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'zuul', to: 'aws-services', kind: 'read', weight: 1, basis: 'inferida', sourceIds: [], note: 'O README do Zuul fala em roteamento dinâmico, mas não diz para quais serviços.' },
    { id: 'e2', from: 'aws-services', to: 'evcache', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['evcache'] },
    { id: 'e3', from: 'evcache', to: 'cassandra', kind: 'read', weight: 1, basis: 'inferida', sourceIds: [], note: 'O EVCache guarda dados que viriam de um banco ou de um serviço intermediário; que esse banco seja o Cassandra não é afirmado.' },
    { id: 'e4', from: 'open-connect', to: 'transcoding-repo', kind: 'read', weight: 1, basis: 'inferida', sourceIds: [], note: 'Na Netflix o conteúdo é pré-posicionado fora do pico; o engine trata esta aresta como leitura na origem quando falta o arquivo, o que não é o mesmo.' },
  ],
  entryNodeIds: ['zuul', 'open-connect'],
  limitations: [
    'O Eureka (descoberta de serviços) não existe no catálogo; aparece só na explicação dos serviços na AWS.',
    'As arestas e1, e3 e e4 são inferidas (ver as conexões inferidas).',
    'Os serviços na AWS (interface, recomendação, transcodificação) aparecem como um único App Server; o sistema de controle que manda cada cliente para um appliance também não aparece.',
    'O post sobre o Open Connect é de 2016; os READMEs são atuais. O preset não é uma foto de um único momento.',
    'O blog técnico da Netflix não abriu para a pesquisa (403); só entrou o que as páginas lidas afirmam.',
  ],
};

export const DRAFTS = [DISCORD, IFOOD, NUBANK, NETFLIX];
