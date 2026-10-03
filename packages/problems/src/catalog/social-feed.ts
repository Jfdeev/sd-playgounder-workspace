/**
 * Problema: Social Feed — packages/problems/src/catalog/social-feed.ts
 *
 * Segundo desafio do catálogo (o primeiro além do Encurtador de URL) — mesma anatomia (enunciado +
 * FR + NFR + escala + rubrica à mostra + dicas). Padrão que este problema ensina: banco NoSQL para
 * leitura de alto volume + cache na frente dele, mesmo raciocínio do Encurtador de URL mas com o
 * "aha" de réplica no armazenamento do feed (NoSQL), não no App Server — mostra que a mesma lição
 * de capacidade/réplicas se aplica a qualquer componente no caminho, não só compute.
 *
 * Escala escolhida deliberadamente: com 1 réplica de NoSQL (8.000 rps de capacidade) o armazenamento
 * do feed satura (~13.889 rps de pico); com 4 réplicas (32.000 rps) o design escoa a carga
 * confortavelmente — mesma lógica de "aha" pedagógico do Encurtador de URL, provada em
 * `apps/web/test/social-feed-scenario.spec.ts`.
 */

import { CLEAN_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';

const RUBRIC: Problem['rubric'] = [
  {
    id: 'latency-p99',
    label: 'Feed carrega em até 200ms (p99)',
    evaluate: (result) => result.path.latency.p99 <= 200,
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
    id: 'uses-nosql-store',
    label: 'Usa um banco NoSQL para o feed',
    evaluate: (_result, design) => design.nodes.some((node) => node.type === 'nosql_kv'),
  },
  {
    id: 'no-spof',
    label: 'Sem ponto único de falha no caminho crítico',
    evaluate: (result) => !result.violations.some((v) => v.type === 'spof'),
  },
];

const HINTS: Problem['hints'] = [
  {
    id: 'why-nosql-not-sql',
    prompt: 'Por que NoSQL em vez de um banco relacional pra guardar o feed?',
    body:
      'O feed é lido com um padrão simples e repetitivo (buscar os N posts mais recentes de quem eu ' +
      'sigo) — não precisa de JOIN nem consulta relacional complexa, mas precisa escalar ' +
      'horizontalmente pra um volume gigante de leitura. Um banco chave-valor otimizado pra esse ' +
      'padrão (NoSQL) escala melhor pra esse caso que um relacional, que é mais forte em consulta ' +
      'complexa do que em throughput bruto.',
  },
  {
    id: 'why-cache-here-too',
    prompt: 'O feed muda toda hora — cache ainda ajuda?',
    body:
      'Sim: mesmo o feed de alguém mudando com frequência, a MESMA versão do feed é lida várias ' +
      'vezes entre uma atualização e outra (o usuário reabre o app, rola pra cima, etc.) — um TTL ' +
      'curto no cache (segundos, não horas) já reduz bastante a carga repetida no NoSQL sem servir ' +
      'dado muito desatualizado.',
  },
  {
    id: 'why-replicas-on-store',
    prompt: 'Por que aumentar réplicas do NoSQL resolve a saturação, e não do App Server?',
    body:
      'O gargalo é sempre o componente com menos capacidade sobrando pra carga que chega nele — ' +
      'não é sempre o App Server. Olhe a utilização (ρ) de cada nó no painel de resultado: o nó ' +
      'com ρ mais alto (mais perto de 1, ou acima) é quem precisa de mais réplicas, seja ele ' +
      'compute, cache ou banco.',
  },
  {
    id: 'responsibility-coupling',
    prompt: 'O Cache e o NoSQL Store guardam o mesmo feed — por que não é duplicação de responsabilidade?',
    body:
      'Clean Architecture (Robert C. Martin) separa política de alto nível (a regra de negócio: ' +
      '"qual conteúdo aparece no feed") de detalhe de baixo nível (o mecanismo: "onde e como esse ' +
      'dado fica armazenado rápido o suficiente"). O NoSQL Store é a fonte da verdade ' +
      '(persistência durável); o Cache é um mecanismo de acesso rápido a uma cópia dela. ' +
      'Concentrar as duas coisas — fonte da verdade e acesso rápido — num componente só seria o ' +
      'tipo de acoplamento que a topologia em nós distintos evita.',
    source: CLEAN_ARCHITECTURE,
    libraryEntryId: 'srp',
  },
];

// M2, US3. Mesmo design já provado por `apps/web/test/social-feed-scenario.spec.ts` ("rubrica
// completa resolve o desafio na escala real") — 30 réplicas de App Server (15.000 rps) cobrem o
// pico ~13.889 rps com folga; o "aha" pedagógico deste problema é a réplica no armazenamento (4
// réplicas de NoSQL, 32.000 rps), não no App Server, mostrado explicitamente no cabeçalho deste
// arquivo.
const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'app-server-1', type: 'app_server', replicas: 30 },
      { id: 'cache-1', type: 'cache', replicas: 2, cacheHitRate: 0.8 },
      { id: 'nosql-1', type: 'nosql_kv', replicas: 4 },
    ],
    edges: [
      { id: 'e1', from: 'app-server-1', to: 'cache-1', kind: 'read', weight: 1 },
      { id: 'e2', from: 'cache-1', to: 'nosql-1', kind: 'read', weight: 1 },
    ],
    entryNodeIds: ['app-server-1'],
  },
  reasoning:
    'O pico deste problema (~13.889 rps) é ~8x o do Encurtador de URL, então precisa de ' +
    'capacidade de cômputo proporcionalmente maior na entrada (30 réplicas de App Server). O ' +
    'gargalo real não é o App Server — é o armazenamento do feed: com poucas réplicas de NoSQL, ' +
    'ele satura antes de qualquer outro nó (ver os testes de cenário deste problema). 4 réplicas ' +
    'de NoSQL (32.000 rps) resolvem isso; o Cache na frente reduz a carga repetida de reler o ' +
    'mesmo feed entre uma atualização e outra.',
};

export const SOCIAL_FEED: Problem = {
  id: 'social-feed',
  title: 'Social Feed',

  statement:
    'Projete um sistema onde um usuário publica posts curtos e seus seguidores veem esses posts, ' +
    'em ordem cronológica, num feed pessoal.',

  functionalRequirements: [
    'Um usuário publica um post; o post passa a aparecer no feed de quem o segue.',
    'Um usuário visualiza seu feed, com os posts mais recentes de quem ele segue no topo.',
    'Um post removido pelo autor deixa de aparecer no feed de todos os seguidores.',
  ],

  nonFunctionalRequirements: [
    'O carregamento do feed responde em até 200ms no p99 — é a ação mais frequente do produto.',
    'Consistência eventual entre publicar um post e ele aparecer no feed dos seguidores é aceitável — não precisa ser instantâneo pra todos ao mesmo tempo.',
    'Disponibilidade de 99,9% para a leitura do feed.',
    'Budget de infraestrutura é uma restrição real — volume de leitura é muito maior que o de escrita, então o custo por leitura precisa ser baixo.',
  ],

  scale: {
    dau: 20_000_000,
    requestsPerUserPerDay: 20,
    readWriteRatio: 0.95,
    avgPayloadBytes: 2_000,
    peakMultiplier: 3,
  },

  // Mesmo número do critério de rubrica 'latency-p99' abaixo (result.path.latency.p99 <= 200).
  latencyBudgetMs: 200,

  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
