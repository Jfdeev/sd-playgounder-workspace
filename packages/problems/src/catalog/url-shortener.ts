/**
 * Problema: Encurtador de URL — packages/problems/src/catalog/url-shortener.ts
 *
 * Único problema completo de M1 (docs/product-context.md §10). Conteúdo com base em
 * docs/foundational-doc.md §2.1 (partes 1/3/4/5 da anatomia — as demais partes, fase de
 * clarificação/rubrica/solução de referência, são M2) e §2.2 (padrão que este problema ensina:
 * "Hashing, cache read-heavy, geração de ID").
 *
 * Escala escolhida deliberadamente para tornar a decisão de réplicas do app server visível: com
 * 1 réplica o app server satura (500 rps de capacidade < ~1737 rps de pico); com 4 réplicas
 * (2000 rps) o design passa a escoar a carga — o "aha" pedagógico de capacidade e redundância.
 */

import type { Problem } from '../types.js';

const RUBRIC: Problem['rubric'] = [
  {
    id: 'latency-p99',
    label: 'Redirecionamento responde em até 100ms (p99)',
    evaluate: (result) => result.path.latency.p99 <= 100,
  },
  {
    id: 'no-saturated-node',
    label: 'Nenhum componente saturado',
    evaluate: (result) => Object.values(result.nodes).every((node) => node.status !== 'saturated'),
  },
  {
    id: 'uses-cache',
    label: 'Usa uma camada de cache',
    evaluate: (_result, design) => design.nodes.some((node) => node.type === 'cache'),
  },
  {
    id: 'has-database',
    label: 'Tem um banco de dados',
    evaluate: (_result, design) =>
      design.nodes.some((node) => node.type === 'sql_primary' || node.type === 'sql_replica' || node.type === 'nosql_kv'),
  },
  {
    id: 'no-spof',
    label: 'Sem ponto único de falha no caminho crítico',
    evaluate: (result) => !result.violations.some((v) => v.type === 'spof'),
  },
];

const HINTS: Problem['hints'] = [
  {
    id: 'why-high-latency',
    prompt: 'Por que meu p99 de latência está tão alto?',
    body:
      'Latência alta geralmente é fila: um componente com poucas réplicas para a carga que chega ' +
      'nele passa a enfileirar requisição (modelo M/M/1 — quanto mais perto ρ chega de 1, mais a ' +
      'fila cresce e a latência dispara, não de forma linear). Olhe qual nó está com utilização ' +
      '(ρ) mais alta no painel de resultado — aumentar réplicas ali costuma resolver.',
  },
  {
    id: 'how-to-reduce-db-load',
    prompt: 'Como eu reduzo a carga que chega no banco?',
    body:
      'Um Cache na frente do banco retém uma fração da carga (a taxa de acerto configurada no ' +
      'painel) — só o que não está em cache (o "miss") continua até o banco. Redirecionamento de ' +
      'URL é um padrão de leitura repetitiva (o mesmo código curto acessado muitas vezes), então ' +
      'uma taxa de acerto alta reduz bastante a carga no banco por trás.',
  },
  {
    id: 'what-is-spof',
    prompt: 'O que é "ponto único de falha" e por que isso é uma violação?',
    body:
      'Um nó com 1 réplica é um ponto único de falha (SPOF): se essa réplica cair, aquele trecho ' +
      'do sistema para inteiro. Como o requisito de disponibilidade deste problema é 99,9%, todo ' +
      'nó no caminho crítico precisa de pelo menos 2 réplicas para não ser um SPOF.',
  },
];

// M2, US3. Pico ~1736 rps (10M DAU × 5 req/dia / 86400 × 3). 8 réplicas de App Server (4000 rps)
// dão margem confortável (ρ≈0,43) acima do mínimo de 4 réplicas já documentado no cabeçalho deste
// arquivo — referência não precisa ser o design mais barato possível, só um exemplo robusto e
// correto. Cache com hit rate alto (redirecionamento é leitura repetitiva do mesmo código) reduz
// a carga que chega no NoSQL. Todo nó com 2+ réplicas — nenhum SPOF no caminho.
const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'app-server-1', type: 'app_server', replicas: 8 },
      { id: 'cache-1', type: 'cache', replicas: 2, cacheHitRate: 0.85 },
      { id: 'nosql-1', type: 'nosql_kv', replicas: 2 },
    ],
    edges: [
      { id: 'e1', from: 'app-server-1', to: 'cache-1', kind: 'read', weight: 1 },
      { id: 'e2', from: 'cache-1', to: 'nosql-1', kind: 'read', weight: 1 },
    ],
    entryNodeIds: ['app-server-1'],
  },
  reasoning:
    'O redirecionamento é o caminho crítico (leitura, <100ms p99) — 8 réplicas de App Server ' +
    '(4.000 rps de capacidade) escoam o pico de ~1.736 rps com folga, evitando fila e latência ' +
    'alta. Um Cache com taxa de acerto de 85% na frente do NoSQL absorve a maior parte da carga: ' +
    'redirecionamento é um padrão de leitura muito repetitivo (o mesmo código curto acessado ' +
    'muitas vezes), então a maioria das requisições nunca chega a bater no banco. 2 réplicas em ' +
    'todo componente do caminho — nenhum ponto único de falha.',
};

export const URL_SHORTENER: Problem = {
  id: 'url-shortener',
  title: 'Encurtador de URL',

  statement:
    'Projete um sistema que recebe uma URL longa e devolve uma URL curta e única; quem acessa a ' +
    'URL curta é redirecionado para a URL longa original.',

  functionalRequirements: [
    'Dada uma URL longa, o sistema gera um código curto único e devolve a URL encurtada correspondente.',
    'Dado um código curto, o sistema redireciona quem acessa para a URL longa original correspondente.',
    'Um código curto sempre aponta para a mesma URL longa, mesmo em acessos repetidos e distantes no tempo.',
    'Um código curto que nunca foi gerado, ou que corresponde a um link removido, retorna um erro claro em vez de redirecionar para qualquer lugar.',
  ],

  nonFunctionalRequirements: [
    'O redirecionamento (leitura) responde em menos de 100ms no p99 — é o caminho crítico do produto, a criação de um link tolera mais latência.',
    'Disponibilidade de 99,9% para o redirecionamento — um link já compartilhado por terceiros continua sendo acessado independente do sistema estar sob manutenção ou não.',
    'Consistência eventual entre a criação de um link e sua disponibilidade para redirecionamento é aceitável — não é necessário forte.',
    'Budget de infraestrutura é uma restrição real, não uma sugestão — o produto tem alto volume de leitura e baixo valor por requisição individual, então o custo por requisição precisa ser baixo.',
  ],

  scale: {
    dau: 10_000_000,
    requestsPerUserPerDay: 5,
    readWriteRatio: 0.99,
    avgPayloadBytes: 500,
    peakMultiplier: 3,
  },

  // Mesmo número do critério de rubrica 'latency-p99' abaixo (result.path.latency.p99 <= 100).
  latencyBudgetMs: 100,

  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
