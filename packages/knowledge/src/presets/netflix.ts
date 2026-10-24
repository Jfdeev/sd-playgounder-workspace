import type { ReferenceArchitecture } from '../reference-architectures.js';

/**
 * Preset netflix — conteúdo aprovado pelo autor em 2026-10-08
 * (specs/arquiteturas-referencia/content-draft-netflix.md). Toda afirmação saiu das fontes abaixo,
 * lidas em 2026-10-07 (research.md §1). Réplicas são ilustrativas, salvo `replicasIllustrative: false`
 * com a fonte do número.
 */
export const NETFLIX_PRESET: ReferenceArchitecture = {
  id: 'netflix',
  company: 'Netflix — nuvem e Open Connect',
  summary:
    'Na Netflix, tudo o que acontece antes do play (interface, descoberta, recomendações) roda na nuvem da AWS; o que vem depois do play é entregue pelo Open Connect, a CDN própria da Netflix, com servidores dentro das redes dos provedores de internet ou ligados diretamente a elas.',
  sources: [
    { id: 'isp', title: 'How Netflix Works With ISPs Around the Globe to Deliver a Great Viewing Experience', publisher: 'Netflix', url: 'https://about.netflix.com/en/news/how-netflix-works-with-isps-around-the-globe-to-deliver-a-great-viewing-experience', accessedAt: '2026-10-07' },
    { id: 'appliances', title: 'Open Connect Appliances', publisher: 'Netflix', url: 'https://openconnect.netflix.com/en/appliances/', accessedAt: '2026-10-07' },
    { id: 'zuul', title: 'Zuul (README)', publisher: 'Netflix', url: 'https://github.com/Netflix/zuul', accessedAt: '2026-10-07' },
    { id: 'evcache', title: 'EVCache (README e wiki)', publisher: 'Netflix', url: 'https://github.com/Netflix/EVCache', accessedAt: '2026-10-07' },
    { id: 'eureka', title: 'Eureka at a glance', publisher: 'Netflix', url: 'https://github.com/Netflix/eureka/wiki/Eureka-at-a-glance', accessedAt: '2026-10-07' },
    { id: 'priam', title: 'Priam (README)', publisher: 'Netflix', url: 'https://github.com/Netflix/Priam', accessedAt: '2026-10-07' },
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
