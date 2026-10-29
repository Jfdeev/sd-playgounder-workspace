/**
 * Problema: Web crawler — packages/problems/src/catalog/web-crawler.ts
 *
 * M4.2, nível intermediário. Padrão (foundational-doc §2.2): fila de trabalho, politeness, dedupe em
 * escala. Conteúdo aprovado pelo autor em specs/biblioteca-problemas-m4-2/content-draft.md §6. Na
 * escala, "usuários" são sites acompanhados e "requisições" são páginas por site por dia. Entrada por
 * API Gateway (sementes) — o Cliente do canvas não liga direto num Scheduler (spec, Clarifications
 * 2026-10-28). O "aha": Worker com 1 réplica (200 rps) satura; sem Scheduler, falha `politeness`.
 */

import { PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE } from '@sdp/knowledge';
import type { Problem } from '../types.js';
import { connects, latencyWithin, NO_SATURATED_NODE, NO_SPOF, usesComponent } from '../rubric-criteria.js';

const LATENCY_BUDGET_MS = 1_000;

const RUBRIC: Problem['rubric'] = [
  latencyWithin(LATENCY_BUDGET_MS, 'Cada página é processada em até 1s (p99)'),
  NO_SATURATED_NODE,
  usesComponent('url-frontier', 'Fronteira de URLs numa fila', 'queue'),
  usesComponent('politeness', 'Politeness: um Scheduler controla o ritmo por site', 'scheduler'),
  connects('dedupe', 'Dedupe: o Worker consulta um NoSQL ou Cache de URLs já vistas', ['worker'], ['nosql_kv', 'cache']),
  NO_SPOF,
];

const HINTS: Problem['hints'] = [
  {
    id: 'what-is-frontier',
    prompt: 'O que é a "fronteira"?',
    body:
      'É a lista de URLs a visitar. Ela cresce a cada página (cada página traz dezenas de links) e precisa ' +
      'ser consumida por vários Workers ao mesmo tempo: é uma fila de trabalho.',
  },
  {
    id: 'politeness',
    prompt: 'Como não derrubar um site?',
    body:
      'Se 50 Workers pegarem 50 URLs do mesmo site, o site recebe 50 requisições de uma vez. O Scheduler ' +
      'decide quando cada URL pode sair, respeitando um intervalo por domínio — o engine não modela o ' +
      'intervalo, mas a rubrica cobra que alguém tenha essa responsabilidade.',
  },
  {
    id: 'dedupe-at-scale',
    prompt: 'Como saber se uma URL já foi vista, com bilhões delas?',
    body:
      'Um conjunto de URLs vistas num NoSQL (ou um filtro de Bloom em Cache, que erra só para o lado de ' +
      '"já vi"). O Worker consulta antes de baixar.',
  },
  {
    id: 'fetch-gateway',
    prompt: 'Onde ficam robots.txt, timeouts e o intervalo por site?',
    body:
      'Num único ponto que encapsula o acesso aos sites externos, em vez de espalhado pelo código. Martin ' +
      'Fowler chama esse padrão de Gateway: um objeto que encapsula o acesso a um sistema externo.',
    source: PATTERNS_OF_ENTERPRISE_APPLICATION_ARCHITECTURE,
    libraryEntryId: 'gateway',
  },
];

const REFERENCE_SOLUTION: Problem['referenceSolution'] = {
  design: {
    nodes: [
      { id: 'api-gateway-1', type: 'api_gateway', replicas: 2 },
      { id: 'scheduler-1', type: 'scheduler', replicas: 6 },
      { id: 'queue-1', type: 'queue', replicas: 2 },
      { id: 'worker-1', type: 'worker', replicas: 6 },
      { id: 'nosql-1', type: 'nosql_kv', replicas: 2 },
      { id: 'object-storage-1', type: 'object_storage', replicas: 2 },
    ],
    edges: [
      { id: 'e1', from: 'api-gateway-1', to: 'scheduler-1', kind: 'write', weight: 1 },
      { id: 'e2', from: 'scheduler-1', to: 'queue-1', kind: 'async', weight: 1 },
      { id: 'e3', from: 'queue-1', to: 'worker-1', kind: 'async', weight: 1 },
      { id: 'e4', from: 'worker-1', to: 'nosql-1', kind: 'read', weight: 1 },
      { id: 'e5', from: 'worker-1', to: 'object-storage-1', kind: 'write', weight: 1 },
    ],
    entryNodeIds: ['api-gateway-1'],
  },
  reasoning:
    'As sementes entram pelo API Gateway. O Scheduler solta as URLs no ritmo permitido por site para a ' +
    'fila; os Workers baixam, conferem no NoSQL se a URL é nova e guardam a página no Object Storage. ' +
    '~926 rps em 6 réplicas de Scheduler e de Worker (1.200 rps cada grupo).',
};

export const WEB_CRAWLER: Problem = {
  id: 'web-crawler',
  title: 'Web crawler',
  level: 'intermediate',

  statement:
    'Projete um robô que visita a web continuamente para um buscador, sem visitar a mesma página duas ' +
    'vezes e sem derrubar os sites que visita.',

  functionalRequirements: [
    'A partir de uma lista de sites, o crawler baixa páginas e descobre novos links.',
    'Cada URL é baixada uma vez por ciclo (sem duplicata).',
    'Cada site recebe no máximo uma requisição por segundo (politeness).',
    'O conteúdo baixado fica guardado para a indexação.',
  ],

  nonFunctionalRequirements: [
    'Ritmo sustentado: ~460 páginas/s, com picos de 2×. (Na escala, "usuários" são sites acompanhados e "requisições" são páginas por site por dia.)',
    'Uma réplica caindo não pode parar o crawler.',
    'Não há usuário esperando: o orçamento de latência é largo (1s no p99 por página processada).',
  ],

  scale: {
    dau: 2_000_000,
    requestsPerUserPerDay: 20,
    readWriteRatio: 0.5,
    avgPayloadBytes: 100_000,
    peakMultiplier: 2,
  },

  latencyBudgetMs: LATENCY_BUDGET_MS,
  rubric: RUBRIC,
  hints: HINTS,
  referenceSolution: REFERENCE_SOLUTION,
};
