import type { ReferenceArchitecture } from '../reference-architectures.js';

/**
 * Preset do GitHub — conteúdo aprovado pelo autor em 2026-10-07 (rótulos e redação da limitação 3
 * aprovados em 2026-10-08)
 * (specs/arquiteturas-referencia/content-draft.md). Toda afirmação saiu de uma das três fontes
 * abaixo, lidas em 2026-10-03 (research.md §1). Réplicas são ilustrativas: nenhuma fonte publica
 * esses números para os componentes modelados.
 */
export const GITHUB_PRESET: ReferenceArchitecture = {
  id: 'github',
  company: 'GitHub',
  summary:
    'O GitHub nasceu como uma aplicação Ruby on Rails com um único banco MySQL e cresceu sem abandonar o monolito: particionou o banco, passou a guardar cada repositório Git em várias réplicas e trocou um job gigante de processamento de push por eventos.',
  sources: [
    {
      id: 'partition',
      title: "Partitioning GitHub's relational databases to handle scale",
      publisher: 'GitHub',
      url: 'https://github.blog/engineering/infrastructure/partitioning-githubs-relational-databases-scale/',
      accessedAt: '2026-10-03',
    },
    {
      id: 'spokes',
      title: 'Stretching Spokes',
      publisher: 'GitHub',
      url: 'https://github.blog/engineering/infrastructure/stretching-spokes/',
      accessedAt: '2026-10-03',
    },
    {
      id: 'push',
      title: 'How we improved push processing on GitHub',
      publisher: 'GitHub',
      url: 'https://github.blog/engineering/architecture-optimization/how-we-improved-push-processing-on-github/',
      accessedAt: '2026-10-03',
    },
  ],
  nodes: [
    {
      id: 'rails-monolith',
      type: 'app_server',
      replicas: 6,
      label: 'Monolito Rails',
      sourceIds: ['partition', 'push'],
      replicasIllustrative: true,
      explanation: {
        text: 'O GitHub começou (segundo o post de 2021, há mais de 10 anos) como uma aplicação Ruby on Rails e o monolito continua no centro: é ele que é notificado de cada push e dispara o processamento. Só no push, mais de 60 pedaços de lógica, pertencentes a 20 serviços, rodam em resposta direta a ele.',
        sourceIds: ['partition', 'push'],
      },
    },
    {
      id: 'mysql-primary',
      type: 'sql_primary',
      replicas: 2,
      label: 'MySQL principal (mysql1)',
      sourceIds: ['partition'],
      replicasIllustrative: true,
      explanation: {
        text: 'Os dados dos recursos centrais (perfis, repositórios, issues e pull requests) ficavam num cluster principal, o mysql1. Com o crescimento, foi preciso escalar sempre para máquinas maiores, e um incidente nesse cluster afetava todas as funcionalidades que guardavam dados nele — o que levou ao plano, de 2019, de particionar os bancos relacionais.',
        sourceIds: ['partition'],
      },
    },
    {
      id: 'mysql-read-replicas',
      type: 'sql_replica',
      replicas: 4,
      label: 'Réplicas de leitura do MySQL',
      sourceIds: ['partition'],
      replicasIllustrative: true,
      explanation: {
        text: 'Foram adicionadas réplicas de leitura para espalhar a carga de leitura por várias máquinas, aliviando o primário.',
        sourceIds: ['partition'],
      },
    },
    {
      id: 'git-fileservers',
      type: 'object_storage',
      replicas: 3,
      label: 'Fileservers Git (Spokes)',
      sourceIds: ['spokes'],
      approximation: 'Os fileservers do Git são aproximados por Object Storage, que não é a mesma coisa.',
      replicasIllustrative: true,
      explanation: {
        text: 'O Spokes guarda várias réplicas de cada repositório Git em fileservers e as mantém sincronizadas; todo push passa por um proxy que replica para vários deles, e a replicação exige ao menos um quórum de réplicas. Espalhar as réplicas aumenta a chance de algumas sobreviverem a um desastre que afete uma grande região.',
        sourceIds: ['spokes'],
      },
    },
    {
      id: 'push-events',
      type: 'kafka',
      replicas: 3,
      label: 'Eventos de push (Kafka)',
      sourceIds: ['push'],
      replicasIllustrative: true,
      explanation: {
        text: 'Antes, o monolito enfileirava um job enorme (RepositoryPushJob) com toda a lógica de push, numa sequência longa e frágil. Agora ele publica um evento por push num tópico Kafka.',
        sourceIds: ['push'],
      },
    },
    {
      id: 'push-workers',
      type: 'worker',
      replicas: 4,
      label: 'Tarefas de push',
      sourceIds: ['push'],
      replicasIllustrative: true,
      explanation: {
        text: 'As tarefas de push, agrupadas por serviço dono, passaram a rodar em processos paralelos e isolados. Assim cada time evolui a sua parte sem afetar os outros, nenhuma tarefa espera as demais, e o push é processado com menor latência.',
        sourceIds: ['push'],
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'rails-monolith', to: 'mysql-primary', kind: 'write', weight: 1, basis: 'afirmada', sourceIds: ['partition'] },
    { id: 'e2', from: 'rails-monolith', to: 'mysql-read-replicas', kind: 'read', weight: 1, basis: 'afirmada', sourceIds: ['partition'] },
    {
      id: 'e3',
      from: 'mysql-primary',
      to: 'mysql-read-replicas',
      kind: 'replication',
      weight: 1,
      basis: 'inferida',
      sourceIds: [],
      note: 'Consequência do papel de "réplica de leitura"; a fonte não descreve o mecanismo.',
    },
    {
      id: 'e4',
      from: 'rails-monolith',
      to: 'git-fileservers',
      kind: 'write',
      weight: 1,
      basis: 'inferida',
      sourceIds: [],
      note: 'A fonte fala de um proxy entre o push e os fileservers; o proxy não existe no catálogo, então a aresta o colapsa.',
    },
    { id: 'e5', from: 'rails-monolith', to: 'push-events', kind: 'write', weight: 1, basis: 'afirmada', sourceIds: ['push'] },
    {
      id: 'e6',
      from: 'push-events',
      to: 'push-workers',
      kind: 'async',
      weight: 1,
      basis: 'inferida',
      sourceIds: [],
      note: 'A fonte diz que as tarefas rodam em processos paralelos por serviço dono; que sejam consumidores do tópico é a consequência natural.',
    },
  ],
  entryNodeIds: ['rails-monolith'],
  limitations: [
    'ProxySQL e o Vitess (sharding vertical, partições virtuais, schema domains) não existem no catálogo — o banco aparece como um primário e réplicas de leitura, sem o particionamento.',
    'O proxy do Spokes, o three-phase commit e o quórum de réplicas não são representados; os fileservers do Git são aproximados por Object Storage, que não é a mesma coisa.',
    'As arestas e3, e4 e e6 são inferidas (ver as conexões inferidas).',
    'Não há balanceador, borda nem cache no preset porque as fontes lidas não os afirmam — não que o GitHub não os tenha.',
    'O que as tarefas de push gravam depois de consumir os eventos não é afirmado pelas fontes e não aparece.',
  ],
};
